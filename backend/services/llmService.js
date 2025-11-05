const Anthropic = require('@anthropic-ai/sdk');

class LLMService {
  constructor() {
    this.claude = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    this.useClaude = !!process.env.CLAUDE_API_KEY;
    this.useDeepSeek = !!process.env.DEEPSEEK_API_KEY;
  }

  // Generic LLM completion method
  async complete(prompt, options = {}) {
    const {
      model = 'claude-4-5-sonnet-20241022',
      maxTokens = 1000,
      temperature = 0.7,
      systemPrompt = null
    } = options;

    if (this.useClaude) {
      try {
        const messages = [];
        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });

        const response = await this.claude.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          messages
        });

        return response.content[0].text;
      } catch (error) {
        console.error('Claude API error:', error);
        return this.fallbackResponse(prompt);
      }
    }

    // Fallback to DeepSeek or rule-based
    if (this.useDeepSeek) {
      return this.callDeepSeek(prompt, options);
    }

    return this.fallbackResponse(prompt);
  }

  // DeepSeek API integration (future use)
  async callDeepSeek(prompt, options) {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.deepseekApiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('DeepSeek API error:', error);
      return this.fallbackResponse(prompt);
    }
  }

  // Fallback responses when LLMs are unavailable
  fallbackResponse(prompt) {
    // Basic rule-based responses for common use cases
    if (prompt.includes('checklist') || prompt.includes('prepare')) {
      return 'Focus on understanding core concepts, practice problems, and review key topics.';
    }
    if (prompt.includes('recommend') || prompt.includes('suggest')) {
      return 'Consider events that match your interests and schedule.';
    }
    return 'I\'m currently operating in offline mode. Please try again later.';
  }

  // Enhanced prep checklist generation
  async generateEnhancedChecklist(event, user, checklistData) {
    const prompt = `Generate a personalized preparation checklist for a ${event.category} event titled "${event.title}".
    Event description: ${event.description || 'No description provided'}
    User's experience level: ${this.assessUserLevel(user)}
    Days until event: ${this.calculateDaysUntil(event.dateTime)}

    Current basic checklist: ${JSON.stringify(checklistData.items)}

    Enhance this checklist with:
    1. More specific, actionable steps
    2. Time estimates for each activity
    3. Learning resources or study materials
    4. Common pitfalls to avoid
    5. Success metrics to track progress

    Return as JSON with enhanced items.`;

    try {
      const response = await this.complete(prompt, {
        model: 'claude-4-5-sonnet-20241022',
        maxTokens: 2000,
        temperature: 0.3,
        systemPrompt: 'You are an expert educational consultant helping students prepare for academic and professional events. Provide detailed, actionable advice.'
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('LLM checklist enhancement failed:', error);
      return checklistData; // Return original
    }
  }

  // Smart event recommendations with LLM
  async generatePersonalizedRecommendations(user, userEvents, availableEvents) {
    const userHistory = userEvents.slice(0, 10).map(e => `${e.title} (${e.category})`).join(', ');
    const available = availableEvents.slice(0, 20).map(e => `${e.title} (${e.category})`).join(', ');

    const prompt = `Based on this user's event history: ${userHistory}

    And these available upcoming events: ${available}

    User's profile: ${user.profile?.name || 'Student'}, major: ${user.profile?.major || 'Not specified'}, year: ${user.profile?.year || 'Not specified'}

    Recommend the top 5 most relevant events for this user. Consider:
    1. Relevance to their field of study
    2. Career progression opportunities
    3. Skill development alignment
    4. Interest in competitive vs. learning events
    5. Balance of difficulty levels

    Return as JSON array with event titles and reasoning.`;

    try {
      const response = await this.complete(prompt, {
        model: 'claude-4-5-haiku-20241022',
        maxTokens: 1500,
        temperature: 0.4,
        systemPrompt: 'You are a career counselor and academic advisor specializing in student development and event recommendations.'
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('LLM recommendation failed:', error);
      return this.fallbackRecommendations(availableEvents);
    }
  }

  // Enhanced email content extraction
  async extractEventFromEmail(emailContent) {
    const prompt = `Extract event information from this email content. Look for:
    - Event title/name
    - Date and time
    - Location/venue
    - Description
    - Registration details
    - Contact information
    - Any special requirements

    Email content:
    ${emailContent}

    Return as JSON with extracted fields. If information is not available, use null.`;

    try {
      const response = await this.complete(prompt, {
        model: 'claude-4-5-haiku-20241022',
        maxTokens: 800,
        temperature: 0.1,
        systemPrompt: 'You are an expert at extracting structured event information from unstructured email text.'
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('LLM email extraction failed:', error);
      return null;
    }
  }

  // Generate personalized email content
  async generatePersonalizedEmail(user, events, type = 'digest') {
    const eventList = events.map(e => `${e.title} (${new Date(e.dateTime).toDateString()})`).join(', ');

    const prompts = {
      digest: `Write a personalized weekly digest email for ${user.profile?.name || 'Student'}.
      Upcoming events: ${eventList}
      Include: personalized greeting, event highlights, study tips, and encouragement.`,
      reminder: `Write a personalized reminder email for ${user.profile?.name || 'Student'}.
      Next event: ${eventList}
      Make it motivating and include last-minute prep tips.`,
      recommendation: `Write a personalized recommendation email suggesting new events for ${user.profile?.name || 'Student'}.
      Suggested events: ${eventList}
      Explain why these events would be valuable for them.`
    };

    try {
      const response = await this.complete(prompts[type], {
        model: 'claude-4-5-sonnet-20241022',
        maxTokens: 1200,
        temperature: 0.7,
        systemPrompt: 'You are a friendly, encouraging academic advisor writing personalized emails to students.'
      });

      return response;
    } catch (error) {
      console.error('LLM email generation failed:', error);
      return this.fallbackEmail(user, events, type);
    }
  }

  // Smart conflict resolution
  async resolveScheduleConflict(user, conflictingEvents) {
    const events = conflictingEvents.map(e => `${e.title} (${e.category}) at ${new Date(e.dateTime).toLocaleString()}`).join(' vs ');

    const prompt = `A student has these conflicting events: ${events}

    Help them decide which event to prioritize and suggest alternatives. Consider:
    1. Event importance and deadlines
    2. Preparation time needed
    3. Rescheduling options
    4. Learning opportunities

    Provide clear recommendations and alternatives.`;

    try {
      const response = await this.complete(prompt, {
        model: 'claude-4-5-haiku-20241022',
        maxTokens: 1000,
        temperature: 0.3,
        systemPrompt: 'You are an academic advisor helping students manage their time and priorities effectively.'
      });

      return response;
    } catch (error) {
      console.error('LLM conflict resolution failed:', error);
      return 'Consider your priorities and preparation time. You may need to choose one event or find alternatives.';
    }
  }

  // Helper methods
  assessUserLevel(user) {
    const eventsAttended = user.achievements?.scores?.eventsAttended || 0;
    if (eventsAttended > 20) return 'experienced';
    if (eventsAttended > 10) return 'intermediate';
    return 'beginner';
  }

  calculateDaysUntil(eventDate) {
    const now = new Date();
    const event = new Date(eventDate);
    const diffTime = event - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  fallbackRecommendations(events) {
    return events.slice(0, 5).map(event => ({
      title: event.title,
      reasoning: `Matches your interest in ${event.category} events`
    }));
  }

  fallbackEmail(user, events, type) {
    const name = user.profile?.name || 'Student';
    const eventTitles = events.map(e => e.title).join(', ');

    return `Hi ${name},

    Here are some upcoming events you might be interested in: ${eventTitles}

    Best regards,
    College Event Tracker`;
  }

  // Feature flag for LLM usage
  shouldUseLLM(feature) {
    // Check environment variables or feature flags
    const llmFeatures = process.env.LLM_FEATURES?.split(',') || [];
    return llmFeatures.includes(feature) && (this.useClaude || this.useDeepSeek);
  }
}

module.exports = new LLMService();
