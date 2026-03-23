import { useRef, useEffect, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

interface ParticleFlowProps {
  width: number;
  height: number;
  particleCount?: number;
  colors?: string[];
  speed?: number;
  className?: string;
}

export function ParticleFlow({
  width,
  height,
  particleCount = 40,
  colors = ['#00e5ff', '#7c3aed', '#22d3ee'],
  speed = 0.5,
  className = '',
}: ParticleFlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  const createParticle = useCallback((): Particle => {
    const color = colors[Math.floor(Math.random() * colors.length)];
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed - 0.2,
      life: 0,
      maxLife: 200 + Math.random() * 300,
      size: 1 + Math.random() * 2,
      color,
      alpha: 0,
    };
  }, [width, height, colors, speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize particles
    particlesRef.current = Array.from({ length: particleCount }, () =>
      createParticle(),
    );

    function animate() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];

        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        // Fade in/out
        if (p.life < 30) {
          p.alpha = p.life / 30;
        } else if (p.life > p.maxLife - 30) {
          p.alpha = (p.maxLife - p.life) / 30;
        } else {
          p.alpha = 0.6;
        }

        // Reset dead particles
        if (p.life >= p.maxLife || p.x < -10 || p.x > width + 10 || p.y < -10 || p.y > height + 10) {
          particlesRef.current[i] = createParticle();
          continue;
        }

        // Draw glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * 0.1;
        ctx.fill();

        // Draw core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * 0.8;
        ctx.fill();
      }

      // Draw connection lines between nearby particles
      ctx.globalAlpha = 0.05;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const a = particlesRef.current[i];
          const b = particlesRef.current[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);

          if (dist < 100) {
            ctx.globalAlpha = 0.05 * (1 - dist / 100) * Math.min(a.alpha, b.alpha);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [width, height, particleCount, createParticle]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`pointer-events-none ${className}`}
      style={{ position: 'absolute', top: 0, left: 0 }}
    />
  );
}
