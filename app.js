// Language Detection Function
function detectLanguage(text) {
    const hindiRegex = /[\u0900-\u097F]/;
    const englishRegex = /[a-zA-Z]/;
    
    if (hindiRegex.test(text)) {
        return 'hi-IN';
    } else if (englishRegex.test(text)) {
        return 'en-US';
    }
    return 'en-US';
}

// ⭐ GEMINI AI API KEY - Replace with your key
// NEW (Line 13)
const GEMINI_API_KEY = 'AIzaSyAynZEPJhhfgX03Q4BKgYEY_E7mKlZ9HOI';

const { useState, useRef, useEffect } = React;

function SchoolVoiceChatbot() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [avatarMood, setAvatarMood] = useState('neutral');
  const [currentLanguage, setCurrentLanguage] = useState('en-US');
  const [chatHistory, setChatHistory] = useState([]);
  
  const recognitionRef = useRef(null);

  // Load dataset from dataset.js
  useEffect(() => {
    if (typeof MKVV_DATASET !== 'undefined') {
      setKnowledgeBase(MKVV_DATASET);
      console.log('✅ Dataset loaded from dataset.js');
      
      // Welcome message
      setTimeout(() => {
        speakWelcome();
      }, 2000);
    } else {
      console.error('❌ MKVV_DATASET not found! Check dataset.js file.');
    }
  }, []);

  // Speech Recognition Setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = currentLanguage;
      
      recognition.onstart = () => {
        console.log('🎤 Listening started');
      };
      
      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        console.log('📝 You said:', text);
        setTranscript(text);
        
        const detectedLang = detectLanguage(text);
        console.log('🌐 Detected language:', detectedLang);
        setCurrentLanguage(detectedLang);
        
        processQuery(text, detectedLang);
      };
      
      recognition.onerror = (event) => {
        console.error('❌ Error:', event.error);
        setIsListening(false);
        setAvatarMood('neutral');
      };
      
      recognition.onend = () => {
        console.log('🎤 Stopped listening');
        setIsListening(false);
        setAvatarMood('neutral');
        
        // Wait 2 seconds before auto-restart
        setTimeout(() => {
          if (!isSpeaking) {
            console.log('🔄 Auto-restarting listening...');
            startListening();
          }
        }, 2000);
      };
      
      recognitionRef.current = recognition;
    }
  }, [currentLanguage, isSpeaking]);

  const speakWelcome = () => {
    const msgEn = "Welcome to M K V V School! I am Siri. How may I help you today?";
    const msgHi = "एम के वी वी स्कूल में आपका स्वागत है! मैं सिरी हूं।";
    
    speak(msgEn, 'en-US', () => {
      setTimeout(() => {
        speak(msgHi, 'hi-IN', () => {
          setTimeout(() => startListening(), 1000);
        });
      }, 500);
    });
  };

  const speak = (text, language, callback) => {
    console.log('🔊 Speaking in', language, ':', text.substring(0, 50) + '...');
    setAvatarMood('speaking');
    setIsSpeaking(true);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language || currentLanguage;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
      console.log('✅ Speech finished');
      setIsSpeaking(false);
      setAvatarMood('neutral');
      
      if (callback) {
        callback();
      }
      
      setTimeout(() => {
        if (!isListening) {
          console.log('🔄 Restarting listening after speech...');
          startListening();
        }
      }, 1500);
    };
    
    utterance.onerror = (event) => {
      console.error('❌ Speech error:', event);
      setIsSpeaking(false);
      setAvatarMood('neutral');
      
      setTimeout(() => {
        startListening();
      }, 1000);
    };
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (recognitionRef.current && !isSpeaking && !isListening) {
      try {
        recognitionRef.current.lang = currentLanguage;
        recognitionRef.current.start();
        setIsListening(true);
        setAvatarMood('listening');
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  // ⭐ GEMINI AI POWERED QUERY PROCESSING
  const processQuery = async (query, language) => {
    if (!query.trim()) return;

    console.log('🔍 Processing with AI:', query, 'in', language);

    let botResponse = '';

    try {
      // ⭐ CREATE SMART PROMPT FOR GEMINI
      const prompt = `You are Siri, a helpful voice assistant for MKVV School in Indore, India.

School Information Database:
${knowledgeBase}

User's Question (in ${language === 'hi-IN' ? 'Hindi' : 'English'}): "${query}"

Instructions:
- Answer ONLY using information from the School Information Database above
- If the question is in Hindi, reply in Hindi
- If the question is in English, reply in English
- Keep your answer short and conversational (maximum 3 sentences)
- Be friendly and helpful
- If the information is not in the database, say: "${language === 'hi-IN' ? 'क्षमा करें, मुझे इसकी जानकारी नहीं है। कृपया स्कूल ऑफिस से संपर्क करें: 0731-3559070' : 'I apologize, I do not have that information. Please contact school office at 0731-3559070'}"
- Do NOT make up information
- Answer naturally as a voice assistant would speak

Your Answer:`;

      // ⭐ CALL GEMINI API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 200,
            }
          })
        }
      );

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        botResponse = data.candidates[0].content.parts[0].text.trim();
        console.log('✅ AI Response:', botResponse);
      } else {
        throw new Error('Invalid AI response');
      }

    } catch (error) {
      console.error('❌ AI Error:', error);
      
      // ⭐ FALLBACK TO BASIC RESPONSE
      botResponse = language === 'hi-IN'
        ? "क्षमा करें, कुछ तकनीकी समस्या है। कृपया स्कूल ऑफिस से संपर्क करें: 0731-3559070"
        : "I'm sorry, there's a technical issue. Please contact school office at 0731-3559070";
    }

    // Add closing
    const closingEn = " Thank you! Anything else you want to know?";
    const closingHi = " धन्यवाद! क्या आप कुछ और जानना चाहते हैं?";
    
    const finalResponse = botResponse + (language === 'hi-IN' ? closingHi : closingEn);

    setResponse(finalResponse);
    setChatHistory(prev => [...prev, { 
      query, 
      response: finalResponse, 
      timestamp: new Date()
    }]);

    // Speak response
    setTimeout(() => {
      speak(finalResponse, language);
    }, 500);
  };

  const stopSpeaking = () => {
    console.log('⏹️ Stopped speaking manually');
    
    window.speechSynthesis.cancel();
    
    setIsSpeaking(false);
    setAvatarMood('neutral');
    
    setTimeout(() => {
      console.log('🔄 Force restarting listening after manual stop...');
      
      if (recognitionRef.current && !isListening) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
          setAvatarMood('listening');
        } catch (error) {
          console.error('Error restarting:', error);
        }
      }
    }, 1500);
  };

  const clearHistory = () => {
    setChatHistory([]);
    setTranscript('');
    setResponse('');
  };

  return (
    <div className="min-h-screen school-bg">
      {/* Header */}
      <div className="school-header">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="school-logo">
                <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">MKVV School - AI Siri Assistant</h1>
                <p className="text-blue-100">
                  {isListening ? '🎤 Listening...' : isSpeaking ? '💬 Speaking...' : '✅ AI Ready!'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          
          {/* Avatar Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex flex-col items-center gap-6">
              <h2 className="text-2xl font-bold text-gray-800">AI Siri - Voice Assistant</h2>
              
              {/* 3D Ready Player Me Avatar */}
              <div className="rpm-avatar-container">
                <div className={`rpm-avatar-wrapper ${
                  isListening ? 'listening' : isSpeaking ? 'speaking' : ''
                }`}>
                  <model-viewer
                    src="https://models.readyplayer.me/693ced63b4a5b8fc471662e3.glb?morphTargets=ARKit&textureAtlas=1024"
                    alt="MKVV School Assistant Avatar"
                    auto-rotate={!isSpeaking && !isListening ? 'true' : undefined}
                    camera-controls="true"
                    camera-orbit="0deg 90deg 1.3m"
                    min-camera-orbit="auto 60deg 1m"
                    max-camera-orbit="auto 120deg 2m"
                    field-of-view="40deg"
                    exposure="1.2"
                    shadow-intensity="1.2"
                    shadow-softness="0.8"
                    environment-image="neutral"
                    interaction-prompt="none"
                    loading="eager"
                    reveal="auto"
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <div slot="poster" style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: 'white',
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}>
                      Loading AI Avatar...
                    </div>
                  </model-viewer>
                  
                  {/* Status Badge */}
                  <div className={`avatar-status-badge ${
                    isListening ? 'listening' : isSpeaking ? 'speaking' : 'ready'
                  }`}>
                    {isListening ? '🎤 Listening...' : isSpeaking ? '💬 Speaking...' : '🤖 AI Ready'}
                  </div>
                  
                  {/* Sound Indicator */}
                  {isSpeaking && (
                    <div className="sound-indicator">
                      <div className="sound-bar"></div>
                      <div className="sound-bar"></div>
                      <div className="sound-bar"></div>
                      <div className="sound-bar"></div>
                    </div>
                  )}
                </div>
              </div>

              {isSpeaking && (
                <button 
                  onClick={stopSpeaking} 
                  className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
                >
                  ⏹️ Stop Speaking
                </button>
              )}

              {/* Quick Questions */}
              <div className="w-full">
                <p className="font-semibold mb-2">Quick Questions:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => processQuery('school address', 'en-US')} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm">
                    📍 Address
                  </button>
                  <button onClick={() => processQuery('admission process', 'en-US')} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm">
                    📝 Admission
                  </button>
                  <button onClick={() => processQuery('fee structure', 'en-US')} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm">
                    💰 Fees
                  </button>
                  <button onClick={() => processQuery('contact number', 'en-US')} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm">
                    📞 Contact
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Response Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">AI Response</h2>
            
            {transcript && (
              <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg mb-4 animate-fadeIn">
                <p className="font-semibold text-blue-800 text-sm mb-1">You Asked:</p>
                <p className="text-gray-800">{transcript}</p>
              </div>
            )}
            
            {response ? (
              <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg animate-fadeIn">
                <p className="text-gray-800 whitespace-pre-line mb-4">{response}</p>
                
                <div className="mt-4 pt-4 border-t border-green-200">
                  <p className="text-sm font-semibold text-green-800 mb-2">Quick Actions:</p>
                  <div className="flex gap-2 flex-wrap">
                    <a href="tel:07313559070" className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
                      📞 Call
                    </a>
                    <a href="https://wa.me/918889920006" target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm">
                      💬 WhatsApp
                    </a>
                    <a href="https://www.google.com/maps/search/?api=1&query=117+Kumhar+Khadi+Indore" target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">
                      📍 Map
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <p>Ask me anything about MKVV School!</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-2xl font-bold">Conversation History</h2>
              <button onClick={clearHistory} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                Clear
              </button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
              {chatHistory.slice().reverse().map((item, idx) => (
                <div key={idx} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="p-3 bg-blue-50 rounded-lg mb-2">
                    <p className="text-sm font-bold text-blue-800">Q:</p>
                    <p className="text-gray-700">{item.query}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-bold text-green-800">A:</p>
                    <p className="text-gray-700 whitespace-pre-line">{item.response}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

ReactDOM.render(<SchoolVoiceChatbot />, document.getElementById('root'));
