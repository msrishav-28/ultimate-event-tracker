const express = require('express');
const multer = require('multer');
const nlp = require('compromise');
const chrono = require('chrono-node');
const Anthropic = require('@anthropic-ai/sdk');
const { authenticate } = require('../middleware/auth');

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const router = express.Router();

// OCR API Configuration
const OCR_APIS = {
  DEEPSEEK: {
    url: 'https://platform.deepseek.com/api/v1/ocr',
    key: process.env.DEEPSEEK_API_KEY,
    timeout: 10000, // 10 seconds
  },
  PADDLEOCR: {
    url: 'https://api.paddlepaddle.org.cn/paddlehub/ocr',
    key: process.env.PADDLEOCR_API_KEY,
    timeout: 15000, // 15 seconds
  },
  CLAUDE: {
    model: 'claude-3-sonnet-20240229',
    maxTokens: 1024,
    timeout: 20000, // 20 seconds
  }
};

// All routes require authentication
router.use(authenticate);

// Configure multer for file uploads
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Process text input with NLP
router.post('/text', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text input is required' });
    }

    // Process with NLP
    const result = await processTextWithNLP(text);

    res.json({
      processed: true,
      ...result,
      sourceType: 'text_manual'
    });
  } catch (error) {
    console.error('Text processing error:', error);
    res.status(500).json({ error: 'Failed to process text' });
  }
});

// Process voice input (text from speech)
router.post('/voice', async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Voice transcript is required' });
    }

    // Process transcript same as text
    const result = await processTextWithNLP(transcript);

    res.json({
      processed: true,
      ...result,
      sourceType: 'voice'
    });
  } catch (error) {
    console.error('Voice processing error:', error);
    res.status(500).json({ error: 'Failed to process voice input' });
  }
});

// Process image upload
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Process image with OCR
    const result = await processImageWithOCR(req.file);

    res.json({
      processed: true,
      ...result,
      sourceType: 'poster_image'
    });
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// NLP Processing Function
async function processTextWithNLP(text) {
  try {
    // Initialize compromise
    const doc = nlp(text);

    // Extract entities
    const title = extractTitle(doc);
    const dateTime = extractDateTime(text);
    const location = extractLocation(doc);
    const priority = estimatePriority(text);
    const category = estimateCategory(text);

    // Calculate confidence (simplified)
    const confidence = calculateConfidence(title, dateTime, location);

    return {
      title: title || 'Untitled Event',
      dateTime: dateTime || null,
      location: location || '',
      priority: priority,
      category: category,
      description: text,
      extractionConfidence: confidence,
      extractionMethod: 'nlp'
    };
  } catch (error) {
    console.error('NLP processing error:', error);
    throw error;
  }
}

// DeepSeek OCR Implementation
async function processWithDeepSeek(base64Image, mimeType) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OCR_APIS.DEEPSEEK.timeout);

  try {
    const response = await fetch(OCR_APIS.DEEPSEEK.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OCR_APIS.DEEPSEEK.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        mime_type: mimeType,
        options: {
          detect_text: true,
          detect_layout: true,
          language: 'en'
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const result = await response.json();

    // Extract text from DeepSeek response
    const extractedText = result.text || result.extracted_text || '';
    const confidence = result.confidence || 0.95; // DeepSeek typically has high confidence

    return {
      text: extractedText,
      confidence: confidence
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// PaddleOCR Implementation
async function processWithPaddleOCR(base64Image, mimeType) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OCR_APIS.PADDLEOCR.timeout);

  try {
    const response = await fetch(OCR_APIS.PADDLEOCR.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OCR_APIS.PADDLEOCR.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: `data:${mimeType};base64,${base64Image}`,
        parameters: {
          det: true,
          rec: true,
          cls: true,
          language: 'en'
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`PaddleOCR API error: ${response.status}`);
    }

    const result = await response.json();

    // Extract text from PaddleOCR response
    let extractedText = '';
    let totalConfidence = 0;
    let textCount = 0;

    if (result.results && result.results.length > 0) {
      for (const textBlock of result.results[0]) {
        if (textBlock.text && textBlock.confidence > 0.8) {
          extractedText += textBlock.text + ' ';
          totalConfidence += textBlock.confidence;
          textCount++;
        }
      }
    }

    const averageConfidence = textCount > 0 ? totalConfidence / textCount : 0;

    return {
      text: extractedText.trim(),
      confidence: averageConfidence
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Claude Vision Implementation (Final fallback)
async function processWithClaudeVision(dataUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OCR_APIS.CLAUDE.timeout);

  try {
    const message = await anthropic.messages.create({
      model: OCR_APIS.CLAUDE.model,
      max_tokens: OCR_APIS.CLAUDE.maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: dataUrl.split(';')[0].split(':')[1],
                data: dataUrl.split(',')[1]
              }
            },
            {
              type: 'text',
              text: `Extract all visible text from this image. This appears to be an event poster or flyer. Please provide:

1. All text content exactly as it appears
2. Any dates, times, or locations you can identify
3. A confidence score (0.0-1.0) for how accurately you extracted the text

Format your response as JSON:
{
  "extracted_text": "full text content here",
  "confidence": 0.85
}`
            }
          ]
        }
      ]
    });

    clearTimeout(timeoutId);

    const responseText = message.content[0].text;
    const responseJson = JSON.parse(responseText);

    return {
      text: responseJson.extracted_text || '',
      confidence: responseJson.confidence || 0.8
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// OCR Processing Function with Real APIs
async function processImageWithOCR(file) {
  try {
    console.log('Starting OCR processing for file:', file.originalname);

    // Convert buffer to base64 for API calls
    const base64Image = file.buffer.toString('base64');
    const mimeType = file.mimetype;
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    let extractedText = null;
    let confidence = 0;
    let method = 'unknown';

    // Try DeepSeek OCR first (97% accuracy target)
    try {
      console.log('Attempting DeepSeek OCR...');
      const deepseekResult = await processWithDeepSeek(base64Image, mimeType);
      if (deepseekResult && deepseekResult.confidence > 0.92) {
        extractedText = deepseekResult.text;
        confidence = deepseekResult.confidence;
        method = 'deepseek-ocr';
        console.log('DeepSeek OCR successful, confidence:', confidence);
      }
    } catch (error) {
      console.log('DeepSeek OCR failed:', error.message);
    }

    // Fallback to PaddleOCR if DeepSeek failed or confidence too low
    if (!extractedText || confidence < 0.92) {
      try {
        console.log('Attempting PaddleOCR fallback...');
        const paddleResult = await processWithPaddleOCR(base64Image, mimeType);
        if (paddleResult && paddleResult.confidence > confidence) {
          extractedText = paddleResult.text;
          confidence = paddleResult.confidence;
          method = 'paddleocr';
          console.log('PaddleOCR successful, confidence:', confidence);
        }
      } catch (error) {
        console.log('PaddleOCR failed:', error.message);
      }
    }

    // Final fallback to Claude Vision if both failed
    if (!extractedText || confidence < 0.8) {
      try {
        console.log('Attempting Claude Vision final fallback...');
        const claudeResult = await processWithClaudeVision(dataUrl);
        if (claudeResult && claudeResult.confidence > confidence) {
          extractedText = claudeResult.text;
          confidence = claudeResult.confidence;
          method = 'claude-vision';
          console.log('Claude Vision successful, confidence:', confidence);
        }
      } catch (error) {
        console.log('Claude Vision failed:', error.message);
      }
    }

    if (!extractedText) {
      throw new Error('All OCR services failed to extract text from image');
    }

    // Process extracted text with NLP to extract event details
    console.log('Processing extracted text with NLP...');
    const nlpResult = await processTextWithNLP(extractedText);

    return {
      ...nlpResult,
      extractionConfidence: confidence,
      extractionMethod: method,
      rawExtractedText: extractedText
    };

  } catch (error) {
    console.error('OCR processing error:', error);
    throw error;
  }
}

// Helper: Extract title from NLP doc
function extractTitle(doc) {
  // Look for event keywords and capitalize
  const eventTerms = doc.match('#Event+');
  if (eventTerms.found) {
    return eventTerms.text().trim();
  }

  // Fallback: first sentence or first few words
  const sentences = doc.sentences().out('array');
  if (sentences.length > 0) {
    const firstSentence = sentences[0];
    if (firstSentence.length < 100) {
      return firstSentence.trim();
    }
    return firstSentence.substring(0, 80) + '...';
  }

  return null;
}

// Helper: Extract date/time using chrono-node
function extractDateTime(text) {
  const results = chrono.parse(text, new Date(), { forwardDate: true });
  if (results.length > 0) {
    return results[0].start.date();
  }
  return null;
}

// Helper: Extract location
function extractLocation(doc) {
  // Look for location patterns
  const places = doc.places();
  if (places.found) {
    return places.out('text').trim();
  }

  // Look for building/room patterns
  const buildings = doc.match(/(building|lab|room|hall|center|campus)/i);
  if (buildings.found) {
    const sentence = buildings.sentences().out('text');
    return sentence.trim();
  }

  return '';
}

// Helper: Estimate priority based on keywords
function estimatePriority(text) {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('critical') || lowerText.includes('urgent') ||
      lowerText.includes('important') || lowerText.includes('deadline')) {
    return 5;
  }
  if (lowerText.includes('high priority') || lowerText.includes('competition') ||
      lowerText.includes('exam')) {
    return 4;
  }
  if (lowerText.includes('medium') || lowerText.includes('workshop')) {
    return 3;
  }
  if (lowerText.includes('social') || lowerText.includes('club')) {
    return 2;
  }

  return 3; // Default medium
}

// Helper: Estimate category
function estimateCategory(text) {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('competition') || lowerText.includes('contest') ||
      lowerText.includes('hackathon')) {
    return 'competition';
  }
  if (lowerText.includes('webinar') || lowerText.includes('seminar') ||
      lowerText.includes('lecture')) {
    return 'webinar';
  }
  if (lowerText.includes('workshop') || lowerText.includes('training')) {
    return 'workshop';
  }
  if (lowerText.includes('meeting') || lowerText.includes('club')) {
    return 'meeting';
  }
  if (lowerText.includes('social') || lowerText.includes('party') ||
      lowerText.includes('cultural')) {
    return 'social';
  }

  return 'academic'; // Default
}

// Helper: Calculate confidence score
function calculateConfidence(title, dateTime, location) {
  let score = 0;

  if (title) score += 0.4;
  if (dateTime) score += 0.4;
  if (location) score += 0.2;

  return Math.min(score, 1.0);
}

module.exports = router;
