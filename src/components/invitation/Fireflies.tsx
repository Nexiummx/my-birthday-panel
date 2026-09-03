"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";

interface Firefly {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  phase: number;
  pulse: number;
}

/**
 * Luciérnagas doradas dibujadas en un único <canvas>.
 *
 * Un solo nodo del DOM en lugar de decenas de divs animados: el coste es una
 * textura de 64px reutilizada y ~40 draws por frame. Se detiene cuando la
 * pestaña no está visible y no se monta si el usuario pidió menos movimiento.
 */
export function Fireflies({ density = 1, className }: { density?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    // Sprite del halo: se dibuja una vez y se reutiliza en cada partícula.
    const sprite = document.createElement("canvas");
    const spriteSize = 64;
    sprite.width = spriteSize;
    sprite.height = spriteSize;
    const spriteContext = sprite.getContext("2d");
    if (!spriteContext) return;
    const gradient = spriteContext.createRadialGradient(
      spriteSize / 2,
      spriteSize / 2,
      0,
      spriteSize / 2,
      spriteSize / 2,
      spriteSize / 2
    );
    gradient.addColorStop(0, "rgba(255, 244, 205, 1)");
    gradient.addColorStop(0.25, "rgba(233, 205, 128, 0.75)");
    gradient.addColorStop(1, "rgba(201, 165, 92, 0)");
    spriteContext.fillStyle = gradient;
    spriteContext.fillRect(0, 0, spriteSize, spriteSize);

    let width = 0;
    let height = 0;
    let flies: Firefly[] = [];
    let frame = 0;
    let lastTime = performance.now();

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const base = width < 640 ? 20 : width < 1280 ? 32 : 44;
      const count = Math.round(base * density);

      flies = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 1.6 + Math.random() * 3.4,
        speedX: (Math.random() - 0.5) * 14,
        speedY: -(4 + Math.random() * 12),
        phase: Math.random() * Math.PI * 2,
        pulse: 0.5 + Math.random() * 1.1,
      }));
    };

    const draw = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";

      for (const fly of flies) {
        fly.phase += delta * fly.pulse;
        fly.x += (fly.speedX + Math.sin(fly.phase) * 10) * delta;
        fly.y += fly.speedY * delta;

        if (fly.y < -30) {
          fly.y = height + 20;
          fly.x = Math.random() * width;
        }
        if (fly.x < -30) fly.x = width + 20;
        if (fly.x > width + 30) fly.x = -20;

        const alpha = 0.35 + (Math.sin(fly.phase * 1.7) + 1) * 0.32;
        const size = fly.radius * 9;
        context.globalAlpha = alpha;
        context.drawImage(sprite, fly.x - size / 2, fly.y - size / 2, size, size);
      }

      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      frame = requestAnimationFrame(draw);
    };

    const start = () => {
      if (frame) return;
      lastTime = performance.now();
      frame = requestAnimationFrame(draw);
    };

    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    resize();
    start();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [density, prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ?? "pointer-events-none absolute inset-0 h-full w-full"}
    />
  );
}
