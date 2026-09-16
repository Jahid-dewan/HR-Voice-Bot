import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Sliders,
  History,
  AlertCircle,
  Volume2,
  Mic,
} from 'lucide-react';
import {
  VoiceState,
  VoiceSettings,
  PersonaType,
  PersonaConfig,
  MessageItem,
} from './types';
import { OrbVisualizer } from './components/OrbVisualizer';
import { VoiceControls } from './components/VoiceControls';
import { LiveTranscript } from './components/LiveTranscript';
import { SamplePrompts } from './components/SamplePrompts';
import { ConversationHistory } from './components/ConversationHistory';
import { SettingsModal } from './components/SettingsModal';
import { TextInputModal } from './components/TextInputModal';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { useVoiceSynthesis } from './hooks/useVoiceSynthesis';
import { playChime } from './utils/audioFeedback';

const PERSONAS: Record<PersonaType, PersonaConfig> = {
  natural: {
    id: 'natural',
    name: 'Nova',
    tagline: 'Warm, natural conversational companion',
    description: 'Balanced cadence with empathetic and conversational responses.',
    defaultPitch: 1.0,
    defaultRate: 1.05,
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.4)',
  },
  concise: {
    id: 'concise',
    name: 'Atlas',
    tagline: 'Quick, ultra-direct and punchy',
    description: 'Fast, minimal answers without filler words.',
    defaultPitch: 1.05,
    defaultRate: 1.2,
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
  },
  enthusiastic: {
    id: 'enthusiastic',
    name: 'Lyra',
    tagline: 'Lively, curious, and energetic',
    description: 'Expressive tone with dynamic intonation and cheerful curiosity.',
    defaultPitch: 1.15,
    defaultRate: 1.1,
    accentColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.4)',
  },
  calm: {
    id: 'calm',
    name: 'Zenith',
    tagline: 'Gentle, soothing, and reflective',
    description: 'Relaxed tempo with mindful and tranquil explanations.',
    defaultPitch: 0.9,
    defaultRate: 0.95,
    accentColor: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.4)',
  },
  scholarly: {
    id: 'scholarly',
    name: 'Socrates',
    tagline: 'Insightful, articulate, and profound',
    description: 'Rich vocabulary with structured and intellectually stimulating thought.',
    defaultPitch: 0.95,
    defaultRate: 1.0,
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.4)',
  },
};

export default function App() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [userQuery, setUserQuery] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Modals
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTextInputOpen, setIsTextInputOpen] = useState(false);

  // Settings
  const [settings, setSettings] = useState<VoiceSettings>({
    persona: 'natural',
    visualizerMode: 'orb',
    continuousMode: false,
    soundEffects: true,
    selectedVoiceURI: null,
    pitch: PERSONAS.natural.defaultPitch,
    rate: PERSONAS.natural.defaultRate,
  });

  const activePersona = PERSONAS[settings.persona];
  const pendingContinuousRef = useRef(false);

  // Speech Synthesis Hook
  const {
    voices,
    isSpeaking,
    currentWordCharIndex,
    speakingIntensity,
    speak,
    stop: stopSpeaking,
  } = useVoiceSynthesis();

  // Send query to Gemini Server API (supports audio recording or text prompt)
  const processVoicePayload = useCallback(
    async (payload: { audio?: { data: string; mimeType: string }; text?: string }) => {
      setVoiceState('processing');
      setErrorNotice(null);

      if (payload.text) {
        setUserQuery(payload.text);
      } else {
        setUserQuery('Processing your voice...');
      }
      setAssistantResponse('');

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio: payload.audio,
            message: payload.text,
            history: messages,
            persona: settings.persona,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned ${response.status}`);
        }

        const data = await response.json();
        const spokenAnswer = data.text || 'I have no answer for that.';
        const actualUserSaid = data.userSaid || payload.text || 'Voice command';

        setUserQuery(actualUserSaid);

        // Add user turn and assistant response to conversation history
        const userMessage: MessageItem = {
          id: 'msg_' + Date.now(),
          sender: 'user',
          text: actualUserSaid,
          timestamp: Date.now(),
        };

        const assistantMsg: MessageItem = {
          id: 'msg_' + (Date.now() + 1),
          sender: 'assistant',
          text: spokenAnswer,
          timestamp: Date.now() + 1,
          personaUsed: activePersona.name,
        };

        setMessages((prev) => [...prev, userMessage, assistantMsg]);
        setAssistantResponse(spokenAnswer);
        setVoiceState('speaking');

        if (settings.soundEffects) {
          playChime('speechStart');
        }

        // Start real-time audio playback
        speak(spokenAnswer, {
          voiceURI: settings.selectedVoiceURI,
          pitch: settings.pitch,
          rate: settings.rate,
          onEnd: () => {
            setVoiceState('idle');
            // If in continuous listening mode, auto-listen for next prompt
            if (settings.continuousMode) {
              pendingContinuousRef.current = true;
            }
          },
          onError: (err) => {
            console.warn('Speech synthesis playback error', err);
            setVoiceState('idle');
          },
        });
      } catch (err: any) {
        console.error('Error in processVoicePayload:', err);
        setErrorNotice(err?.message || 'Failed to process voice query');
        setVoiceState('error');
        if (settings.soundEffects) {
          playChime('error');
        }
        setTimeout(() => {
          setVoiceState('idle');
        }, 4000);
      }
    },
    [activePersona.name, messages, settings, speak]
  );

  const processQuery = useCallback(
    (queryText: string) => {
      if (!queryText || !queryText.trim()) return;
      processVoicePayload({ text: queryText.trim() });
    },
    [processVoicePayload]
  );

  // Speech Recognition & MediaRecorder Hook
  const {
    isListening,
    interimTranscript,
    micVolume,
    error: micError,
    hasMicPermission,
    startListening: startVoiceRecognition,
    stopListening: stopVoiceRecognition,
  } = useVoiceRecognition({
    onRecordingComplete: (payload) => {
      if (settings.soundEffects) {
        playChime('listenEnd');
      }
      processVoicePayload(payload);
    },
  });

  // Keep voiceState in sync with listening / speaking
  useEffect(() => {
    if (isListening && voiceState !== 'listening') {
      setVoiceState('listening');
    } else if (!isListening && voiceState === 'listening') {
      // Transitioning out of listening
      if (!isSpeaking) {
        setVoiceState('idle');
      }
    }
  }, [isListening, isSpeaking, voiceState]);

  useEffect(() => {
    if (isSpeaking && voiceState !== 'speaking') {
      setVoiceState('speaking');
    } else if (!isSpeaking && voiceState === 'speaking') {
      setVoiceState('idle');
    }
  }, [isSpeaking, voiceState]);

  // Handle auto-continuous resumption
  useEffect(() => {
    if (pendingContinuousRef.current && voiceState === 'idle' && settings.continuousMode) {
      pendingContinuousRef.current = false;
      const timer = setTimeout(() => {
        handleStartListening();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [voiceState, settings.continuousMode]);

  // Display microphone errors if any
  useEffect(() => {
    if (micError) {
      setErrorNotice(micError);
    }
  }, [micError]);

  const handleStartListening = () => {
    // If speaking, stop playback first
    if (isSpeaking) {
      stopSpeaking();
    }
    setErrorNotice(null);
    if (settings.soundEffects) {
      playChime('listenStart');
    }
    startVoiceRecognition();
  };

  const handleStopListening = () => {
    stopVoiceRecognition();
  };

  const handleInterrupt = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
    if (isListening) {
      stopVoiceRecognition();
    }
    setVoiceState('idle');
  };

  const handleReplayCurrent = () => {
    if (!assistantResponse) return;
    setVoiceState('speaking');
    if (settings.soundEffects) {
      playChime('speechStart');
    }
    speak(assistantResponse, {
      voiceURI: settings.selectedVoiceURI,
      pitch: settings.pitch,
      rate: settings.rate,
      onEnd: () => setVoiceState('idle'),
    });
  };

  const handleReplayHistoryItem = (text: string) => {
    setAssistantResponse(text);
    setVoiceState('speaking');
    if (settings.soundEffects) {
      playChime('speechStart');
    }
    speak(text, {
      voiceURI: settings.selectedVoiceURI,
      pitch: settings.pitch,
      rate: settings.rate,
      onEnd: () => setVoiceState('idle'),
    });
  };

  // Keyboard shortcut listener (Space to toggle voice, Esc to interrupt)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input or modal
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (voiceState === 'speaking') {
          handleInterrupt();
        } else if (voiceState === 'listening') {
          handleStopListening();
        } else if (voiceState === 'idle') {
          handleStartListening();
        }
      } else if (e.code === 'Escape') {
        handleInterrupt();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [voiceState]);

  // Visualizer audio reactive intensity
  const visualIntensity =
    voiceState === 'listening'
      ? micVolume
      : voiceState === 'speaking'
      ? speakingIntensity
      : voiceState === 'processing'
      ? 0.4
      : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background ambient radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-900/20 via-sky-950/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Header Navigation */}
      <header className="w-full max-w-6xl mx-auto px-4 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-400 p-0.5 shadow-md shadow-indigo-950/50 flex items-center justify-center">
            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-sky-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-zinc-100">Voice AI</h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Gemini 3.6 Flash
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Real-time voice dialog with animated feedback</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Persona selector pill */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-all shadow-sm"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: activePersona.accentColor }}
            />
            <span>Persona: {activePersona.name}</span>
          </button>

          {/* Reel / History button */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            title="Conversation History"
            className="relative p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
          >
            <History className="w-4 h-4" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                {messages.length}
              </span>
            )}
          </button>

          {/* Settings button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
            className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-4 relative z-10">
        {/* Error notification banner */}
        <AnimatePresence>
          {errorNotice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 px-4 py-2.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2 max-w-lg shadow-lg"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="flex-1">{errorNotice}</span>
              <button
                onClick={() => setErrorNotice(null)}
                className="text-rose-400 hover:text-rose-200 text-xs font-semibold px-1"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Browser microphone permission prompt if denied */}
        {hasMicPermission === false && (
          <div className="mb-4 px-4 py-2.5 rounded-2xl bg-amber-950/70 border border-amber-800 text-amber-200 text-xs flex items-center justify-between gap-3 max-w-lg shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Microphone access was blocked. Enable microphone permissions in your browser bar to speak.</span>
            </div>
            <button
              onClick={handleStartListening}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold shrink-0 transition-colors"
            >
              Retry Mic
            </button>
          </div>
        )}

        {/* Dynamic Animated Visual Feedback Stage */}
        <OrbVisualizer
          state={voiceState}
          mode={settings.visualizerMode}
          audioIntensity={visualIntensity}
          persona={activePersona}
          onOrbClick={() => {
            if (voiceState === 'idle') handleStartListening();
            else if (voiceState === 'speaking') handleInterrupt();
            else if (voiceState === 'listening') handleStopListening();
          }}
        />

        {/* Live Transcript and Spoken Word Subtitles */}
        <div className="w-full mt-2 min-h-[100px] flex items-center justify-center">
          <LiveTranscript
            state={voiceState}
            userQuery={userQuery}
            interimUserQuery={interimTranscript}
            assistantResponse={assistantResponse}
            currentWordCharIndex={currentWordCharIndex}
            onReplay={handleReplayCurrent}
          />
        </div>
      </main>

      {/* Bottom Section: Controls and Suggestions */}
      <footer className="w-full max-w-4xl mx-auto pb-6 pt-2 z-20 flex flex-col gap-4">
        {/* Quick Sample Prompts to Inspire Questions */}
        {voiceState === 'idle' && (
          <SamplePrompts
            onSelectPrompt={(text) => processQuery(text)}
            disabled={voiceState !== 'idle'}
          />
        )}

        {/* Primary Tactile Controls */}
        <VoiceControls
          state={voiceState}
          isContinuous={settings.continuousMode}
          onToggleContinuous={() =>
            setSettings((s) => ({ ...s, continuousMode: !s.continuousMode }))
          }
          onStartListening={handleStartListening}
          onStopListening={handleStopListening}
          onInterrupt={handleInterrupt}
          onOpenTextInput={() => setIsTextInputOpen(true)}
          soundEffects={settings.soundEffects}
          onToggleSoundEffects={() =>
            setSettings((s) => ({ ...s, soundEffects: !s.soundEffects }))
          }
        />
      </footer>

      {/* Modals & Drawers */}
      <ConversationHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        messages={messages}
        onClearHistory={() => setMessages([])}
        onReplayMessage={handleReplayHistoryItem}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings((s) => ({ ...s, ...newSettings }))}
        availableVoices={voices}
        personas={PERSONAS}
      />

      <TextInputModal
        isOpen={isTextInputOpen}
        onClose={() => setIsTextInputOpen(false)}
        onSubmit={(text) => processQuery(text)}
      />
    </div>
  );
}
