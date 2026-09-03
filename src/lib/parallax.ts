/**
 * Parallax ligero: escribe las variables CSS --parallax-x / --parallax-y
 * (rango -1 … 1) en un elemento a partir del puntero.
 *
 * No provoca renders de React —las capas se mueven con transform en GPU— y se
 * limita a un rAF por frame. Devuelve la función de limpieza.
 */
export function attachParallax(element: HTMLElement): () => void {
  let frame = 0;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  const render = () => {
    // Interpolación suave para que el movimiento no se sienta pegado al cursor.
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    element.style.setProperty("--parallax-x", currentX.toFixed(4));
    element.style.setProperty("--parallax-y", currentY.toFixed(4));

    if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
      frame = requestAnimationFrame(render);
    } else {
      frame = 0;
    }
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    targetX = (event.clientX / window.innerWidth) * 2 - 1;
    targetY = (event.clientY / window.innerHeight) * 2 - 1;
    schedule();
  };

  const onPointerLeave = () => {
    targetX = 0;
    targetY = 0;
    schedule();
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerleave", onPointerLeave);

  return () => {
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerleave", onPointerLeave);
  };
}
