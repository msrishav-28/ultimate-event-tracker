// Performance monitoring utility
class PerformanceMonitor {
  constructor() {
    this.measurements = new Map();
    this.init();
  }

  init() {
    // Monitor page load performance
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          this.measurePageLoad();
        }, 0);
      });
    }
  }

  // Measure page load performance
  measurePageLoad() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.fetchStart;
      const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
      const firstPaint = performance.getEntriesByName('first-paint')[0];
      const firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0];

      const metrics = {
        loadTime,
        domContentLoaded,
        firstPaint: firstPaint ? firstPaint.startTime : null,
        firstContentfulPaint: firstContentfulPaint ? firstContentfulPaint.startTime : null,
        timestamp: Date.now()
      };

      this.logMetric('page_load', metrics);

      // Check against targets from plan.md
      if (loadTime > 1500) {
        console.warn(`⚠️ Page load time (${loadTime.toFixed(0)}ms) exceeds target of 1500ms`);
      }
    }
  }

  // Measure API call performance
  measureApiCall(endpoint: string, startTime: number, endTime: number, success: boolean) {
    const duration = endTime - startTime;
    const metric = {
      endpoint,
      duration,
      success,
      timestamp: Date.now()
    };

    this.logMetric('api_call', metric);

    // Log slow API calls
    if (duration > 1000) {
      console.warn(`🐌 Slow API call: ${endpoint} took ${duration.toFixed(0)}ms`);
    }
  }

  // Measure search performance
  measureSearch(query: string, resultCount: number, duration: number) {
    const metric = {
      query,
      resultCount,
      duration,
      timestamp: Date.now()
    };

    this.logMetric('search', metric);

    // Check against target from plan.md (< 200ms)
    if (duration > 200) {
      console.warn(`⚠️ Search performance (${duration.toFixed(0)}ms) exceeds target of 200ms`);
    }
  }

  // Measure user interactions
  measureInteraction(action: string, duration?: number) {
    const metric = {
      action,
      duration,
      timestamp: Date.now()
    };

    this.logMetric('interaction', metric);
  }

  // Generic metric logging
  logMetric(type: string, data: any) {
    const metricData = {
      type,
      data,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      sessionId: this.getSessionId()
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 [${type}]`, data);
    }

    // Send to analytics service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(metricData);
    }

    // Store locally for debugging
    this.measurements.set(`${type}_${Date.now()}`, metricData);
  }

  // Send metrics to analytics service
  async sendToAnalytics(data: any) {
    try {
      // In production, send to your analytics service
      // await fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data)
      // });
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }

  // Get or create session ID
  getSessionId() {
    if (typeof window === 'undefined') return 'server';

    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  // Get performance summary
  getSummary() {
    return {
      measurements: Array.from(this.measurements.entries()),
      totalMeasurements: this.measurements.size
    };
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  return {
    measureApiCall: performanceMonitor.measureApiCall.bind(performanceMonitor),
    measureSearch: performanceMonitor.measureSearch.bind(performanceMonitor),
    measureInteraction: performanceMonitor.measureInteraction.bind(performanceMonitor),
    getSummary: performanceMonitor.getSummary.bind(performanceMonitor)
  };
}
