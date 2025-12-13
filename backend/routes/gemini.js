const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Load school dataset
const MKVV_DATASET = `
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

router.post('/query', async (req, res) => {
  try {
    const { query, language } = req.body;

    console.log('\n=== NEW QUERY ===');
    console.log('Query:', query);
    console.log('Language:', language);
    console.log('API Key exists:', !!process.env.GEMINI_API_KEY);
    console.log('API Key (first 10 chars):', process.env.GEMINI_API_KEY?.substring(0, 10));

    if (!query || !query.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Query is required' 
      });
    }

    // Create prompt
    const prompt = `You are Siri, a helpful voice assistant for MKVV School in Indore, India.

School Information Database:
${MKVV_DATASET}

User's Question (in ${language === 'hi-IN' ? 'Hindi' : 'English'}): "${query}"

Instructions:
- Answer ONLY using information from the School Information Database
- If the question is in Hindi, reply in Hindi
- If the question is in English, reply in English
- Keep your answer short and conversational (maximum 3 sentences)
- Be friendly and helpful
- If information is not in database, say: "${language === 'hi-IN' 
  ? 'क्षमा करें, मुझे इसकी जानकारी नहीं है। कृपया स्कूल ऑफिस से संपर्क करें: 0731-3559070' 
  : 'I apologize, I do not have that information. Please contact school office at 0731-3559070'}"
- Do NOT make up information

Your Answer:`;

    console.log('Calling Gemini API...');

    // Call Gemini API with UPDATED MODEL NAME
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 200,
      }
    });

    const result = await model.generateContent(prompt);
    console.log('✅ Received result from Gemini');
    
    const response = await result.response;
    console.log('✅ Got response object');
    
    // Check for safety blocks or empty responses
    if (!response) {
      throw new Error('No response from Gemini API');
    }

    // Log the full response for debugging
    console.log('Response object:', JSON.stringify(response, null, 2));
    
    // Check if response was blocked
    const candidate = response.candidates?.[0];
    if (candidate?.finishReason === 'SAFETY') {
      console.warn('⚠️ Response blocked by safety filters');
      return res.json({
        success: true,
        response: language === 'hi-IN' 
          ? 'क्षमा करें, मैं इस प्रश्न का उत्तर नहीं दे सकता।'
          : 'I apologize, I cannot answer that question.',
        language
      });
    }

    const text = response.text();
    console.log('✅ Generated response:', text);

    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    res.json({
      success: true,
      response: text.trim(),
      language
    });

  } catch (error) {
    console.error('\n❌ ERROR DETAILS:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Log specific Gemini API errors
    if (error.message?.includes('API key')) {
      console.error('🔑 API KEY ISSUE - Check your .env file');
    }
    
    if (error.message?.includes('quota')) {
      console.error('📊 QUOTA EXCEEDED - Check your API limits');
    }

    if (error.message?.includes('SAFETY')) {
      console.error('🛡️ SAFETY FILTER - Content was blocked');
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate response',
      message: error.message,
      debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test endpoint - ALSO UPDATED
router.get('/test', async (req, res) => {
  try {
    console.log('Testing Gemini API...');
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });  // ✅ CHANGED
    const result = await model.generateContent('Say hello in one word');
    const response = await result.response;
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
