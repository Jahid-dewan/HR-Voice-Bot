import { useState, useEffect, useRef, useCallback } from 'react';

export interface VoicePayload {
  audio?: {
    data: string;
    mimeType: string;
  };
  text?: string;
}

interface VoiceRecorderProps {
  onRecordingComplete: (payload: VoicePayload) => void;
}

export function useVoiceRecognition({ onRecordingComplete }: VoiceRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [micVolume, setMicVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const speechTranscriptRef = useRef('');

  // Determine best supported recording format
  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg',
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  };

  // Stop analyser and release microphone tracks
  const stopAudioCapture = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setMicVolume(0);
  }, []);

  // Stop listening and finalize recording
  const stopListening = useCallback(() => {
    if (!isListeningRef.current) return;
    isListeningRef.current = false;
    setIsListening(false);

    // Stop speech recognition if running
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    // Stop MediaRecorder and package audio
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        try {
          const mimeType = recorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          audioChunksRef.current = [];

          stopAudioCapture();

          const recognizedText = speechTranscriptRef.current.trim();

          // Convert blob to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = reader.result as string;
            onRecordingComplete({
              audio: {
                data: base64Data,
                mimeType,
              },
              text: recognizedText || undefined,
            });
            speechTranscriptRef.current = '';
            setInterimTranscript('');
          };
          reader.readAsDataURL(audioBlob);
        } catch (err) {
          console.error('Error processing audio recording blob:', err);
          stopAudioCapture();
          const recognizedText = speechTranscriptRef.current.trim();
          if (recognizedText) {
            onRecordingComplete({ text: recognizedText });
          }
        }
      };

      try {
        recorder.stop();
      } catch (e) {
        console.warn('Error stopping MediaRecorder:', e);
        stopAudioCapture();
      }
    } else {
      stopAudioCapture();
      const recognizedText = speechTranscriptRef.current.trim();
      if (recognizedText) {
        onRecordingComplete({ text: recognizedText });
      }
      speechTranscriptRef.current = '';
      setInterimTranscript('');
    }
  }, [onRecordingComplete, stopAudioCapture]);

  const startListening = useCallback(async () => {
    setError(null);
    speechTranscriptRef.current = '';
    setInterimTranscript('');
    audioChunksRef.current = [];

    // Ensure audio devices API is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Microphone input is not supported in this browser. You can type your command below.');
      return;
    }

    try {
      // 1. Request microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      micStreamRef.current = stream;
      setHasMicPermission(true);
      isListeningRef.current = true;
      setIsListening(true);

      // 2. Setup real-time AudioContext Analyser for visualizer pulse
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          audioContextRef.current = ctx;
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }

          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.5;
          analyserRef.current = analyser;

          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);

          const buffer = new Uint8Array(analyser.frequencyBinCount);

          const pollVolume = () => {
            if (!isListeningRef.current || !analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(buffer);
            let sum = 0;
            for (let i = 0; i < buffer.length; i++) {
              sum += buffer[i];
            }
            const avg = sum / buffer.length;
            const normalized = Math.min(1, Math.max(0, avg / 70));
            setMicVolume(normalized);
            animFrameRef.current = requestAnimationFrame(pollVolume);
          };

          pollVolume();
        }
      } catch (audioCtxErr) {
        console.warn('AudioContext visualizer notice:', audioCtxErr);
      }

      // 3. Setup MediaRecorder for capturing speech audio to send to Gemini
      try {
        const mimeType = getSupportedMimeType();
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(100); // chunk every 100ms
      } catch (recErr) {
        console.warn('MediaRecorder error, falling back to speech recognition only:', recErr);
      }

      // 4. Opportunistically run Web Speech API for instant interim text display
      try {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let fullText = '';
            for (let i = 0; i < event.results.length; ++i) {
              fullText += event.results[i][0].transcript + ' ';
            }
            const trimmed = fullText.trim();
            speechTranscriptRef.current = trimmed;
            setInterimTranscript(trimmed);
          };

          // Gracefully absorb speech recognition errors (network/no-speech)
          // without killing the audio recording!
          recognition.onerror = (event: any) => {
            // Chrome in iframe often emits 'network' or 'no-speech'
            // We ignore it safely because MediaRecorder has the real audio!
            console.log('Web Speech preview note (handled):', event.error);
          };

          recognition.onend = () => {
            // If still listening, recognition can stop; MediaRecorder continues
          };

          recognitionRef.current = recognition;
          recognition.start();
        }
      } catch (speechErr) {
        // Speech API preview unavailable, but MediaRecorder audio will be transcribed by Gemini
        console.log('SpeechRecognition preview not available in this environment');
      }
    } catch (err: any) {
      console.error('Failed to access microphone:', err);
      isListeningRef.current = false;
      setIsListening(false);
      stopAudioCapture();

      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setHasMicPermission(false);
        setError('Microphone permission was denied. Please allow microphone access in your browser to speak.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setError('No microphone found on your device. You can type your question using the keyboard.');
      } else {
        setError(`Microphone error: ${err?.message || 'Could not start recording'}`);
      }
    }
  }, [stopAudioCapture]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      stopAudioCapture();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
    };
  }, [stopAudioCapture]);

  return {
    isListening,
    interimTranscript,
    micVolume,
    error,
    hasMicPermission,
    startListening,
    stopListening,
  };
}
