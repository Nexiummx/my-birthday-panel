"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/**
 * Comparte el enlace del recuerdo.
 *
 * En móvil abre la hoja nativa —que es donde está WhatsApp, y por donde se va a
 * compartir esto de verdad—; en escritorio, donde esa API casi nunca existe,
 * copia al portapapeles y lo dice. Sin la etiqueta que confirma, nadie sabe si
 * el clic hizo algo.
 */
export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const absolute = new URL(url, window.location.origin).toString();

    if (navigator.share) {
      try {
        await navigator.share({ title, url: absolute });
        return;
      } catch {
        // Cancelar la hoja nativa lanza: no es un error que haya que contar.
        return;
      }
    }

    await navigator.clipboard.writeText(absolute);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-2 rounded-full border border-cream-100/30 px-6 py-3 font-sans text-xs uppercase tracking-[0.2em] transition-colors hover:border-gold-400 hover:text-gold-400"
    >
      {copied ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Share2 className="size-4" aria-hidden="true" />
      )}
      {copied ? "Enlace copiado" : "Compartir"}
    </button>
  );
}
