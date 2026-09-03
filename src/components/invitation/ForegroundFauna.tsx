"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";

type FireflyFlight = {
  direction: 1 | -1;
  x: number;
  y: number;
  speed: number;
  drift: number;
  phase: number;
  size: number;
  delay: number;
  glow: number;
};

const randomBetween = (minimum: number, maximum: number) =>
  minimum + Math.random() * (maximum - minimum);

/**
 * Capa de fauna que cruza ocasionalmente el papel de la invitación. Está en
 * canvas para no añadir nodos animados ni capturar clicks sobre los controles.
 */
export function ForegroundFauna() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let width = 0;
    let height = 0;
    let fireflies: FireflyFlight[] = [];
    let frame = 0;
    let lastTime = performance.now();

    const createFlight = (size: number): FireflyFlight => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      return {
        direction,
        x: direction === 1 ? -size * 3 : width + size * 3,
        y: randomBetween(height * 0.16, height * 0.82),
        speed: randomBetween(26, 52),
        drift: randomBetween(12, 28),
        phase: Math.random() * Math.PI * 2,
        size,
        // Deja claros entre visitas: no hay un flujo constante ni artificial.
        delay: randomBetween(0.5, 7),
        glow: randomBetween(0.6, 1.25),
      };
    };

    const resetFlight = (flight: FireflyFlight, size = flight.size) => {
      Object.assign(flight, createFlight(size));
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      fireflies = Array.from({ length: width < 640 ? 6 : 10 }, () => {
        const flight = createFlight(randomBetween(1.5, 2.7));
        flight.speed = randomBetween(18, 34);
        flight.delay = randomBetween(0, 5);
        return flight;
      });
    };

    const drawFirefly = (flight: FireflyFlight) => {
      const pulse = 0.4 + (Math.sin(flight.phase * 2.3) + 1) * 0.3;
      const x = flight.x;
      const y = flight.y + Math.sin(flight.phase) * flight.drift;
      const glow = context.createRadialGradient(x, y, 0, x, y, flight.size * 8 * flight.glow);
      glow.addColorStop(0, `rgba(255, 247, 192, ${pulse})`);
      glow.addColorStop(0.25, `rgba(231, 205, 103, ${pulse * 0.52})`);
      glow.addColorStop(1, "rgba(231, 205, 103, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(x, y, flight.size * 8 * flight.glow, 0, Math.PI * 2);
      context.fill();
    };

    const draw = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";

      for (const flight of fireflies) {
        if (flight.delay > 0) {
          flight.delay -= delta;
          continue;
        }
        flight.x += flight.direction * flight.speed * delta;
        flight.phase += delta * 2.7;
        drawFirefly(flight);
        if (flight.x < -28 || flight.x > width + 28) resetFlight(flight);
      }

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
    const onVisibilityChange = () => (document.hidden ? stop() : start());

    resize();
    start();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[45] h-full w-full" />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[45] overflow-hidden">
        <FlyingButterfly className="butterfly-flight butterfly-flight-one" />
        <FlyingButterfly className="butterfly-flight butterfly-flight-two" mirrored />
        <FlyingButterfly className="butterfly-flight butterfly-flight-three" />
      </div>
    </>
  );
}

/** Mariposa SVG en DOM, en lugar de un Lottie que puede fallar al cargar. */
function FlyingButterfly({ className, mirrored = false }: { className: string; mirrored?: boolean }) {
  return (
    <svg viewBox="0 0 160 140" className={className} role="presentation">
      <defs>
        <linearGradient id="butterfly-wing" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff8df" />
          <stop offset="0.62" stopColor="#e9d29b" />
          <stop offset="1" stopColor="#b58d49" />
        </linearGradient>
      </defs>
      <g transform={mirrored ? "translate(160 0) scale(-1 1)" : undefined}>
        <g className="butterfly-wing-left">
          <path d="M77 69 C20 16 6 61 31 97 C47 119 70 107 79 82 Z" fill="url(#butterfly-wing)" stroke="#9c7f42" strokeWidth="1.8" />
          <path d="M77 71 C35 75 40 121 72 116 C83 114 86 94 81 80 Z" fill="#e7c3bc" fillOpacity="0.72" stroke="#9c7f42" strokeWidth="1.4" />
        </g>
        <g className="butterfly-wing-right">
          <path d="M83 69 C140 16 154 61 129 97 C113 119 90 107 81 82 Z" fill="url(#butterfly-wing)" stroke="#9c7f42" strokeWidth="1.8" />
          <path d="M83 71 C125 75 120 121 88 116 C77 114 74 94 79 80 Z" fill="#f8e6be" fillOpacity="0.84" stroke="#9c7f42" strokeWidth="1.4" />
        </g>
        <path d="M80 52 C85 63 85 84 80 96 C75 84 75 63 80 52 Z" fill="#40502f" />
        <path d="M78 55 C70 40 62 39 57 45 M82 55 C90 40 98 39 103 45" fill="none" stroke="#40502f" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}
