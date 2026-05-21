import React, { useRef, useEffect } from 'react';

// ── Shared: ResizeObserver-based canvas hook ─────────────────────────────────
function useResizingCanvas(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => void
) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    let startTime = performance.now();

    const tick = (now: number) => {
      const t = (now - startTime) / 1000; // seconds
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h, t);
      raf = requestAnimationFrame(tick);
    };

    const resize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    resize();
    startTime = performance.now();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [draw]);

  return ref;
}

// ── CONSULTATION: Organic voice waveform with glow ────────────────────────────
export const WaveformCanvas: React.FC<{ color?: string }> = ({ color = '#ffffff' }) => {
  const draw = React.useCallback(
    (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
      const bars = 14;
      const gap = 3;
      const barW = (W - bars * gap) / bars;

      for (let i = 0; i < bars; i++) {
        const phase = (i / bars) * Math.PI * 2;
        const amp = 0.25 + 0.75 * Math.abs(
          Math.sin(t * 2.1 + phase) *
          Math.cos(t * 1.7 + phase * 0.6) *
          Math.sin(t * 0.8 + i * 0.45)
        );
        const h = 8 + (H - 16) * amp;
        const x = i * (barW + gap) + gap / 2;
        const y = (H - h) / 2;
        const alpha = 0.5 + 0.5 * amp;

        ctx.shadowColor = `rgba(255,255,255,${alpha * 0.6})`;
        ctx.shadowBlur = 8;
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.85})`;
        const r = Math.min(barW / 2, 5);
        ctx.beginPath();
        ctx.roundRect(x, y, barW, h, r);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    },
    [color]
  );

  const ref = useResizingCanvas(draw);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
};

// ── RECORDS: Animated filing system — sliding tabs + scanning line ────────────
export const FolderCanvas: React.FC = () => {
  const draw = React.useCallback(
    (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
      const TABS = 5;
      const tabHeight = H / (TABS + 1);
      const tabW = W * 0.75;

      for (let i = 0; i < TABS; i++) {
        const delay = i * 0.35;
        const progress = Math.min(1, Math.max(0, (t - delay) * 2.2));
        // Eased slide-in from left
        const eased = 1 - Math.pow(1 - progress, 3);
        const targetX = i * 6; // slight stagger offset
        const slideX = -tabW + (tabW * 0.08 + targetX) + tabW * 0.92 * eased;
        const y = (i + 0.5) * tabHeight;
        const tabH = tabHeight * 0.64;
        const alpha = 0.12 + i * 0.04 + 0.1 * eased;

        // Tab body
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.roundRect(slideX, y - tabH / 2, tabW, tabH, 5);
        ctx.fill();

        // Tab left accent line
        if (progress > 0.5) {
          const lineAlpha = (progress - 0.5) * 2 * 0.6;
          ctx.fillStyle = `rgba(255,255,255,${lineAlpha})`;
          ctx.beginPath();
          ctx.roundRect(slideX, y - tabH / 2, 3, tabH, 2);
          ctx.fill();
        }

        // Fake text lines inside tab
        const lineAlpha = 0.25 * eased;
        ctx.fillStyle = `rgba(255,255,255,${lineAlpha})`;
        // Long line
        ctx.beginPath();
        ctx.roundRect(slideX + 10, y - tabH / 2 + tabH * 0.25, tabW * 0.55 * eased, 2, 1);
        ctx.fill();
        // Short line
        ctx.beginPath();
        ctx.roundRect(slideX + 10, y - tabH / 2 + tabH * 0.55, tabW * 0.32 * eased, 2, 1);
        ctx.fill();
      }

      // Scanning line — only appears after all tabs are in (t > 1.75)
      const scanPhase = Math.max(0, t - 1.75);
      if (scanPhase > 0) {
        const scanY = (scanPhase * 0.55 % 1) * H;
        const scanAlpha = 0.4;

        ctx.strokeStyle = `rgba(255,255,255,${scanAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(W, scanY);
        ctx.stroke();

        // Glow around scan line
        const glow = ctx.createRadialGradient(W / 2, scanY, 0, W / 2, scanY, W * 0.7);
        glow.addColorStop(0, 'rgba(255,255,255,0.12)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, scanY - 18, W, 36);
      }
    },
    []
  );

  const ref = useResizingCanvas(draw);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
};

// ── HEALTH: ECG heartbeat scrolling right-to-left with fading trail + glow ───
export const ECGCanvas: React.FC = () => {
  const draw = React.useCallback(
    (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
      const mid = H / 2;

      const beat = (x: number): number => {
        const c = x % 1;
        if (c < 0.08) return 0;
        if (c < 0.13) return -0.12;
        if (c < 0.18) return 0;
        if (c < 0.21) return -0.22;
        if (c < 0.25) return 1.0;
        if (c < 0.29) return -0.35;
        if (c < 0.44) return 0.05;
        if (c < 0.54) return 0.22;
        return 0;
      };

      const speed = 0.55;
      const offset = (t * speed * 60) % W;

      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255,255,255,0.7)';
      ctx.shadowBlur = 8;

      for (let px = 0; px <= W; px++) {
        const xNorm = ((px + offset) / W) * 2;
        const y = mid - beat(xNorm) * (H * 0.4);
        if (px === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.stroke();
      ctx.shadowBlur = 0;

      const scanX = W - (offset % W);
      const xNormScan = ((scanX + offset) / W) * 2;
      const beatY = mid - beat(xNormScan) * (H * 0.4);
      if (Math.abs(beat(xNormScan)) > 0.7) {
        ctx.beginPath();
        ctx.arc(scanX, beatY, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.shadowColor = 'rgba(255,255,255,0.9)';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    },
    []
  );

  const ref = useResizingCanvas(draw);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
};

// ── FOLLOW-UPS: Pulsing timeline with checkpoints ────────────────────────────
export const CalendarCanvas: React.FC = () => {
  const draw = React.useCallback(
    (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => {
      const centerX = W * 0.42;
      const NODES = 4;
      const spacing = H / (NODES + 1);
      const activeNode = Math.floor(t * 0.7) % NODES;

      // Solid timeline line
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(centerX, spacing * 0.5);
      ctx.lineTo(centerX, spacing * NODES + spacing * 0.3);
      ctx.stroke();

      // Dotted future line
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, spacing * NODES + spacing * 0.3);
      ctx.lineTo(centerX, H - 6);
      ctx.stroke();
      ctx.setLineDash([]);

      for (let i = 0; i < NODES; i++) {
        const y = (i + 1) * spacing;
        const isActive = i === activeNode;
        const isPast = i < activeNode;

        // Glow halo for active node
        if (isActive) {
          const pulse = 0.3 + Math.sin(t * 5) * 0.2;
          const glow = ctx.createRadialGradient(centerX, y, 0, centerX, y, 22);
          glow.addColorStop(0, `rgba(255,255,255,${pulse})`);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.ellipse(centerX, y, 22, 22, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(centerX, y, isActive ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = isActive
          ? 'rgba(255,255,255,0.92)'
          : isPast
          ? 'rgba(255,255,255,0.55)'
          : 'rgba(255,255,255,0.2)';
        ctx.fill();

        // Checkmark for past nodes
        if (isPast) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 1.8;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(centerX - 3.5, y + 0.5);
          ctx.lineTo(centerX - 1, y + 3.5);
          ctx.lineTo(centerX + 4, y - 3);
          ctx.stroke();
        }

        // Horizontal connection lines extending right
        const hLineAlpha = isActive ? 0.45 : 0.18;
        const hLineW = isActive ? 28 : 20;
        ctx.strokeStyle = `rgba(255,255,255,${hLineAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(centerX + 10, y);
        ctx.lineTo(centerX + hLineW, y);
        ctx.stroke();

        // Small label dot to the right
        const labelX = centerX + hLineW + 4;
        ctx.beginPath();
        ctx.arc(labelX, y, isActive ? 2.5 : 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${isActive ? 0.6 : 0.25})`;
        ctx.fill();
      }
    },
    []
  );

  const ref = useResizingCanvas(draw);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
};
