const axios = require('axios');

class ContentAggregationService {
  constructor() {
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY;
    this.githubToken = process.env.GITHUB_TOKEN;
  }

  // Aggregate preparation resources for an event
  async aggregatePreparationResources(event) {
    const resources = [];
    const topics = this.extractTopics(event.title, event.description, event.category);

    try {
      // Get YouTube videos
      const youtubeResults = await this.searchYouTube(topics);
      resources.push(...youtubeResults);

      // Get GitHub repositories
      const githubResults = await this.searchGitHub(topics);
      resources.push(...githubResults);

      // Get LeetCode problems
      const leetcodeResults = await this.searchLeetCode(topics);
      resources.push(...leetcodeResults);

      // Get blog articles (simplified - would integrate with dev.to, medium, etc.)
      const blogResults = await this.searchBlogs(topics);
      resources.push(...blogResults);

      // Rank and filter resources
      const rankedResources = this.rankResources(resources, topics);
      return rankedResources.slice(0, 10); // Return top 10

    } catch (error) {
      console.error('Error aggregating content:', error);
      return [];
    }
  }

  // Extract topics from event data
  extractTopics(title, description, category) {
    const text = `${title} ${description || ''}`.toLowerCase();
    const topics = new Set();

    // Add category-specific keywords
    const categoryKeywords = {
      'competitive-programming': ['algorithm', 'data structure', 'coding', 'contest', 'acm', 'icpc'],
      'machine-learning': ['machine learning', 'ml', 'neural network', 'deep learning', 'tensorflow', 'pytorch'],
      'web-dev': ['javascript', 'react', 'node.js', 'html', 'css', 'frontend', 'backend'],
      'data-science': ['pandas', 'numpy', 'matplotlib', 'jupyter', 'statistics', 'data analysis'],
      'cybersecurity': ['security', 'encryption', 'penetration testing', 'network security'],
      'design': ['ui', 'ux', 'figma', 'design system', 'prototyping']
    };

    if (categoryKeywords[category]) {
      categoryKeywords[category].forEach(keyword => topics.add(keyword));
    }

    // Extract technical terms from text
    const technicalTerms = [
      'algorithm', 'data structure', 'dynamic programming', 'graph theory',
      'machine learning', 'neural network', 'deep learning', 'computer vision',
      'natural language processing', 'reinforcement learning', 'supervised learning',
      'unsupervised learning', 'regression', 'classification', 'clustering',
      'javascript', 'typescript', 'python', 'java', 'c++', 'golang',
      'react', 'vue', 'angular', 'node.js', 'express', 'django', 'flask',
      'mongodb', 'postgresql', 'mysql', 'redis', 'docker', 'kubernetes',
      'aws', 'azure', 'gcp', 'linux', 'git', 'api', 'rest', 'graphql',
      'html', 'css', 'sass', 'tailwind', 'bootstrap'
    ];

    technicalTerms.forEach(term => {
      if (text.includes(term)) {
        topics.add(term);
      }
    });

    return Array.from(topics);
  }

  // Search YouTube for relevant videos
  async searchYouTube(topics) {
    if (!this.youtubeApiKey) return [];

    try {
      const query = topics.slice(0, 3).join(' '); // Use top 3 topics
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: this.youtubeApiKey,
          q: `${query} tutorial`,
          type: 'video',
          order: 'relevance',
          maxResults: 5,
          safeSearch: 'strict',
          relevanceLanguage: 'en'
        }
      });

      return response.data.items.map(item => ({
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        source: 'youtube',
        type: 'video',
        thumbnail: item.snippet.thumbnails.default.url,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        channelTitle: item.snippet.channelTitle,
        estimatedTime: 15, // Default 15 minutes
        difficulty: 'intermediate',
        relevanceScore: 0.8
      }));
    } catch (error) {
      console.error('YouTube API error:', error.message);
      return [];
    }
  }

  // Search GitHub for relevant repositories
  async searchGitHub(topics) {
    if (!this.githubToken) return [];

    try {
      const query = topics.map(topic => `${topic} tutorial OR ${topic} example`).join(' ');
      const response = await axios.get('https://api.github.com/search/repositories', {
        headers: {
          'Authorization': `token ${this.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        params: {
          q: query,
          sort: 'stars',
          order: 'desc',
          per_page: 5
        }
      });

      return response.data.items.map(repo => ({
        title: repo.name,
        url: repo.html_url,
        source: 'github',
        type: 'repository',
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        estimatedTime: 30, // Default 30 minutes
        difficulty: 'intermediate',
        relevanceScore: 0.7
      }));
    } catch (error) {
      console.error('GitHub API error:', error.message);
      return [];
    }
  }

  // Search LeetCode for relevant problems (simplified - would need official API)
  async searchLeetCode(topics) {
    // This is a simplified version. In production, you might use LeetCode's GraphQL API
    // or scrape data (with permission)
    const leetcodeProblems = [
      { title: 'Two Sum', difficulty: 'easy', tags: ['array', 'hash table'] },
      { title: 'Binary Tree Inorder Traversal', difficulty: 'easy', tags: ['tree', 'dfs'] },
      { title: 'Valid Parentheses', difficulty: 'easy', tags: ['string', 'stack'] },
      { title: 'Merge Two Sorted Lists', difficulty: 'easy', tags: ['linked list'] },
      { title: 'Maximum Subarray', difficulty: 'easy', tags: ['array', 'dynamic programming'] }
    ];

    return leetcodeProblems
      .filter(problem => topics.some(topic =>
        problem.tags.some(tag => tag.includes(topic)) ||
        problem.title.toLowerCase().includes(topic)
      ))
      .slice(0, 3)
      .map(problem => ({
        title: problem.title,
        url: `https://leetcode.com/problems/${problem.title.toLowerCase().replace(/\s+/g, '-')}`,
        source: 'leetcode',
        type: 'problem',
        difficulty: problem.difficulty,
        tags: problem.tags,
        estimatedTime: problem.difficulty === 'easy' ? 20 : problem.difficulty === 'medium' ? 45 : 90,
        relevanceScore: 0.9
      }));
  }

  // Search blogs/articles (simplified)
  async searchBlogs(topics) {
    // In production, integrate with dev.to, medium, hashnode APIs
    const mockArticles = [
      {
        title: 'Introduction to Algorithms',
        url: 'https://example.com/algorithms-intro',
        source: 'blog',
        type: 'article',
        estimatedTime: 10
      },
      {
        title: 'Machine Learning Fundamentals',
        url: 'https://example.com/ml-fundamentals',
        source: 'blog',
        type: 'article',
        estimatedTime: 15
      }
    ];

    return mockArticles.filter(article =>
      topics.some(topic => article.title.toLowerCase().includes(topic))
    );
  }

  // Rank resources by relevance
  rankResources(resources, topics) {
    return resources
      .map(resource => {
        let score = resource.relevanceScore || 0.5;

        // Boost score based on topic matches
        const titleMatch = topics.some(topic =>
          resource.title.toLowerCase().includes(topic)
        );
        const descMatch = resource.description &&
          topics.some(topic => resource.description.toLowerCase().includes(topic));

        if (titleMatch) score += 0.3;
        if (descMatch) score += 0.1;

        // Boost based on source credibility
        const sourceBoost = {
          'leetcode': 0.2,
          'github': 0.15,
          'youtube': 0.1,
          'blog': 0.05
        };
        score += sourceBoost[resource.source] || 0;

        return { ...resource, relevanceScore: Math.min(score, 1.0) };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // Get course-specific resources
  async getCourseResources(courseName, topics) {
    // This could integrate with university course platforms
    // For now, return general resources
    return this.aggregatePreparationResources({
      title: courseName,
      description: topics.join(' '),
      category: 'academic'
    });
  }
}

module.exports = new ContentAggregationService();
