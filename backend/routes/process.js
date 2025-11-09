const express = require('express');
const multer = require('multer');
const nlp = require('compromise');
const chrono = require('chrono-node');
const Anthropic = require('@anthropic-ai/sdk');
const vision = require('@google-cloud/vision');
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');
const { authenticate } = require('../middleware/auth');

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Initialize Google Cloud Vision client
let visionClient = null;
if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
    visionClient = new vision.ImageAnnotatorClient({ credentials });
  } catch (error) {
    console.warn('Google Cloud Vision not configured:', error.message);
  }
}

// Initialize Google Cloud Document AI client
let documentAIClient = null;
if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
    documentAIClient = new DocumentProcessorServiceClient({ credentials });
  } catch (error) {
    console.warn('Google Cloud Document AI not configured:', error.message);
  }
}

const router = express.Router();

// OCR API Configuration
const OCR_APIS = {
  DEEPSEEK: {
    url: 'https://platform.deepseek.com/api/v1/ocr',
    key: process.env.DEEPSEEK_API_KEY,
    timeout: 10000,
  },
  GOOGLE_VISION: {
    enabled: !!visionClient,
    timeout: 15000,
  },
  GOOGLE_DOCUMENT_AI: {
    enabled: !!documentAIClient,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    location: process.env.GOOGLE_CLOUD_LOCATION || 'us',
    processorId: process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID,
    timeout: 30000,
  },
  CLAUDE: {
    model: 'claude-4-5-sonnet-20241022',
    maxTokens: 1024,
    timeout: 20000,
  }
};

// All routes require authentication
router.use(authenticate);

// Configure multer for file uploads (images and PDFs)
const upload = multer({
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for PDFs
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'image/gif', 'image/bmp', 'image/tiff',
      'application/pdf'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
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

// ========================= IMAGE PREPROCESSING =========================

// Preprocess image for optimal OCR results
async function preprocessImage(imageBuffer) {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    // Auto-rotate based on EXIF orientation
    let processed = image.rotate();
    
    // Resize if too large (max 4000px on longest side)
    const maxDimension = 4000;
    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      processed = processed.resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Convert to grayscale for better text detection
    processed = processed.grayscale();
    
    // Enhance contrast using histogram normalization
    processed = processed.normalize();
    
    // Sharpen for better edge detection
    processed = processed.sharpen({
      sigma: 1.5,
      m1: 1.0,
      m2: 0.5
    });
    
    // Reduce noise
    processed = processed.median(3);
    
    // Threshold for clean binary image (improves OCR)
    processed = processed.threshold(128, {
      grayscale: false
    });
    
    const processedBuffer = await processed.toBuffer();
    
    console.log('Image preprocessing completed:', {
      originalSize: `${metadata.width}x${metadata.height}`,
      format: metadata.format
    });
    
    return processedBuffer;
  } catch (error) {
    console.error('Image preprocessing error:', error.message);
    // Return original buffer if preprocessing fails
    return imageBuffer;
  }
}

// Detect and rotate text regions
async function detectTextRotation(imageBuffer) {
  try {
    if (!visionClient) return 0;
    
    const [result] = await visionClient.textDetection({
      image: { content: imageBuffer }
    });
    
    const textAnnotations = result.textAnnotations;
    if (!textAnnotations || textAnnotations.length === 0) return 0;
    
    // Get the first full text annotation which contains rotation info
    const fullText = textAnnotations[0];
    if (!fullText.boundingPoly || !fullText.boundingPoly.vertices) return 0;
    
    // Calculate rotation angle from bounding box
    const vertices = fullText.boundingPoly.vertices;
    const angle = Math.atan2(
      vertices[1].y - vertices[0].y,
      vertices[1].x - vertices[0].x
    ) * (180 / Math.PI);
    
    return angle;
  } catch (error) {
    console.log('Text rotation detection failed:', error.message);
    return 0;
  }
}

// ========================= GOOGLE CLOUD VISION API =========================

async function processWithGoogleVision(imageBuffer) {
  if (!visionClient) {
    throw new Error('Google Vision client not configured');
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OCR_APIS.GOOGLE_VISION.timeout);
  
  try {
    const [result] = await visionClient.documentTextDetection({
      image: { content: imageBuffer }
    });
    
    clearTimeout(timeoutId);
    
    const fullTextAnnotation = result.fullTextAnnotation;
    if (!fullTextAnnotation || !fullTextAnnotation.text) {
      throw new Error('No text detected by Google Vision');
    }
    
    const extractedText = fullTextAnnotation.text;
    
    // Calculate confidence from individual pages
    let totalConfidence = 0;
    let wordCount = 0;
    
    if (fullTextAnnotation.pages) {
      for (const page of fullTextAnnotation.pages) {
        for (const block of page.blocks || []) {
          for (const paragraph of block.paragraphs || []) {
            for (const word of paragraph.words || []) {
              if (word.confidence) {
                totalConfidence += word.confidence;
                wordCount++;
              }
            }
          }
        }
      }
    }
    
    const averageConfidence = wordCount > 0 ? totalConfidence / wordCount : 0.9;
    
    console.log('Google Vision OCR completed with confidence:', averageConfidence);
    
    return {
      text: extractedText,
      confidence: averageConfidence
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ========================= GOOGLE CLOUD DOCUMENT AI =========================

async function processWithDocumentAI(fileBuffer, mimeType) {
  if (!documentAIClient || !OCR_APIS.GOOGLE_DOCUMENT_AI.processorId) {
    throw new Error('Google Document AI not configured');
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OCR_APIS.GOOGLE_DOCUMENT_AI.timeout);
  
  try {
    const projectId = OCR_APIS.GOOGLE_DOCUMENT_AI.projectId;
    const location = OCR_APIS.GOOGLE_DOCUMENT_AI.location;
    const processorId = OCR_APIS.GOOGLE_DOCUMENT_AI.processorId;
    
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
    
    const request = {
      name,
      rawDocument: {
        content: fileBuffer.toString('base64'),
        mimeType: mimeType
      }
    };
    
    const [result] = await documentAIClient.processDocument(request);
    clearTimeout(timeoutId);
    
    const { document } = result;
    if (!document || !document.text) {
      throw new Error('No text detected by Document AI');
    }
    
    const extractedText = document.text;
    
    // Calculate confidence from entities and pages
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    if (document.pages) {
      for (const page of document.pages) {
        if (page.tokens) {
          for (const token of page.tokens) {
            if (token.confidence) {
              totalConfidence += token.confidence;
              confidenceCount++;
            }
          }
        }
      }
    }
    
    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0.95;
    
    console.log('Google Document AI completed with confidence:', averageConfidence);
    
    return {
      text: extractedText,
      confidence: averageConfidence
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ========================= PDF PROCESSING =========================

async function processPDF(fileBuffer) {
  try {
    const pdfData = await pdfParse(fileBuffer);
    
    if (!pdfData.text || pdfData.text.trim().length === 0) {
      // If text extraction failed, convert PDF to images and use OCR
      return await convertPDFToImagesAndOCR(fileBuffer);
    }
    
    console.log('PDF text extraction completed, pages:', pdfData.numpages);
    
    return {
      text: pdfData.text,
      confidence: 0.95, // High confidence for native PDF text
      pages: pdfData.numpages
    };
  } catch (error) {
    console.error('PDF parsing error:', error.message);
    // Fallback to image-based OCR
    return await convertPDFToImagesAndOCR(fileBuffer);
  }
}

async function convertPDFToImagesAndOCR(pdfBuffer) {
  // This would require pdf-poppler or similar
  // For now, try Document AI which handles PDFs natively
  try {
    return await processWithDocumentAI(pdfBuffer, 'application/pdf');
  } catch (error) {
    throw new Error('Failed to process PDF: ' + error.message);
  }
}

// ========================= CONFIDENCE CALCULATION =========================

function calculateOCRConfidence(extractedText, method, rawConfidence) {
  let confidence = rawConfidence || 0.5;
  
  // Base confidence by method (reliability ranking)
  const methodBaseConfidence = {
    'google-document-ai': 0.95,
    'google-vision': 0.92,
    'deepseek-ocr': 0.88,
    'claude-vision': 0.85,
    'paddleocr': 0.80
  };
  
  const baseConfidence = methodBaseConfidence[method] || 0.5;
  confidence = (confidence + baseConfidence) / 2;
  
  // Adjust based on text characteristics
  if (extractedText && extractedText.length > 0) {
    // Text length factor (too short or too long might indicate errors)
    const textLength = extractedText.length;
    if (textLength < 10) {
      confidence *= 0.7; // Very short text is suspicious
    } else if (textLength > 50 && textLength < 1000) {
      confidence *= 1.1; // Good text length
    } else if (textLength > 5000) {
      confidence *= 0.9; // Very long might have noise
    }
    
    // Special character ratio (too many special chars = likely noise)
    const specialCharCount = (extractedText.match(/[^a-zA-Z0-9\s\-:,.]/g) || []).length;
    const specialCharRatio = specialCharCount / textLength;
    if (specialCharRatio > 0.3) {
      confidence *= 0.7; // High special char ratio
    } else if (specialCharRatio < 0.05) {
      confidence *= 1.05; // Clean text
    }
    
    // Word count (good indicator of quality)
    const words = extractedText.trim().split(/\s+/);
    const wordCount = words.length;
    if (wordCount > 5 && wordCount < 500) {
      confidence *= 1.05; // Good word count for an event poster
    }
    
    // Check for common event-related keywords
    const eventKeywords = [
      'event', 'workshop', 'seminar', 'competition', 'webinar',
      'date', 'time', 'location', 'venue', 'register', 'rsvp',
      'speaker', 'organized by', 'presented by', 'when', 'where'
    ];
    const lowerText = extractedText.toLowerCase();
    const keywordMatches = eventKeywords.filter(kw => lowerText.includes(kw)).length;
    if (keywordMatches >= 2) {
      confidence *= 1.1; // Contains event-related keywords
    }
    
    // Date/time detection bonus
    const hasDate = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(extractedText);
    const hasTime = /\d{1,2}:\d{2}/.test(extractedText);
    if (hasDate && hasTime) {
      confidence *= 1.1;
    } else if (hasDate || hasTime) {
      confidence *= 1.05;
    }
    
    // Consecutive uppercase letters (might indicate headers)
    const upperCaseSequences = extractedText.match(/[A-Z]{3,}/g);
    if (upperCaseSequences && upperCaseSequences.length > 0 && upperCaseSequences.length < 5) {
      confidence *= 1.02; // Good - likely headers
    }
  }
  
  // Cap confidence at 0.98 (never 100% certain)
  confidence = Math.min(confidence, 0.98);
  confidence = Math.max(confidence, 0.1); // Floor at 0.1
  
  return parseFloat(confidence.toFixed(3));
}

// ========================= MAIN OCR PROCESSING FUNCTION =========================

// OCR Processing Function with Real APIs and Comprehensive Fallback Chain
async function processImageWithOCR(file) {
  try {
    console.log('Starting OCR processing for file:', file.originalname);
    const mimeType = file.mimetype;
    
    // Handle PDFs separately
    if (mimeType === 'application/pdf') {
      console.log('Processing PDF file...');
      const pdfResult = await processPDF(file.buffer);
      const nlpResult = await processTextWithNLP(pdfResult.text);
      const finalConfidence = calculateOCRConfidence(pdfResult.text, 'pdf-extraction', pdfResult.confidence);
      
      return {
        ...nlpResult,
        extractionConfidence: finalConfidence,
        extractionMethod: 'pdf-extraction',
        rawExtractedText: pdfResult.text,
        pdfPages: pdfResult.pages
      };
    }

    // Preprocess image for optimal OCR
    console.log('Preprocessing image...');
    let processedBuffer = await preprocessImage(file.buffer);
    const base64Image = processedBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    let extractedText = null;
    let rawConfidence = 0;
    let method = 'unknown';

    // === TIER 1: DeepSeek OCR (Fast, Good for clean text) ===
    try {
      console.log('Tier 1: Attempting DeepSeek OCR...');
      const deepseekResult = await processWithDeepSeek(base64Image, mimeType);
      if (deepseekResult && deepseekResult.text && deepseekResult.text.trim().length > 10) {
        const confidence = calculateOCRConfidence(deepseekResult.text, 'deepseek-ocr', deepseekResult.confidence);
        if (confidence > 0.85) {
          extractedText = deepseekResult.text;
          rawConfidence = confidence;
          method = 'deepseek-ocr';
          console.log('✓ DeepSeek OCR successful, confidence:', confidence);
        }
      }
    } catch (error) {
      console.log('✗ DeepSeek OCR failed:', error.message);
    }

    // === TIER 2: Google Cloud Vision (Better for decorative fonts) ===
    if (!extractedText || rawConfidence < 0.90) {
      try {
        console.log('Tier 2: Attempting Google Cloud Vision...');
        const visionResult = await processWithGoogleVision(processedBuffer);
        if (visionResult && visionResult.text && visionResult.text.trim().length > 10) {
          const confidence = calculateOCRConfidence(visionResult.text, 'google-vision', visionResult.confidence);
          if (confidence > rawConfidence) {
            extractedText = visionResult.text;
            rawConfidence = confidence;
            method = 'google-vision';
            console.log('✓ Google Vision successful, confidence:', confidence);
          }
        }
      } catch (error) {
        console.log('✗ Google Vision failed:', error.message);
      }
    }

    // === TIER 3: Claude Vision (Excellent for complex layouts and stylized text) ===
    if (!extractedText || rawConfidence < 0.85) {
      try {
        console.log('Tier 3: Attempting Claude Vision...');
        const claudeResult = await processWithClaudeVision(dataUrl);
        if (claudeResult && claudeResult.text && claudeResult.text.trim().length > 10) {
          const confidence = calculateOCRConfidence(claudeResult.text, 'claude-vision', claudeResult.confidence);
          if (confidence > rawConfidence) {
            extractedText = claudeResult.text;
            rawConfidence = confidence;
            method = 'claude-vision';
            console.log('✓ Claude Vision successful, confidence:', confidence);
          }
        }
      } catch (error) {
        console.log('✗ Claude Vision failed:', error.message);
      }
    }

    // === TIER 4: Google Document AI (Last resort - most comprehensive) ===
    if (!extractedText || rawConfidence < 0.80) {
      try {
        console.log('Tier 4: Attempting Google Document AI (final fallback)...');
        const documentAIResult = await processWithDocumentAI(file.buffer, mimeType);
        if (documentAIResult && documentAIResult.text && documentAIResult.text.trim().length > 10) {
          const confidence = calculateOCRConfidence(documentAIResult.text, 'google-document-ai', documentAIResult.confidence);
          if (confidence > rawConfidence) {
            extractedText = documentAIResult.text;
            rawConfidence = confidence;
            method = 'google-document-ai';
            console.log('✓ Google Document AI successful, confidence:', confidence);
          }
        }
      } catch (error) {
        console.log('✗ Google Document AI failed:', error.message);
      }
    }

    // If still no text, throw error
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('All OCR services failed to extract meaningful text from image');
    }

    // Process extracted text with NLP to extract event details
    console.log('Processing extracted text with NLP...');
    console.log(`Final OCR method: ${method}, confidence: ${rawConfidence.toFixed(3)}`);
    
    const nlpResult = await processTextWithNLP(extractedText);

    return {
      ...nlpResult,
      extractionConfidence: rawConfidence,
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
