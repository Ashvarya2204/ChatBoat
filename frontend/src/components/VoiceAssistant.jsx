import { useState, useRef, useEffect } from 'react';

function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const recognitionRef = useRef(null);
  const currentLangRef = useRef('en-US');
  const attemptCountRef = useRef(0);

  // Setup SINGLE recognition that switches languages intelligently
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true; // Enable interim results to see what's being captured
      recognition.lang = 'en-US'; // Start with English
      
      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const text = result[0].transcript;
        const isFinal = result.isFinal;
        
        if (isFinal) {
          console.log('📝 Final transcript:', text);
          console.log('🌐 Language used:', recognition.lang);
          
          setTranscript(text);
          setIsListening(false);
          
          // Determine which language to respond in
          const detectedLang = detectLanguageFromText(text);
          console.log('🔍 Detected response language:', detectedLang);
          
          processQuery(text, detectedLang);
        } else {
          console.log('📝 Interim:', text);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('❌ Recognition Error:', event.error);
        
        // Ignore 'aborted' errors (they're harmless)
        if (event.error === 'aborted') {
          console.log('ℹ️ Recognition aborted (harmless)');
          return;
        }
        
        // If no-speech error and we're on English, try Hindi
        if (event.error === 'no-speech' && recognition.lang === 'en-US' && attemptCountRef.current < 1) {
          console.log('🔄 No speech in English, trying Hindi...');
          attemptCountRef.current++;
          recognition.lang = 'hi-IN';
          setTimeout(() => {
            try {
              recognition.start();
            } catch(e) {
              console.log('Could not restart:', e);
              setIsListening(false);
            }
          }, 100);
        } else {
          setIsListening(false);
          attemptCountRef.current = 0;
        }
      };
      
      recognition.onend = () => {
        console.log('🎤 Recognition ended');
        setIsListening(false);
        attemptCountRef.current = 0;
      };
      
      recognitionRef.current = recognition;
    } else {
      console.error('❌ Speech recognition not supported');
      alert('Your browser does not support speech recognition. Please use Chrome, Edge, or Safari.');
    }
  }, []);

  // Smart language detection from text
  const detectLanguageFromText = (text) => {
    // Check for Devanagari script
    const hindiRegex = /[\u0900-\u097F]/;
    if (hindiRegex.test(text)) {
      return 'hi-IN';
    }
    
    // Check for common Hindi words (romanized)
    const lowerText = text.toLowerCase();
    const hindiWords = ['kya', 'hai', 'aap', 'tumhara', 'naam', 'school', 'ka', 'ki', 'address', 'number', 'fees', 'admission', 'kahan'];
    
    let hindiWordCount = 0;
    hindiWords.forEach(word => {
      if (lowerText.includes(word)) hindiWordCount++;
    });
    
    // If 2+ Hindi words detected, respond in Hindi
    if (hindiWordCount >= 2) {
      console.log('🇮🇳 Hindi keywords found:', hindiWordCount);
      return 'hi-IN';
    }
    
    // Default to English
    return 'en-US';
  };

  // Welcome message on mount
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log('📢 Available voices:', voices.map(v => `${v.name} (${v.lang})`));
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    setTimeout(() => {
      speakWelcome();
    }, 1500);
  }, []);

  const speakWelcome = () => {
    const msgEn = "Welcome to M K V V School! I am Siri. You can speak in English or Hindi. How may I help you today?";
    const msgHi = "एम के वी वी स्कूल में आपका स्वागत है! मैं सिरी हूं। आप अंग्रेजी या हिंदी में बोल सकते हैं।";
    
    // Cancel any existing speech first
    window.speechSynthesis.cancel();
    
    speak(msgEn, 'en-US', () => {
      setTimeout(() => {
        speak(msgHi, 'hi-IN', () => {
          setTimeout(() => {
            console.log('🎤 Welcome complete, starting listening...');
            startListening();
          }, 1000);
        });
      }, 500);
    });
  };

  const speak = (text, language, callback) => {
    console.log('🔊 Speaking in', language, ':', text.substring(0, 50) + '...');
    
    // Cancel any existing speech
    window.speechSynthesis.cancel();
    
    // Small delay to ensure cancellation completes
    setTimeout(() => {
      setIsSpeaking(true);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      
      if (language === 'hi-IN') {
        const voices = window.speechSynthesis.getVoices();
        const hindiVoice = voices.find(voice => 
          voice.lang.startsWith('hi') || 
          voice.lang === 'hi-IN' ||
          voice.name.includes('Hindi')
        );
        
        if (hindiVoice) {
          utterance.voice = hindiVoice;
          console.log('✅ Using Hindi voice:', hindiVoice.name);
        } else {
          console.warn('⚠️ No Hindi voice found, using default');
        }
      }
      
      utterance.onend = () => {
        console.log('✅ Speech finished');
        setIsSpeaking(false);
        
        if (callback) {
          callback();
        } else {
          setTimeout(() => {
            if (!isListening) {
              console.log('🔄 Restarting listening after speech...');
              startListening();
            }
          }, 1500);
        }
      };
      
      utterance.onerror = (event) => {
        console.error('❌ Speech error:', event.error);
        setIsSpeaking(false);
        
        // Don't restart if error was "interrupted" or "not-allowed"
        if (event.error === 'interrupted' || event.error === 'not-allowed') {
          console.log('ℹ️ Speech was interrupted (this is normal)');
          return;
        }
        
        setTimeout(() => {
          if (!isListening) {
            startListening();
          }
        }, 1000);
      };
      
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const startListening = () => {
    if (!isSpeaking && !isListening && recognitionRef.current) {
      try {
        // Stop any existing recognition first
        try {
          recognitionRef.current.stop();
        } catch(e) {
          // Ignore errors from stopping
        }
        
        // Wait a bit before starting new recognition
        setTimeout(() => {
          try {
            console.log('🎤 Starting recognition...');
            setIsListening(true);
            attemptCountRef.current = 0;
            
            // Start with English first
            recognitionRef.current.lang = 'en-US';
            recognitionRef.current.start();
          } catch (error) {
            console.error('Error starting recognition:', error);
            setIsListening(false);
          }
        }, 200);
        
      } catch (error) {
        console.error('Error in startListening:', error);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch(e) {
        console.log('Error stopping:', e);
      }
      setIsListening(false);
      attemptCountRef.current = 0;
    }
  };

  const processQuery = async (query, language) => {
    if (!query.trim()) return;

    console.log('🔍 Processing query:', query, 'in', language);
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          language: language
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const closingEn = " Thank you! Anything else you want to know?";
        const closingHi = " धन्यवाद! क्या आप कुछ और जानना चाहते हैं?";
        
        const finalResponse = data.response + (language === 'hi-IN' ? closingHi : closingEn);
        
        setResponse(finalResponse);
        setChatHistory(prev => [...prev, { 
          query, 
          response: finalResponse, 
          timestamp: new Date(),
          language: language
        }]);

        setTimeout(() => {
          console.log('🔊 Speaking response in:', language);
          speak(finalResponse, language);
        }, 500);
      } else {
        throw new Error(data.error || 'Unknown error');
      }

    } catch (error) {
      console.error('❌ Error:', error);
      
      const botResponse = language === 'hi-IN'
        ? "क्षमा करें, कुछ तकनीकी समस्या है। कृपया स्कूल ऑफिस से संपर्क करें: 0731-3559070"
        : "I'm sorry, there's a technical issue. Please contact school office at 0731-3559070";
      
      setResponse(botResponse);
      speak(botResponse, language);
    } finally {
      setIsLoading(false);
    }
  };

  const stopSpeaking = () => {
    console.log('⏹️ Stopping speech...');
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const clearHistory = () => {
    setChatHistory([]);
    setTranscript('');
    setResponse('');
  };

  const handleQuickQuestion = (question, lang) => {
    setTranscript(question);
    processQuery(question, lang);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center">
                <svg className="w-10 h-10 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">MKVV School</h1>
                <p className="text-blue-100 text-sm">AI Voice Assistant - Bilingual (English & हिंदी)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Assistant Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-8">
          <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            
            {/* Left: Avatar & Controls */}
            <div className="p-8 lg:p-12">
              <div className="flex flex-col items-center gap-8">
                
                {/* Avatar */}
                <div className="relative">
                  <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isListening 
                      ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-2xl shadow-green-500/50 scale-110 animate-pulse' 
                      : isSpeaking 
                        ? 'bg-gradient-to-br from-blue-400 to-indigo-500 shadow-2xl shadow-blue-500/50 scale-110' 
                        : 'bg-gradient-to-br from-gray-400 to-gray-500 shadow-xl'
                  }`}>
                    <span className="text-8xl">{isListening ? '🎤' : isSpeaking ? '💬' : '🤖'}</span>
                  </div>
                  
                  {/* Status Badge */}
                  <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-6 py-2 rounded-full text-white font-semibold text-sm shadow-lg ${
                    isListening 
                      ? 'bg-green-500' 
                      : isSpeaking 
                        ? 'bg-blue-500' 
                        : isLoading 
                          ? 'bg-yellow-500' 
                          : 'bg-gray-500'
                  }`}>
                    {isListening ? '🎤 Listening...' : isSpeaking ? '💬 Speaking...' : isLoading ? '⏳ Processing...' : '✅ Ready'}
                  </div>
                </div>

                {/* Info Badge */}
                <div className="text-center bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-3 rounded-xl">
                  <p className="text-sm font-semibold text-gray-700">
                    🌐 Speak in <span className="text-blue-600">English</span> or <span className="text-orange-600">हिंदी</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">I'll automatically understand and respond!</p>
                </div>

                {/* Control Buttons */}
                <div className="flex gap-4">
                  {!isListening && !isSpeaking && (
                    <button 
                      onClick={startListening} 
                      className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center gap-2"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/>
                      </svg>
                      Start Listening
                    </button>
                  )}
                  
                  {isListening && (
                    <button 
                      onClick={stopListening} 
                      className="px-8 py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center gap-2"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"/>
                      </svg>
                      Stop
                    </button>
                  )}

                  {isSpeaking && (
                    <button 
                      onClick={stopSpeaking} 
                      className="px-8 py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center gap-2"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"/>
                      </svg>
                      Stop Speaking
                    </button>
                  )}
                </div>

                {/* Quick Questions */}
                <div className="w-full">
                  <h3 className="font-bold text-gray-800 mb-4 text-center">Quick Questions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleQuickQuestion('what is the school address', 'en-US')} 
                      className="px-4 py-3 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-indigo-100 text-sm font-medium transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                    >
                      📍 Address
                    </button>
                    <button 
                      onClick={() => handleQuickQuestion('स्कूल का पता क्या है', 'hi-IN')} 
                      className="px-4 py-3 bg-gradient-to-br from-orange-50 to-amber-50 text-orange-700 rounded-xl hover:from-orange-100 hover:to-amber-100 text-sm font-medium transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                    >
                      📍 पता
                    </button>
                    <button 
                      onClick={() => handleQuickQuestion('admission process', 'en-US')} 
                      className="px-4 py-3 bg-gradient-to-br from-purple-50 to-pink-50 text-purple-700 rounded-xl hover:from-purple-100 hover:to-pink-100 text-sm font-medium transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                    >
                      📝 Admission
                    </button>
                    <button 
                      onClick={() => handleQuickQuestion('फीस कितनी है', 'hi-IN')} 
                      className="px-4 py-3 bg-gradient-to-br from-green-50 to-emerald-50 text-green-700 rounded-xl hover:from-green-100 hover:to-emerald-100 text-sm font-medium transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
                    >
                      💰 फीस
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Response */}
            <div className="p-8 lg:p-12 bg-gradient-to-br from-gray-50 to-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Response</h2>
              
              {transcript && (
                <div className="p-5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl mb-6 shadow-lg">
                  <p className="font-semibold text-sm mb-2 opacity-90">You asked:</p>
                  <p className="text-lg">{transcript}</p>
                </div>
              )}
              
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-gray-500 font-medium">Processing your query...</p>
                </div>
              )}

              {!isLoading && response ? (
                <div className="space-y-6">
                  <div className="p-6 bg-white rounded-2xl shadow-lg border-l-4 border-green-500">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-line">{response}</p>
                  </div>
                  
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <p className="text-sm font-bold text-gray-700 mb-4">Quick Actions</p>
                    <div className="flex gap-3 flex-wrap">
                      <a 
                        href="tel:07313559070" 
                        className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 text-sm font-medium transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                        </svg>
                        Call Now
                      </a>
                      <a 
                        href="https://wa.me/918889920006" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 text-sm font-medium transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                        </svg>
                        WhatsApp
                      </a>
                      <a 
                        href="https://www.google.com/maps/search/?api=1&query=117+Kumhar+Khadi+Indore" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="px-5 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 text-sm font-medium transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                        </svg>
                        View Map
                      </a>
                    </div>
                  </div>
                </div>
              ) : !isLoading && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <svg className="w-24 h-24 mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-lg font-medium">Ask me anything in English or Hindi!</p>
                  <p className="text-sm mt-2">अंग्रेजी या हिंदी में कुछ भी पूछें!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Conversation History</h2>
              <button 
                onClick={clearHistory} 
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                Clear History
              </button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {chatHistory.slice().reverse().map((item, idx) => (
                <div key={idx} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className={`p-4 rounded-xl mb-3 ${
                    item.language === 'hi-IN' 
                      ? 'bg-gradient-to-r from-orange-50 to-amber-50' 
                      : 'bg-gradient-to-r from-blue-50 to-indigo-50'
                  }`}>
                    <p className={`text-xs font-bold mb-1 ${
                      item.language === 'hi-IN' ? 'text-orange-600' : 'text-blue-600'
                    }`}>
                      QUESTION {item.language === 'hi-IN' ? '(हिंदी)' : '(English)'}
                    </p>
                    <p className="text-gray-800">{item.query}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                    <p className="text-xs font-bold text-green-600 mb-1">ANSWER</p>
                    <p className="text-gray-800 whitespace-pre-line">{item.response}</p>
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

export default VoiceAssistant;