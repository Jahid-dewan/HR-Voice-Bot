import React from 'react';
import { Sparkles, Compass, Lightbulb, Atom, Music, Brain } from 'lucide-react';

interface SamplePromptsProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

const SAMPLE_QUESTIONS = [
  {
    icon: Atom,
    text: "Explain quantum entanglement in 2 sentences",
    category: "Science",
  },
  {
    icon: Compass,
    text: "What caused the Northern Lights?",
    category: "Nature",
  },
  {
    icon: Brain,
    text: "Why do humans dream when sleeping?",
    category: "Curiosity",
  },
  {
    icon: Music,
    text: "Recite a short, inspiring poetic line about stars",
    category: "Poetry",
  },
  {
    icon: Lightbulb,
    text: "What is a fun historical paradox?",
    category: "Trivia",
  },
];

export const SamplePrompts: React.FC<SamplePromptsProps> = ({ onSelectPrompt, disabled }) => {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-2">
      <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-zinc-400 font-medium justify-center">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>Try asking</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {SAMPLE_QUESTIONS.map((q, idx) => {
          const Icon = q.icon;
          return (
            <button
              key={idx}
              disabled={disabled}
              onClick={() => onSelectPrompt(q.text)}
              className="px-3.5 py-2 rounded-xl text-xs font-normal text-zinc-300 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/70 hover:border-zinc-700 transition-all flex items-center gap-2 group text-left disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:scale-[1.02]"
            >
              <Icon className="w-3.5 h-3.5 text-indigo-400 group-hover:text-sky-400 transition-colors shrink-0" />
              <span>{q.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
