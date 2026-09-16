import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, Trash2, Clock, User, Bot } from 'lucide-react';
import { MessageItem } from '../types';

interface ConversationHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  messages: MessageItem[];
  onClearHistory: () => void;
  onReplayMessage: (text: string) => void;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  isOpen,
  onClose,
  messages,
  onClearHistory,
  onReplayMessage,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-zinc-950 border-l border-zinc-800/80 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-zinc-100">Conversation Reel</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {messages.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={onClearHistory}
                    title="Clear history"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                  <Bot className="w-10 h-10 mb-3 text-zinc-600 stroke-[1.5]" />
                  <p className="text-sm font-medium text-zinc-400">No voice conversations yet</p>
                  <p className="text-xs mt-1 text-zinc-600">
                    Your questions and real-time audio responses will be saved here.
                  </p>
                </div>
              ) : (
                messages.map((item) => {
                  const isUser = item.sender === 'user';
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border ${
                        isUser
                          ? 'bg-zinc-900/50 border-zinc-800/80 ml-6'
                          : 'bg-zinc-900/90 border-zinc-800 mr-6 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {isUser ? (
                            <User className="w-3.5 h-3.5 text-zinc-400" />
                          ) : (
                            <Bot className="w-3.5 h-3.5 text-sky-400" />
                          )}
                          <span className="text-xs font-semibold text-zinc-300">
                            {isUser ? 'You' : 'Assistant'}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-200 leading-relaxed">{item.text}</p>

                      {!isUser && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-end">
                          <button
                            onClick={() => onReplayMessage(item.text)}
                            className="px-2 py-1 rounded-md text-[11px] font-medium text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 flex items-center gap-1 transition-colors"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>Replay Audio</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
