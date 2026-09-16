import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeakOptions {
  voiceURI?: string | null;
  pitch?: number;
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export function useVoiceSynthesis() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentWordCharIndex, setCurrentWordCharIndex] = useState<number>(-1);
  const [speakingIntensity, setSpeakingIntensity] = useState<number>(0);
  const [isSupported, setIsSupported] = useState(true);

  const animFrameRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false);
  const targetIntensityRef = useRef(0);
  const currentIntensityRef = useRef(0);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load browser voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (allVoices.length > 0) {
        setVoices(allVoices);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Intensity smoothing animation loop for visualizer
  const runIntensityLoop = useCallback(() => {
    if (!isSpeakingRef.current) {
      setSpeakingIntensity(0);
      return;
    }

    // Natural rhythmic decay with randomized speech fluctuations
    currentIntensityRef.current += (targetIntensityRef.current - currentIntensityRef.current) * 0.2;
    targetIntensityRef.current *= 0.88;

    // Base rhythmic modulation to avoid static zero during continuous utterance
    const time = Date.now() / 150;
    const rhythmicBase = (Math.sin(time * 3) * 0.15 + 0.35);
    const combined = Math.min(1, Math.max(0.1, currentIntensityRef.current + rhythmicBase * 0.5));

    setSpeakingIntensity(combined);
    animFrameRef.current = requestAnimationFrame(runIntensityLoop);
  }, []);

  const stop = useCallback(() => {
    isSpeakingRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setCurrentWordCharIndex(-1);
    setSpeakingIntensity(0);
  }, []);

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      stop();

      if (!text || !text.trim()) return;

      const utterance = new SpeechSynthesisUtterance(text);
      currentUtteranceRef.current = utterance;
      
      // Select voice
      const availableVoices = window.speechSynthesis.getVoices();
      if (options.voiceURI) {
        const found = availableVoices.find((v) => v.voiceURI === options.voiceURI);
        if (found) utterance.voice = found;
      } else {
        // Prefer natural English voices (Google US English, Samantha, Daniel, Natural, etc.)
        const preferred = availableVoices.find(
          (v) =>
            (v.name.includes('Natural') ||
             v.name.includes('Google') ||
             v.name.includes('Samantha') ||
             v.name.includes('Daniel') ||
             v.name.includes('Karen')) &&
            v.lang.startsWith('en')
        ) || availableVoices.find((v) => v.lang.startsWith('en')) || availableVoices[0];
        if (preferred) utterance.voice = preferred;
      }

      utterance.pitch = options.pitch ?? 1.0;
      utterance.rate = options.rate ?? 1.05;

      utterance.onstart = () => {
        isSpeakingRef.current = true;
        setIsSpeaking(true);
        targetIntensityRef.current = 0.85;
        runIntensityLoop();
        options.onStart?.();
      };

      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        if (event.name === 'word') {
          setCurrentWordCharIndex(event.charIndex);
          targetIntensityRef.current = 0.7 + Math.random() * 0.3;
        }
      };

      utterance.onend = () => {
        isSpeakingRef.current = false;
        currentUtteranceRef.current = null;
        setIsSpeaking(false);
        setCurrentWordCharIndex(-1);
        setSpeakingIntensity(0);
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        options.onEnd?.();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis error', e);
        isSpeakingRef.current = false;
        currentUtteranceRef.current = null;
        setIsSpeaking(false);
        setCurrentWordCharIndex(-1);
        setSpeakingIntensity(0);
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        options.onError?.(e);
      };

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (speakErr) {
        console.warn('Failed to invoke window.speechSynthesis.speak:', speakErr);
        options.onError?.(speakErr);
      }
    },
    [runIntensityLoop, stop]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isSpeakingRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    voices,
    isSpeaking,
    currentWordCharIndex,
    speakingIntensity,
    isSupported,
    speak,
    stop,
  };
}
