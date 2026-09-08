import Link from "next/link";
import { Images, Quote } from "lucide-react";
import { ShareButton } from "@/components/photos/ShareButton";
import type { RewindCard } from "@/lib/services/rewind";

/**
 * Las pantallas del recuerdo. Solo presentación: el reproductor las anima
 * buscando dos marcas.
 *
 *   .rw-in     entra en cascada al mostrarse la pantalla.
 *   .rw-depth  se mueve con el parallax del puntero.
 *   .rw-kb     recibe el Ken Burns: una deriva lenta mientras dura la pantalla.
 *              Una foto quieta a pantalla completa se ve muerta; moviéndose
 *              despacio parece grabada.
 *
 * Separar así el qué del cómo permite añadir una pantalla nueva sin tocar la
 * línea de tiempo de GSAP.
 */

const DEPTH = "translate3d(calc(var(--parallax-x,0) * var(--depth,8px)), calc(var(--parallax-y,0) * var(--depth,8px)), 0)";

export function RewindCardView({ card }: { card: RewindCard }) {
  switch (card.kind) {
    case "intro":
      return (
        <Frame>
          <p className="rw-in font-sans text-[11px] uppercase tracking-[0.4em] opacity-70">
            El recuerdo de
          </p>
          <h1
            className="rw-in rw-depth mt-6 font-display-script text-[clamp(2.75rem,13vh,8rem)] leading-[0.85]"
            style={{ transform: DEPTH, ["--depth" as string]: "14px" }}
          >
            {card.title}
          </h1>
          {card.highlight && (
            <p className="rw-in mt-2 font-display-script text-[clamp(2rem,8vh,5rem)] leading-none text-gold-400">
              {card.highlight}
            </p>
          )}
          <p className="rw-in mt-8 font-sans text-sm uppercase tracking-[0.22em] opacity-70">
            {card.dateLabel}
          </p>
        </Frame>
      );

    case "count":
      return (
        <Frame>
          <p className="rw-in font-sans text-[11px] uppercase tracking-[0.4em] opacity-70">
            {card.eyebrow}
          </p>
          <p
            className="rw-in rw-depth mt-4 font-display-script text-[clamp(4rem,20vh,12rem)] leading-none text-gold-400"
            style={{ transform: DEPTH, ["--depth" as string]: "18px" }}
            // El reproductor cuenta desde cero escribiendo aquí dentro.
            data-count={card.value}
          >
            {card.value}
          </p>
          <p className="rw-in mt-2 font-serif text-3xl">{card.unit}</p>
          {card.note && (
            <p className="rw-in mt-5 font-sans text-sm opacity-70">{card.note}</p>
          )}
        </Frame>
      );

    case "names":
      return (
        <Frame>
          <p className="rw-in font-sans text-[11px] uppercase tracking-[0.4em] opacity-70">
            {card.eyebrow}
          </p>
          <h2 className="rw-in mt-3 font-display-script text-5xl text-gold-400">{card.title}</h2>
          <ul className="mt-7 flex max-w-2xl flex-wrap justify-center gap-x-5 gap-y-2">
            {card.names.map((name) => (
              <li key={name} className="rw-in font-serif text-xl leading-snug sm:text-2xl">
                {name}
              </li>
            ))}
          </ul>
        </Frame>
      );

    case "message":
      return (
        <Frame>
          <Quote className="rw-in size-8 text-gold-400/70" aria-hidden="true" />
          <blockquote
            className="rw-in rw-depth mt-6 max-w-2xl font-serif text-[clamp(1.35rem,4.5vh,2.25rem)] leading-snug"
            style={{ transform: DEPTH, ["--depth" as string]: "10px" }}
          >
            “{card.text}”
          </blockquote>
          <p className="rw-in mt-6 font-sans text-sm uppercase tracking-[0.22em] opacity-70">
            {card.author}
          </p>
        </Frame>
      );

    case "hero":
      return (
        <div className="relative h-full w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- ver PhotoGallery */}
          <img
            src={card.photo.url}
            alt={card.photo.caption ?? `Foto de ${card.photo.authorName}`}
            className="rw-kb absolute inset-0 size-full object-cover"
            decoding="async"
          />
          {/* Degradado abajo: sin él el texto cae sobre lo que traiga la foto,
              y a veces es ilegible. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/45"
          />
          <div className="absolute inset-x-0 bottom-0 p-7 text-left sm:p-10">
            {card.photo.caption && (
              <p className="rw-in max-w-lg font-serif text-[clamp(1.4rem,4.5vh,2.25rem)] leading-snug">
                “{card.photo.caption}”
              </p>
            )}
            <p className="rw-in mt-3 font-sans text-[11px] uppercase tracking-[0.28em] opacity-75">
              {card.photo.authorName}
            </p>
          </div>
        </div>
      );

    case "photos":
      return (
        <Frame>
          {/* Rejilla irregular a propósito: cuatro fotos alineadas parecen un
              catálogo, no un recuerdo. items-start es lo que la sostiene: sin
              él, la foto desplazada estira a su vecina y le deja un hueco
              muerto debajo del pie. */}
          <div className="grid w-full max-w-2xl grid-cols-2 items-start gap-3 sm:gap-4">
            {card.photos.map((photo, index) => (
              <figure
                key={photo.id}
                className="rw-in rw-depth overflow-hidden rounded-2xl border border-cream-100/20 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)]"
                style={{
                  transform: DEPTH,
                  ["--depth" as string]: `${8 + index * 5}px`,
                  rotate: `${index % 2 === 0 ? -1.6 : 1.8}deg`,
                  marginTop: index % 2 === 0 ? undefined : "1.75rem",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- ya
                    llegan comprimidas desde el navegador; ver PhotoGallery */}
                <img
                  src={photo.url}
                  alt={photo.caption ?? `Foto de ${photo.authorName}`}
                  className="rw-kb aspect-[4/5] w-full object-cover"
                  loading={index < 2 ? "eager" : "lazy"}
                  decoding="async"
                />
                <figcaption className="bg-black/35 px-3 py-1.5 text-left font-sans text-[10px] uppercase tracking-wider opacity-80">
                  {photo.authorName}
                </figcaption>
              </figure>
            ))}
          </div>
        </Frame>
      );

    case "author":
      return (
        <Frame>
          <p className="rw-in font-sans text-[11px] uppercase tracking-[0.4em] opacity-70">
            El fotógrafo de la noche
          </p>
          <h2
            className="rw-in rw-depth mt-5 font-display-script text-[clamp(2.5rem,11vh,6rem)] leading-none text-gold-400"
            style={{ transform: DEPTH, ["--depth" as string]: "16px" }}
          >
            {card.name}
          </h2>
          <p className="rw-in mt-4 font-serif text-2xl">
            {card.count} fotos, nada menos
          </p>
        </Frame>
      );

    case "outro":
      return (
        <Frame>
          <h2 className="rw-in font-display-script text-[clamp(2.5rem,11vh,6rem)] leading-none">
            {card.title}
          </h2>
          <p className="rw-in mt-4 font-sans text-sm uppercase tracking-[0.22em] opacity-70">
            {card.note}
          </p>
          <div className="rw-in mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={card.galleryHref}
              className="inline-flex items-center gap-2 rounded-full border border-cream-100/30 px-6 py-3 font-sans text-xs uppercase tracking-[0.2em] transition-colors hover:border-gold-400 hover:text-gold-400"
            >
              <Images className="size-4" aria-hidden="true" />
              Ver todas las fotos
            </Link>
            <ShareButton url={card.shareHref} title={card.shareTitle} />
          </div>
        </Frame>
      );
  }
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    // min-h-full y no h-full: si el contenido no cabe —un móvil en horizontal,
    // una lista larga de nombres— la pantalla crece y el escenario la desplaza,
    // en vez de empujar los controles fuera de la vista.
    <div className="flex min-h-full w-full flex-col items-center justify-center px-6 py-8 text-center sm:px-10">
      {children}
    </div>
  );
}
