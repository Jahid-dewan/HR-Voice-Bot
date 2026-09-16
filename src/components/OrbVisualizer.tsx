import React, { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { VoiceState, VisualizerMode, PersonaConfig } from '../types';

interface OrbVisualizerProps {
  state: VoiceState;
  mode: VisualizerMode;
  audioIntensity: number; // 0 to 1, from mic or TTS
  persona: PersonaConfig;
  onOrbClick?: () => void;
}

export const OrbVisualizer: React.FC<OrbVisualizerProps> = ({
  state,
  mode,
  audioIntensity,
  persona,
  onOrbClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render canvas animations for high-performance organic visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Responsive canvas dimensions
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // Particle nodes for ambient field
    const particles = Array.from({ length: 36 }, () => ({
      angle: Math.random() * Math.PI * 2,
      distance: 70 + Math.random() * 80,
      radius: 1 + Math.random() * 2,
      speed: (0.2 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1),
      opacity: 0.2 + Math.random() * 0.6,
    }));

    const render = () => {
      time += 0.02;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // State-based tuning
      const intensity = Math.max(0, Math.min(1, audioIntensity));
      const isListening = state === 'listening';
      const isProcessing = state === 'processing';
      const isSpeaking = state === 'speaking';

      if (mode === 'orb') {
        // --- 1. LUMINOUS ORB MODE ---
        const baseRadius = 85;
        const reactiveRadius = baseRadius + (isSpeaking ? intensity * 35 : isListening ? intensity * 25 : Math.sin(time * 2) * 4);

        // Ambient floating particles
        particles.forEach((p) => {
          const orbitSpeed = isProcessing ? p.speed * 4 : isSpeaking ? p.speed * 2 : p.speed;
          p.angle += orbitSpeed * 0.015;
          const currentDist = p.distance + (isSpeaking || isListening ? intensity * 30 : Math.sin(time + p.angle) * 8);
          const px = cx + Math.cos(p.angle) * currentDist;
          const py = cy + Math.sin(p.angle) * currentDist;

          ctx.beginPath();
          ctx.arc(px, py, p.radius * (1 + intensity * 0.8), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180, 210, 255, ${p.opacity * (0.4 + intensity * 0.6)})`;
          ctx.fill();
        });

        // Outer glow aura
        const outerGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, reactiveRadius * 2.2);
        if (isProcessing) {
          outerGrad.addColorStop(0, 'rgba(168, 85, 247, 0.35)'); // Purple thinking
          outerGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.2)');
          outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else if (isListening) {
          outerGrad.addColorStop(0, 'rgba(239, 68, 68, 0.35)'); // Amber/Rose active mic
          outerGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.2)');
          outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else if (isSpeaking) {
          outerGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)'); // Electric cyan speaking
          outerGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.25)');
          outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          outerGrad.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
          outerGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.08)');
          outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, reactiveRadius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Harmonic wavy perimeter
        ctx.beginPath();
        const points = 64;
        const waveFreq = isProcessing ? 8 : 6;
        const waveAmp = isSpeaking ? 12 * intensity : isListening ? 8 * intensity : 3;

        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const offset = Math.sin(angle * waveFreq + time * 4) * waveAmp;
          const r = reactiveRadius + offset;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        // Inner glowing core
        const coreGrad = ctx.createRadialGradient(
          cx - reactiveRadius * 0.2,
          cy - reactiveRadius * 0.2,
          0,
          cx,
          cy,
          reactiveRadius
        );

        if (isProcessing) {
          coreGrad.addColorStop(0, '#ffffff');
          coreGrad.addColorStop(0.3, '#c084fc');
          coreGrad.addColorStop(0.7, '#7c3aed');
          coreGrad.addColorStop(1, '#3b82f6');
        } else if (isListening) {
          coreGrad.addColorStop(0, '#ffffff');
          coreGrad.addColorStop(0.3, '#fca5a5');
          coreGrad.addColorStop(0.7, '#f43f5e');
          coreGrad.addColorStop(1, '#e11d48');
        } else if (isSpeaking) {
          coreGrad.addColorStop(0, '#ffffff');
          coreGrad.addColorStop(0.3, '#67e8f9');
          coreGrad.addColorStop(0.7, '#0284c7');
          coreGrad.addColorStop(1, '#4f46e5');
        } else {
          coreGrad.addColorStop(0, '#ffffff');
          coreGrad.addColorStop(0.4, '#93c5fd');
          coreGrad.addColorStop(0.8, '#4f46e5');
          coreGrad.addColorStop(1, '#1e1b4b');
        }

        ctx.fillStyle = coreGrad;
        ctx.fill();

        // Core highlight sheen
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(
          cx - reactiveRadius * 0.28,
          cy - reactiveRadius * 0.32,
          reactiveRadius * 0.38,
          reactiveRadius * 0.2,
          -Math.PI / 4,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fill();
        ctx.restore();

      } else if (mode === 'waves') {
        // --- 2. HARMONIC SOUND WAVE RIBBON MODE ---
        const waveCount = 5;
        const colors = isProcessing
          ? ['rgba(168, 85, 247, 0.7)', 'rgba(192, 132, 252, 0.6)', 'rgba(59, 130, 246, 0.5)']
          : isListening
          ? ['rgba(239, 68, 68, 0.7)', 'rgba(249, 115, 22, 0.6)', 'rgba(234, 179, 8, 0.5)']
          : isSpeaking
          ? ['rgba(6, 182, 212, 0.8)', 'rgba(59, 130, 246, 0.7)', 'rgba(99, 102, 241, 0.6)']
          : ['rgba(99, 102, 241, 0.5)', 'rgba(14, 165, 233, 0.4)', 'rgba(168, 85, 247, 0.3)'];

        const baseAmp = isSpeaking ? 70 * intensity + 20 : isListening ? 50 * intensity + 15 : isProcessing ? 35 : 12;

        for (let wIdx = 0; wIdx < waveCount; wIdx++) {
          ctx.beginPath();
          const amp = baseAmp * (1 - wIdx * 0.15);
          const freq = 0.015 + wIdx * 0.005;
          const speed = (wIdx + 1) * (isProcessing ? 4 : 2);

          for (let x = 0; x <= w; x += 4) {
            const y = cy + Math.sin(x * freq + time * speed) * Math.cos(x * 0.005) * amp;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }

          ctx.lineWidth = 3 - wIdx * 0.4;
          ctx.strokeStyle = colors[wIdx % colors.length];
          ctx.shadowBlur = 15;
          ctx.shadowColor = colors[wIdx % colors.length];
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Center pulsating acoustic eye
        const eyeRadius = 24 + intensity * 20;
        const eyeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, eyeRadius);
        eyeGrad.addColorStop(0, '#ffffff');
        eyeGrad.addColorStop(0.6, colors[0]);
        eyeGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = eyeGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

      } else if (mode === 'rings') {
        // --- 3. CONCENTRIC ACOUSTIC RINGS MODE ---
        const ringCount = 6;
        for (let i = 0; i < ringCount; i++) {
          const progress = ((time * (isProcessing ? 1.5 : 0.8) + i / ringCount) % 1);
          const ringRadius = 20 + progress * (w * 0.45);
          const alpha = (1 - progress) * (0.2 + intensity * 0.6);

          ctx.beginPath();
          ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
          ctx.lineWidth = 2 + (1 - progress) * 3;

          let ringColor = `rgba(99, 102, 241, ${alpha})`;
          if (isProcessing) ringColor = `rgba(168, 85, 247, ${alpha})`;
          else if (isListening) ringColor = `rgba(239, 68, 68, ${alpha})`;
          else if (isSpeaking) ringColor = `rgba(14, 165, 233, ${alpha})`;

          ctx.strokeStyle = ringColor;
          ctx.stroke();
        }

        // Center glowing node
        const centerR = 40 + intensity * 20;
        ctx.beginPath();
        ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
        ctx.fillStyle = isListening ? '#f43f5e' : isProcessing ? '#a855f7' : isSpeaking ? '#0ea5e9' : '#6366f1';
        ctx.shadowBlur = 25;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [state, mode, audioIntensity, persona]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-6">
      {/* Visual Canvas */}
      <div
        id="visualizer-stage"
        onClick={onOrbClick}
        className="relative w-72 h-72 sm:w-88 sm:h-88 md:w-96 md:h-96 flex items-center justify-center cursor-pointer group"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded-full transition-transform duration-300 group-hover:scale-[1.02]"
        />

        {/* Status badge floating inside or right under the orb */}
        <div className="absolute -bottom-2 z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide shadow-md backdrop-blur-md transition-colors flex items-center gap-2 border ${
              state === 'listening'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-rose-950/40'
                : state === 'processing'
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-purple-950/40'
                : state === 'speaking'
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 shadow-sky-950/40'
                : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                state === 'listening'
                  ? 'bg-rose-400 animate-ping'
                  : state === 'processing'
                  ? 'bg-purple-400 animate-pulse'
                  : state === 'speaking'
                  ? 'bg-sky-400 animate-bounce'
                  : 'bg-zinc-500'
              }`}
            />
            <span className="capitalize font-semibold">
              {state === 'idle'
                ? 'Ready'
                : state === 'listening'
                ? 'Listening...'
                : state === 'processing'
                ? 'Thinking...'
                : state === 'speaking'
                ? 'Speaking'
                : 'Notice'}
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
