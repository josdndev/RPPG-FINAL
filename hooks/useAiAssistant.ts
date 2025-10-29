import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

// SpeechRecognition setup
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export type AssistantStatus = 'idle' | 'speaking' | 'listening' | 'processing' | 'error';

interface UseAiAssistantProps {
  onStartAnalysis: () => void;
}

export function useAiAssistant({ onStartAnalysis }: UseAiAssistantProps) {
  const [status, setStatus] = useState<AssistantStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const aiRef = useRef<GoogleGenAI | null>(null);
  const recognitionRef = useRef<any | null>(null);
  const onStartAnalysisRef = useRef(onStartAnalysis);

  useEffect(() => {
    onStartAnalysisRef.current = onStartAnalysis;
  }, [onStartAnalysis]);
  
  useEffect(() => {
     if (!process.env.API_KEY) {
        console.error("API_KEY environment variable not set.");
        setError("AI Assistant is not configured. API key is missing.");
        setStatus('error');
        return;
    }
    aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });

    if (!SpeechRecognition || !window.speechSynthesis) {
        setIsSupported(false);
        setStatus('error');
        setError('AI assistant is not supported on this browser.')
    }
  }, []);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!window.speechSynthesis) {
            return reject('Speech synthesis not supported.');
        }
        // Cancel any previous speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => resolve();
        utterance.onerror = (e) => reject(`Speech synthesis error: ${e.error}`);
        window.speechSynthesis.speak(utterance);
    });
  }, []);

  const listen = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!SpeechRecognition) {
        return reject('Speech recognition not supported.');
      }

      let attempts = 0;
      const maxAttempts = 3;

      const tryListen = () => {
        attempts++;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = navigator.language;

        let resolved = false;
        let lastError: string | null = null;

        recognition.onresult = (event: any) => {
          if (resolved) return;
          resolved = true;
          recognitionRef.current = null;
          resolve(event.results[0][0].transcript);
        };

        recognition.onerror = (event: any) => {
          if (resolved) return;
          lastError = event.error;
          console.warn(`Speech recognition attempt ${attempts} failed with error: ${lastError}`);
          
          // If it's not a network error, fail immediately.
          if (lastError !== 'network') {
            resolved = true;
            recognitionRef.current = null;
            reject(`Speech recognition error: ${lastError}`);
          }
          // If it IS a network error, we'll let onend decide whether to retry.
        };

        recognition.onend = () => {
          if (resolved) return;
          
          // If onend is called and we had a network error, and we have attempts left, retry.
          if (lastError === 'network' && attempts < maxAttempts) {
            console.log(`Retrying speech recognition due to network error (attempt ${attempts + 1})...`);
            // Exponential backoff: 300ms, 600ms, 1200ms
            setTimeout(tryListen, 300 * Math.pow(2, attempts - 1));
            return;
          }
          
          // Otherwise, we fail. This handles the case of no speech, or max retries for network error.
          resolved = true;
          recognitionRef.current = null;
          if (lastError === 'network') {
             reject('Could not connect to the speech recognition service. Please check your internet connection or try a different browser like Google Chrome for better compatibility.');
          } else if (lastError) {
             reject(`Speech recognition error: ${lastError}`);
          } else {
             reject('No speech detected.');
          }
        };

        recognition.start();
      };

      tryListen();
    });
  }, []);
  
  const interpretResponse = useCallback(async (userResponse: string): Promise<boolean> => {
    if (!aiRef.current) {
        throw new Error("AI client not initialized");
    }
    try {
        const prompt = `A user was asked how they are feeling. They responded: "${userResponse}". Based on this response, do they feel physically unwell, sick, or bad? Answer with only "yes" or "no".`;
        
        const response = await aiRef.current.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const decision = response.text.trim().toLowerCase();
        console.log(`AI Interpretation: "${userResponse}" -> ${decision}`);
        return decision.includes('yes');
    } catch (e) {
        console.error("Error interpreting response with Gemini:", e);
        throw new Error("Could not understand the response.");
    }
  }, []);

  const startConversation = useCallback(async () => {
    if (status !== 'idle' || !isSupported) return;

    setError(null);
    setTranscript('');
    
    try {
        setStatus('speaking');
        await speak("Hello. How are you feeling today?");
        
        setStatus('listening');
        const userResponse = await listen();
        setTranscript(userResponse);
        
        setStatus('processing');
        const feelsBad = await interpretResponse(userResponse);

        if (feelsBad) {
            setStatus('speaking');
            await speak("I'm sorry to hear that. Let's start the analysis for you.");
            onStartAnalysisRef.current();
        } else {
            setStatus('speaking');
            await speak("That's good to hear. I'm here if you need me.");
        }
        setStatus('idle');
    } catch (err) {
        const errorMessage = (err as any)?.toString() ?? "An unknown error occurred.";
        console.error("Conversation error:", errorMessage);
        
        // Don't show an error for a simple timeout, just reset.
        if (!errorMessage.includes('No speech detected')) {
             setError(errorMessage);
             setStatus('error');
             speak("Sorry, I ran into a problem.").catch(console.error);
        } else {
             setStatus('idle');
        }

    } finally {
        if(recognitionRef.current) {
            recognitionRef.current.abort();
            recognitionRef.current = null;
        }
    }
  }, [status, isSupported, speak, listen, interpretResponse]);

  return { status, transcript, error, isSupported, startConversation };
}