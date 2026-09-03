import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-forest-950 px-6 text-center">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(110% 70% at 50% 30%, #2d4522 0%, #16230f 55%, #0b120a 100%)",
        }}
      />
      <div className="relative z-10">
        <p className="font-sans text-[10px] uppercase tracking-[0.4em] text-gold-300/80">
          Bosque encantado
        </p>
        <h1 className="mt-4 font-serif text-4xl font-light text-cream-100">
          Esta invitación no existe
        </h1>
        <p className="mt-3 max-w-sm font-sans text-sm text-cream-200/70">
          Comprueba el enlace que recibiste. Si crees que es un error, pide a quien te invitó
          que vuelva a compartirlo.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full border border-gold-400/50 px-6 py-3 font-sans text-xs uppercase tracking-[0.2em] text-gold-300 transition-colors hover:bg-gold-400/10"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
