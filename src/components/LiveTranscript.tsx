import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, User, Sparkles, Copy, Check } from 'lucide-react';
import { VoiceState } from '../types';

interface LiveTranscriptProps {
  state: VoiceState;
  userQuery: string;
  interimUserQuery: string;
  assistantResponse: string;
  currentWordCharIndex: number;
  onReplay?: () => void;
}

export const LiveTranscript: React.FC<LiveTranscriptProps> = ({
  state,
  userQuery,
  interimUserQuery,
  assistantResponse,
  currentWordCharIndex,
  onReplay,
}) => {
  const [copied, setCopied] = React.useState(false);

  const displayUserText = interimUserQuery || userQuery;

  const handleCopy = () => {
    if (!assistantResponse) return;
    navigator.clipboard.writeText(assistantResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render assistant response with active highlighted spoken word
  const renderSpokenText = () => {
    if (!assistantResponse) return null;

    if (state !== 'speaking' || currentWordCharIndex < 0) {
      return <p className="text-zinc-100 text-lg leading-relaxed font-normal">{assistantResponse}</p>;
    }

    // Split text around current character index
    const before = assistantResponse.slice(0, currentWordCharIndex);
    const rest = assistantResponse.slice(currentWordCharIndex);
    const spaceIndex = rest.indexOf(' ');
    const currentWord = spaceIndex === -1 ? rest : rest.slice(0, spaceIndex);
    const after = spaceIndex === -1 ? '' : rest.slice(spaceIndex);

    return (
      <p className="text-zinc-300 text-lg leading-relaxed font-normal">
        <span className="text-zinc-400">{before}</span>
        <span className="text-sky-300 font-semibold bg-sky-500/20 px-1 py-0.5 rounded shadow-sm">
          {currentWord}
        </span>
        <span className="text-zinc-100">{after}</span>
      </p>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <AnimatePresence mode="wait">
        {/* Active User Voice Prompt Display */}
        {displayUserText && (
          <motion.div
            key="user-transcript"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-3 p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-md flex items-start gap-3 shadow-lg"
          >
            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 mt-0.5">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wider text-zinc-400 font-medium mb-1">
                {state === 'listening' ? 'Listening to voice...' : 'You asked'}
              </div>
              <p className={`text-base font-medium ${state === 'listening' ? 'text-rose-300 animate-pulse' : 'text-zinc-200'}`}>
                {displayUserText}
              </p>
            </div>
          </motion.div>
        )}

        {/* Assistant Response Subtitles / Live Readout */}
        {assistantResponse && (
          <motion.div
            key="assistant-transcript"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="p-5 rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-zinc-700/60 backdrop-blur-lg shadow-xl relative"
          >
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-zinc-800/60">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Audio Response</span>
              </div>
              <div className="flex items-center gap-1">
                {onReplay && (
                  <button
                    onClick={onReplay}
                    title="Replay Voice Audio"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  title="Copy Text"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {renderSpokenText()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
