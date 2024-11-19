import { useRef, useState } from 'react';
import { AISession } from '../window';

export const useAI = () => {
  const aiSession = useRef<AISession | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChatText, setAiChatText] = useState<string | null>(null);

  const initializeAI = async () => {
    if (!window.ai || !window.ai.languageModel) { 
      console.log("AI not supported");
      return;
    }
    const session = await window.ai.languageModel.create();
    console.log(session);
    aiSession.current = session;
  };

  const executeAIChat = async (userPrompt: string, prompt: string, onResult: (result: string) => void) => {
    setAiLoading(true);
    const result = await aiSession.current?.prompt(prompt + "\n\nUser: " + userPrompt + "\n\nAI:");
    if (result) {
      onResult(result);
    }
    setAiChatText("");
    setAiLoading(false);
  };

  return {
    aiLoading,
    aiChatText,
    setAiChatText,
    initializeAI,
    executeAIChat
  };
}; 