import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sliders, Volume2, Sparkles, Activity, Eye } from 'lucide-react';
import { VoiceSettings, VisualizerMode, PersonaType, PersonaConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onUpdateSettings: (newSettings: Partial<VoiceSettings>) => void;
  availableVoices: SpeechSynthesisVoice[];
  personas: Record<PersonaType, PersonaConfig>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  availableVoices,
  personas,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative z-10 w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-zinc-100">Audio & Visualizer Settings</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Persona selection */}
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI Voice Personality</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(Object.keys(personas) as PersonaType[]).map((pKey) => {
                    const p = personas[pKey];
                    const isSelected = settings.persona === pKey;
                    return (
                      <button
                        key={pKey}
                        onClick={() => {
                          onUpdateSettings({
                            persona: pKey,
                            pitch: p.defaultPitch,
                            rate: p.defaultRate,
                          });
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/50'
                            : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold ${isSelected ? 'text-indigo-300' : 'text-zinc-200'}`}>
                            {p.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{p.tagline}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visualizer Mode selection */}
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span>Visual Feedback Animation</span>
                </label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { id: 'orb', label: 'Luminous Orb', desc: 'Glowing harmonic core' },
                    { id: 'waves', label: 'Sound Waves', desc: 'Multi-layer ribbon' },
                    { id: 'rings', label: 'Acoustic Rings', desc: 'Expanding ripples' },
                  ].map((item) => {
                    const isSelected = settings.visualizerMode === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onUpdateSettings({ visualizerMode: item.id as VisualizerMode })}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-sky-950/40 border-sky-500/80 ring-1 ring-sky-500/50'
                            : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <span className={`text-xs font-semibold block ${isSelected ? 'text-sky-300' : 'text-zinc-200'}`}>
                          {item.label}
                        </span>
                        <span className="text-[10px] text-zinc-500 leading-tight block mt-0.5">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Speech Voice synthesis selection */}
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>TTS Voice Engine</span>
                </label>
                <select
                  value={settings.selectedVoiceURI || ''}
                  onChange={(e) => onUpdateSettings({ selectedVoiceURI: e.target.value || null })}
                  className="w-full mt-2 px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Default Natural Voice</option>
                  {availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pitch and Speed sliders */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400 font-medium">Voice Pitch</span>
                    <span className="text-zinc-300 font-mono">{settings.pitch.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.5"
                    step="0.1"
                    value={settings.pitch}
                    onChange={(e) => onUpdateSettings({ pitch: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400 font-medium">Voice Speed</span>
                    <span className="text-zinc-300 font-mono">{settings.rate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.5"
                    step="0.05"
                    value={settings.rate}
                    onChange={(e) => onUpdateSettings({ rate: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
              >
                Apply & Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
