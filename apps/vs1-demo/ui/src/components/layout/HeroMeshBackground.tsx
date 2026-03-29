import { useEffect, useRef } from 'react';

interface MeshNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  glow: number;        // 0–1 current brightness
  glowTarget: number;  // 0 or 1
  glowSpeed: number;
  baseSize: number;
  litUntil: number;    // timestamp when glow should start fading
}

// Neutral palette — dots & lines stay gray; lit dots flash warm white
const BASE      = { r: 160, g: 163, b: 168 }; // neutral-400
const LIT       = { r: 230, g: 232, b: 235 }; // near-white
const LINE_BASE = { r: 140, g: 143, b: 148 }; // neutral-500

const NODE_COUNT   = 68;
const MAX_DIST     = 190;
const LIT_INTERVAL = 900;  // ms between random flashes
const LIT_DURATION = 1800; // ms a node stays lit

function lerp3(
  a: typeof BASE,
  b: typeof BASE,
  t: number,
): [number, number, number] {
  return [
    Math.round(a.r + (b.r - a.r) * t),
    Math.round(a.g + (b.g - a.g) * t),
    Math.round(a.b + (b.b - a.b) * t),
  ];
}

export function HeroMeshBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let lastFrame = performance.now();
    let litAccum  = 0;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    const nodes: MeshNode[] = Array.from({ length: NODE_COUNT }, () => ({
      x:          Math.random() * canvas.width,
      y:          Math.random() * canvas.height,
      vx:         (Math.random() - 0.5) * 0.15,
      vy:         (Math.random() - 0.5) * 0.15,
      glow:       0,
      glowTarget: 0,
      glowSpeed:  0.012 + Math.random() * 0.008, // ease speed
      baseSize:   1.4 + Math.random() * 1.4,
      litUntil:   0,
    }));

    const flashRandom = (now: number) => {
      // pick a node that isn't currently lit
      const dark = nodes.filter(n => n.glowTarget === 0);
      if (dark.length === 0) return;
      const n = dark[Math.floor(Math.random() * dark.length)];
      n.glowTarget = 1;
      n.litUntil   = now + LIT_DURATION;
    };

    const draw = (now: number) => {
      const dt = now - lastFrame;
      lastFrame = now;

      // schedule random flashes
      litAccum += dt;
      if (litAccum >= LIT_INTERVAL) {
        litAccum = 0;
        flashRandom(now);
      }

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // update nodes
      for (const n of nodes) {
        // movement
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0) { n.x = 0; n.vx *= -1; }
        if (n.x > W) { n.x = W; n.vx *= -1; }
        if (n.y < 0) { n.y = 0; n.vy *= -1; }
        if (n.y > H) { n.y = H; n.vy *= -1; }

        // expire lit state
        if (n.glowTarget === 1 && now >= n.litUntil) {
          n.glowTarget = 0;
        }

        // smooth ease toward target
        n.glow += (n.glowTarget - n.glow) * n.glowSpeed;
        if (n.glow < 0.001) n.glow = 0;
      }

      // draw lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx   = nodes[i].x - nodes[j].x;
          const dy   = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > MAX_DIST) continue;

          const proximity    = 1 - dist / MAX_DIST;
          const combinedGlow = (nodes[i].glow + nodes[j].glow) / 2;
          // base line always slightly visible; brightens when a node is lit
          const alpha = proximity * (0.08 + combinedGlow * 0.25);

          const [r, g, b] = lerp3(LINE_BASE, LIT, combinedGlow);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.lineWidth   = 0.5 + combinedGlow * 0.7;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }

      // draw dots
      for (const n of nodes) {
        const [r, g, b] = lerp3(BASE, LIT, n.glow);
        const coreR     = n.baseSize + n.glow * 2;
        const alpha     = 0.28 + n.glow * 0.72;

        // soft outer glow only when lit
        if (n.glow > 0.05) {
          const glowR = coreR * (3 + n.glow * 3);
          const grad  = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
          grad.addColorStop(0, `rgba(${r},${g},${b},${0.18 * n.glow})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
          ctx.fill();
        }

        // core dot
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, coreR, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-50"
    />
  );
}
