export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export type VisualizerMode = 'orb' | 'waves' | 'rings';

export type PersonaType = 'natural' | 'concise' | 'enthusiastic' | 'calm' | 'scholarly';

export interface PersonaConfig {
  id: PersonaType;
  name: string;
  tagline: string;
  description: string;
  defaultPitch: number;
  defaultRate: number;
  accentColor: string;
  glowColor: string;
}

export interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  personaUsed?: string;
}

export interface VoiceSettings {
  persona: PersonaType;
  visualizerMode: VisualizerMode;
  continuousMode: boolean;
  soundEffects: boolean;
  selectedVoiceURI: string | null;
  pitch: number;
  rate: number;
}
