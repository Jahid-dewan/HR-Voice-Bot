import React from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, Square, Loader2, Keyboard, Sparkles, VolumeX, Volume2 } from 'lucide-react';
import { VoiceState } from '../types';

interface VoiceControlsProps {
  state: VoiceState;
  isContinuous: boolean;
  onToggleContinuous: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onInterrupt: () => void;
  onOpenTextInput: () => void;
  soundEffects: boolean;
  onToggleSoundEffects: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  state,
  isContinuous,
  onToggleContinuous,
  onStartListening,
  onStopListening,
  onInterrupt,
  onOpenTextInput,
  soundEffects,
  onToggleSoundEffects,
}) => {
  const isListening = state === 'listening';
  const isProcessing = state === 'processing';
  const isSpeaking = state === 'speaking';

  const handlePrimaryClick = () => {
    if (isSpeaking) {
      onInterrupt();
    } else if (isListening) {
      onStopListening();
    } else if (isProcessing) {
      // cancel/interrupt
      onInterrupt();
    } else {
      onStartListening();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-4 px-4 select-none">
      {/* Primary Interaction Button with Visual Ripple Rings */}
      <div className="relative flex items-center justify-center">
        {/* Animated aura rings for listening/speaking */}
        {isListening && (
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-4 rounded-full bg-rose-500/30 blur-sm pointer-events-none"
          />
        )}
        {isSpeaking && (
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-3 rounded-full bg-sky-500/25 blur-sm pointer-events-none"
          />
        )}

        <button
          id="primary-voice-button"
          onClick={handlePrimaryClick}
          aria-label={
            isSpeaking
              ? 'Stop speaking'
              : isListening
              ? 'Stop listening'
              : isProcessing
              ? 'Processing...'
              : 'Start speaking'
          }
          className={`relative z-10 w-20 h-20 sm:w-22 sm:h-22 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-95 cursor-pointer ${
            isListening
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-900/60 ring-4 ring-rose-400/50'
              : isSpeaking
              ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-900/60 ring-4 ring-sky-400/50'
              : isProcessing
              ? 'bg-purple-600 text-white shadow-purple-900/60 cursor-wait'
              : 'bg-gradient-to-tr from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white shadow-indigo-950/70 hover:shadow-indigo-500/40 hover:scale-105'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : isSpeaking ? (
            <Square className="w-7 h-7 fill-white" />
          ) : isListening ? (
            <MicOff className="w-8 h-8 animate-pulse" />
          ) : (
            <Mic className="w-8 h-8" />
          )}

          <span className="text-[10px] font-semibold tracking-wider uppercase mt-1">
            {isSpeaking
              ? 'Stop'
              : isListening
              ? 'Done'
              : isProcessing
              ? 'Wait'
              : 'Speak'}
          </span>
        </button>
      </div>

      {/* Sub-label action hint */}
      <p className="text-xs text-zinc-400 font-medium text-center">
        {isSpeaking ? (
          <span className="text-sky-400">Assistant speaking • Tap to interrupt</span>
        ) : isListening ? (
          <span className="text-rose-400 font-medium">Listening... speak your command, then tap Done</span>
        ) : isProcessing ? (
          <span className="text-purple-400">Synthesizing audio response...</span>
        ) : (
          <span>Tap microphone or press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px]">Space</kbd> to ask anything</span>
        )}
      </p>

      {/* Auxiliary quick action strip */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onToggleContinuous}
          title={isContinuous ? 'Disable hands-free mode' : 'Enable hands-free continuous conversation'}
          className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all border ${
            isContinuous
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
              : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-300'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isContinuous ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
          <span>Hands-free</span>
        </button>

        <button
          onClick={onOpenTextInput}
          title="Type your question manually"
          className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-300 transition-all"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>Type prompt</span>
        </button>

        <button
          onClick={onToggleSoundEffects}
          title={soundEffects ? 'Sound effects enabled' : 'Sound effects muted'}
          className="p-1.5 rounded-full text-zinc-400 bg-zinc-800/60 border border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-300 transition-all"
        >
          {soundEffects ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
