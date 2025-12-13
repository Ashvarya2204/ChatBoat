// const express = require('express');
// const router = express.Router();
// const { GoogleGenerativeAI } = require('@google/generative-ai');

// // Initialize Gemini
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// // Load school dataset
// const MKVV_DATASET = `
// MKVV School Information:
// - Name: M.K.V.V. School
// - Address: 117, Kumhar Khadi, Indore, Madhya Pradesh
// - Phone: 0731-3559070
// - WhatsApp: +91-8889920006
// - Email: mkvvschool@gmail.com
// - Established: 1995
// - Classes: Nursery to 10th
// - Medium: English & Hindi
// - Facilities: Computer Lab, Library, Sports Ground, Science Lab
// - Admission: Open throughout the year
// - Fee Structure: Contact office for details
// `;

// router.post('/query', async (req, res) => {
//   try {
//     const { query, language } = req.body;

//     console.log('\n=== NEW QUERY ===');
//     console.log('Query:', query);
//     console.log('Language:', language);
//     console.log('API Key exists:', !!process.env.GEMINI_API_KEY);
//     console.log('API Key (first 10 chars):', process.env.GEMINI_API_KEY?.substring(0, 10));

//     if (!query || !query.trim()) {
//       return res.status(400).json({ 
//         success: false,
//         error: 'Query is required' 
//       });
//     }

//     // Create prompt
//     const prompt = `You are Siri, a helpful voice assistant for MKVV School in Indore, India.

// School Information Database:
// ${MKVV_DATASET}

// User's Question (in ${language === 'hi-IN' ? 'Hindi' : 'English'}): "${query}"

// Instructions:
// - Answer ONLY using information from the School Information Database
// - If the question is in Hindi, reply in Hindi
// - If the question is in English, reply in English
// - Keep your answer short and conversational (maximum 3 sentences)
// - Be friendly and helpful
// - If information is not in database, say: "${language === 'hi-IN' 
//   ? 'क्षमा करें, मुझे इसकी जानकारी नहीं है। कृपया स्कूल ऑफिस से संपर्क करें: 0731-3559070' 
//   : 'I apologize, I do not have that information. Please contact school office at 0731-3559070'}"
// - Do NOT make up information

// Your Answer:`;

//     console.log('Calling Gemini API...');

//     // Call Gemini API with UPDATED MODEL NAME
//     const model = genAI.getGenerativeModel({ 
//       model: 'gemini-2.5-flash',
//       generationConfig: {
//         temperature: 0.7,
//         topK: 40,
//         topP: 0.95,
//         maxOutputTokens: 200,
//       }
//     });

//     const result = await model.generateContent(prompt);
//     console.log('✅ Received result from Gemini');
    
//     const response = await result.response;
//     console.log('✅ Got response object');
    
//     // Check for safety blocks or empty responses
//     if (!response) {
//       throw new Error('No response from Gemini API');
//     }

//     // Log the full response for debugging
//     console.log('Response object:', JSON.stringify(response, null, 2));
    
//     // Check if response was blocked
//     const candidate = response.candidates?.[0];
//     if (candidate?.finishReason === 'SAFETY') {
//       console.warn('⚠️ Response blocked by safety filters');
//       return res.json({
//         success: true,
//         response: language === 'hi-IN' 
//           ? 'क्षमा करें, मैं इस प्रश्न का उत्तर नहीं दे सकता।'
//           : 'I apologize, I cannot answer that question.',
//         language
//       });
//     }

//     const text = response.text();
//     console.log('✅ Generated response:', text);

//     if (!text || text.trim().length === 0) {
//       throw new Error('Empty response from Gemini API');
//     }

//     res.json({
//       success: true,
//       response: text.trim(),
//       language
//     });

//   } catch (error) {
//     console.error('\n❌ ERROR DETAILS:');
//     console.error('Error name:', error.name);
//     console.error('Error message:', error.message);
//     console.error('Error stack:', error.stack);
    
//     // Log specific Gemini API errors
//     if (error.message?.includes('API key')) {
//       console.error('🔑 API KEY ISSUE - Check your .env file');
//     }
    
//     if (error.message?.includes('quota')) {
//       console.error('📊 QUOTA EXCEEDED - Check your API limits');
//     }

//     if (error.message?.includes('SAFETY')) {
//       console.error('🛡️ SAFETY FILTER - Content was blocked');
//     }
    
//     res.status(500).json({
//       success: false,
//       error: 'Failed to generate response',
//       message: error.message,
//       debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
//     });
//   }
// });

// // Test endpoint - ALSO UPDATED
// router.get('/test', async (req, res) => {
//   try {
//     console.log('Testing Gemini API...');
    
//     const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });  // ✅ CHANGED
//     const result = await model.generateContent('Say hello in one word');
//     const response = await result.response;
//     const text = response.text();
    
//     res.json({
//       success: true,
//       message: 'Gemini API is working!',
//       testResponse: text
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

// module.exports = router;
console.log('🔥 GEMINI ROUTE FILE LOADING...');
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Import school dataset from dataset.js
let {MKVV_DATASET} = '';
console.log('📂 Attempting to load dataset...');
try {
  // Try to load dataset.js from same folder (routes/dataset.js)
  ({MKVV_DATASET} = require('./dataset.js'));
  console.log('✅ Dataset loaded successfully from ./dataset.js');
  console.log('📊 Dataset length:', MKVV_DATASET.length);
  console.log('📝 First 200 chars:', MKVV_DATASET.substring(0, 200));
} catch (error) {
  try {
    // Try from backend root folder
    ({MKVV_DATASET} = require('../dataset.js'));
    console.log('✅ Dataset loaded from backend/dataset.js');
  } catch (error2) {
    console.error('❌ Could not find dataset.js');
    console.error('Please place dataset.js in: backend/routes/dataset.js');
    
    // Fallback data
    MKVV_DATASET = `
MKVV School Information:
- Name: M.K.V.V. School
- Address: 117, Kumhar Khadi, Indore, Madhya Pradesh
- Phone: 0731-3559070
- WhatsApp: +91-8889920006
- Email: mkvvschool@gmail.com
- Established: 1995
- Classes: Nursery to 10th
- Medium: English & Hindi
- Facilities: Computer Lab, Library, Sports Ground, Science Lab
- Admission: Open throughout the year
- Fee Structure: Contact office for details
`;
  }
}

router.post('/query', async (req, res) => {
  try {
    const { query, language } = req.body;

    console.log('\n=== NEW QUERY ===');
    console.log('Query:', query);
    console.log('Language:', language);

    if (!query || !query.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Query is required' 
      });
    }

    // Create prompt
    const prompt = `You are a helpful assistant for MKVV School in Indore, India.

School Information:
${MKVV_DATASET}

User Question: "${query}"

Instructions:
- Answer ONLY using the school information above
- Keep answer SHORT (maximum 2-3 sentences)
- ${language === 'hi-IN' ? 'Reply in HINDI only' : 'Reply in ENGLISH only'}
- Be friendly and conversational
- If info not available, say: "${language === 'hi-IN' 
  ? 'मुझे इसकी जानकारी नहीं है। कृपया 0731-3559070 पर संपर्क करें।' 
  : 'I do not have that information. Please contact 0731-3559070.'}"

Answer:`;

    console.log('Calling Gemini API...');

    // Call Gemini API
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000,
      }
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log('✅ Response:', text);

    res.json({
      success: true,
      response: text.trim(),
      language
    });

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    
    // Send friendly error message
    const errorMsg = req.body.language === 'hi-IN'
      ? 'मुझे खेद है, कुछ तकनीकी समस्या है। कृपया 0731-3559070 पर संपर्क करें।'
      : 'I apologize, there is a technical issue. Please contact 0731-3559070.';
    
    res.json({
      success: true,
      response: errorMsg,
      language: req.body.language || 'en-US'
    });
  }
});

// Test endpoint
router.get('/test', async (req, res) => {
  try {
    console.log('Testing Gemini API...');
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Say hello');
    const response = result.response;
    const text = response.text();
    
    res.json({
      success: true,
      message: 'Gemini API is working!',
      testResponse: text
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;