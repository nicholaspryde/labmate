import { useEffect, type RefObject } from "react";

const CONFETTI_EMOJIS = ["🔬", "🧪"];

function randomEmoji(): string {
  return CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)];
}

type ConfettiParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  size: number;
  rot: number;
  rotV: number;
  gravity: number;
  wobbleFreq: number;
  wobbleAmp: number;
  t: number;
  life: number;
  decay: number;
};

function createParticles(centerX: number, centerY: number): ConfettiParticle[] {
  return Array.from({ length: 42 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.8 + Math.random() * 2.5;

    return {
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.75,
      emoji: randomEmoji(),
      size: 18 + Math.random() * 16,
      rot: (Math.random() - 0.5) * 0.15,
      rotV: (Math.random() - 0.5) * 0.02,
      gravity: 0.045 + Math.random() * 0.035,
      wobbleFreq: 1 + Math.random() * 1.2,
      wobbleAmp: 0.08 + Math.random() * 0.12,
      t: Math.random() * Math.PI * 2,
      life: 1,
      decay: 0.0035 + Math.random() * 0.0035,
    };
  });
}

export function useEmojiConfetti(canvasRef: RefObject<HTMLCanvasElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let rafId = 0;
    let width = 0;
    let height = 0;
    let particles: ConfettiParticle[] = [];

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      if (width === 0 || height === 0) {
        return false;
      }
      canvas.width = width;
      canvas.height = height;
      return true;
    };

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.t += 0.03;
        particle.x += particle.vx + Math.sin(particle.t * particle.wobbleFreq) * particle.wobbleAmp;
        particle.y += particle.vy;
        particle.vy += particle.gravity;
        particle.rot += particle.rotV;
        particle.life -= particle.decay;

        if (
          particle.life <= 0 ||
          particle.y > height + particle.size ||
          particle.y < -particle.size ||
          particle.x < -particle.size ||
          particle.x > width + particle.size
        ) {
          particles.splice(index, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, particle.life);
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rot);
        ctx.font = `${Math.round(particle.size)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(particle.emoji, 0, 0);
        ctx.restore();
      }

      if (particles.length > 0) {
        rafId = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    const start = () => {
      if (!resizeCanvas()) {
        rafId = requestAnimationFrame(start);
        return;
      }

      particles = createParticles(width / 2, height / 2);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(start);

    return () => {
      cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, width, height);
    };
  }, [active, canvasRef]);
}
