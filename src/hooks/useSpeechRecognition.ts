import { useRef, useState } from 'react';
import { SpeechRecognition } from '../window';

export const useSpeechRecognition = (onTranscript: (transcript: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const recognition = useRef<SpeechRecognition | null>(null);

  const initialize = () => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;

      recognition.current.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    }
  };

  return {
    isListening,
    setIsListening,
    recognition,
    initialize
  };
}; 