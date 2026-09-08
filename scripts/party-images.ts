/**
 * Genera imágenes de fiesta para poblar una galería de prueba.
 *
 * No son fotos: son escenas dibujadas —luces desenfocadas, confeti, un pastel,
 * globos, la pista— rasterizadas a JPEG con sharp. Sirven para ver cómo se
 * comporta la galería y el recuerdo con material real: pesos, proporciones
 * mezcladas y cantidad.
 *
 * Se dibujan en SVG y no se descargan de ningún sitio a propósito: nadie tiene
 * que ceder su cara para que probemos una cuadrícula.
 */
import sharp from "sharp";

/** Azar reproducible: el mismo sembrado da siempre la misma galería. */
export function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

interface Palette {
  fondo: [string, string];
  luces: string[];
  acento: string;
}

const PALETTES: Palette[] = [
  { fondo: ["#1a1030", "#3d1b4a"], luces: ["#ffd782", "#ff8fc7", "#9be7ff"], acento: "#ffd782" },
  { fondo: ["#2b0f1c", "#7a2246"], luces: ["#ffb3d1", "#ffe0b2", "#ff7aa2"], acento: "#ff8fb1" },
  { fondo: ["#101b12", "#2c4a2e"], luces: ["#e8d9a0", "#bfe3b0", "#fff2c4"], acento: "#d8c07a" },
  { fondo: ["#0d1b2a", "#1b3a5c"], luces: ["#9fd0ff", "#ffe9a8", "#c9b3ff"], acento: "#8fc4ff" },
  { fondo: ["#2a1508", "#6b3410"], luces: ["#ffcf87", "#ffa45c", "#ffe8c4"], acento: "#ffb765" },
];

const NOMBRE_ESCENAS = [
  "luces",
  "confeti",
  "pastel",
  "globos",
  "bengalas",
  "pista",
  "mesa",
  "brindis",
] as const;

type Escena = (typeof NOMBRE_ESCENAS)[number];

function fondo(p: Palette, w: number, h: number) {
  return `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stop-color="${p.fondo[0]}"/>
        <stop offset="100%" stop-color="${p.fondo[1]}"/>
      </linearGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="${Math.round(w / 45)}"/></filter>
      <filter id="soft"><feGaussianBlur stdDeviation="${Math.round(w / 160)}"/></filter>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>`;
}

/** Círculos desenfocados: el fondo de casi cualquier foto de fiesta de noche. */
function bokeh(p: Palette, w: number, h: number, next: () => number, cantidad: number) {
  let out = `<g filter="url(#blur)">`;
  for (let i = 0; i < cantidad; i += 1) {
    const r = (0.02 + next() * 0.09) * w;
    out += `<circle cx="${next() * w}" cy="${next() * h}" r="${r}"
      fill="${p.luces[Math.floor(next() * p.luces.length)]}" opacity="${0.16 + next() * 0.4}"/>`;
  }
  return out + `</g>`;
}

function escena(tipo: Escena, p: Palette, w: number, h: number, next: () => number): string {
  const cx = w / 2;

  switch (tipo) {
    case "luces":
      return bokeh(p, w, h, next, 26);

    case "confeti": {
      let out = bokeh(p, w, h, next, 8);
      for (let i = 0; i < 130; i += 1) {
        const x = next() * w;
        const y = next() * h;
        const s = w * (0.006 + next() * 0.012);
        out += `<rect x="${x}" y="${y}" width="${s}" height="${s * 2.2}"
          fill="${p.luces[Math.floor(next() * p.luces.length)]}" opacity="${0.5 + next() * 0.5}"
          transform="rotate(${next() * 360} ${x} ${y})"/>`;
      }
      return out;
    }

    case "pastel": {
      const base = h * 0.72;
      const ancho = w * 0.46;
      let out = bokeh(p, w, h, next, 10);
      out += `<ellipse cx="${cx}" cy="${base + h * 0.02}" rx="${ancho * 0.62}" ry="${h * 0.03}" fill="#000" opacity="0.35"/>`;
      // Dos pisos, el de arriba más estrecho.
      out += `<rect x="${cx - ancho / 2}" y="${base - h * 0.13}" width="${ancho}" height="${h * 0.13}" rx="${w * 0.02}" fill="${p.acento}" opacity="0.92"/>`;
      out += `<rect x="${cx - ancho * 0.34}" y="${base - h * 0.23}" width="${ancho * 0.68}" height="${h * 0.1}" rx="${w * 0.02}" fill="#fff6e6" opacity="0.9"/>`;
      // Velas encendidas.
      for (let i = 0; i < 5; i += 1) {
        const x = cx - ancho * 0.22 + (i * ancho * 0.44) / 4;
        const top = base - h * 0.23 - h * 0.055;
        out += `<rect x="${x - w * 0.006}" y="${top}" width="${w * 0.012}" height="${h * 0.055}" fill="#ffe9c9"/>`;
        out += `<g filter="url(#soft)"><ellipse cx="${x}" cy="${top - h * 0.012}" rx="${w * 0.012}" ry="${h * 0.018}" fill="#ffcf6b"/></g>`;
      }
      return out;
    }

    case "globos": {
      let out = bokeh(p, w, h, next, 8);
      for (let i = 0; i < 11; i += 1) {
        const x = w * (0.12 + next() * 0.76);
        const y = h * (0.12 + next() * 0.5);
        const r = w * (0.055 + next() * 0.05);
        const color = p.luces[Math.floor(next() * p.luces.length)];
        out += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.18}" fill="${color}" opacity="0.9"/>`;
        out += `<path d="M ${x} ${y + r * 1.18} Q ${x + r * 0.4} ${y + r * 2.2} ${x - r * 0.2} ${h}"
          stroke="#ffffff" stroke-opacity="0.25" stroke-width="${w * 0.003}" fill="none"/>`;
      }
      return out;
    }

    case "bengalas": {
      let out = bokeh(p, w, h, next, 6);
      for (let b = 0; b < 3; b += 1) {
        const x = w * (0.25 + next() * 0.5);
        const y = h * (0.3 + next() * 0.35);
        out += `<g filter="url(#soft)">`;
        for (let i = 0; i < 40; i += 1) {
          const ang = next() * Math.PI * 2;
          const len = w * (0.03 + next() * 0.13);
          out += `<line x1="${x}" y1="${y}" x2="${x + Math.cos(ang) * len}" y2="${y + Math.sin(ang) * len}"
            stroke="${p.acento}" stroke-width="${w * 0.0035}" opacity="${0.35 + next() * 0.5}"/>`;
        }
        out += `<circle cx="${x}" cy="${y}" r="${w * 0.02}" fill="#fff8e0"/></g>`;
      }
      return out;
    }

    case "pista": {
      let out = bokeh(p, w, h, next, 14);
      // Haces de luz desde arriba.
      for (let i = 0; i < 6; i += 1) {
        const x = w * (0.1 + next() * 0.8);
        out += `<polygon points="${x},0 ${x - w * 0.16},${h} ${x + w * 0.16},${h}"
          fill="${p.luces[i % p.luces.length]}" opacity="0.1"/>`;
      }
      // Siluetas de gente bailando, sin rasgos.
      for (let i = 0; i < 7; i += 1) {
        const x = w * (0.08 + (i * 0.84) / 6 + (next() - 0.5) * 0.06);
        const alto = h * (0.3 + next() * 0.16);
        const y = h * 0.98;
        const ancho = alto * 0.2;
        out += `<g fill="#000" opacity="0.62">
          <ellipse cx="${x}" cy="${y - alto}" rx="${ancho * 0.42}" ry="${ancho * 0.5}"/>
          <rect x="${x - ancho / 2}" y="${y - alto + ancho * 0.45}" width="${ancho}" height="${alto - ancho * 0.45}" rx="${ancho * 0.45}"/>
        </g>`;
      }
      return out;
    }

    case "mesa": {
      let out = bokeh(p, w, h, next, 8);
      out += `<rect x="0" y="${h * 0.6}" width="${w}" height="${h * 0.4}" fill="#f3e7d3" opacity="0.9"/>`;
      // Copas y velas sobre el mantel.
      for (let i = 0; i < 6; i += 1) {
        const x = w * (0.1 + (i * 0.8) / 5);
        const y = h * 0.6;
        out += `<path d="M ${x - w * 0.028} ${y - h * 0.12} L ${x + w * 0.028} ${y - h * 0.12}
          L ${x + w * 0.008} ${y - h * 0.045} L ${x + w * 0.008} ${y} L ${x - w * 0.008} ${y}
          L ${x - w * 0.008} ${y - h * 0.045} Z" fill="#ffffff" opacity="0.5"/>`;
        out += `<path d="M ${x - w * 0.024} ${y - h * 0.105} L ${x + w * 0.024} ${y - h * 0.105}
          L ${x + w * 0.007} ${y - h * 0.05} L ${x - w * 0.007} ${y - h * 0.05} Z" fill="${p.acento}" opacity="0.75"/>`;
      }
      return out;
    }

    case "brindis": {
      let out = bokeh(p, w, h, next, 16);
      // Dos copas chocando en primer plano, a contraluz.
      const y = h * 0.62;
      for (const dir of [-1, 1]) {
        const x = cx + dir * w * 0.11;
        out += `<g fill="#000" opacity="0.55" transform="rotate(${dir * 14} ${x} ${y})">
          <path d="M ${x - w * 0.07} ${y - h * 0.2} L ${x + w * 0.07} ${y - h * 0.2}
            L ${x + w * 0.018} ${y - h * 0.06} L ${x + w * 0.018} ${y + h * 0.16}
            L ${x - w * 0.018} ${y + h * 0.16} L ${x - w * 0.018} ${y - h * 0.06} Z"/>
        </g>`;
      }
      out += `<g filter="url(#soft)"><circle cx="${cx}" cy="${y - h * 0.18}" r="${w * 0.05}" fill="#fff2cf" opacity="0.8"/></g>`;
      return out;
    }
  }
}

/** Viñeta y grano: lo que separa un dibujo plano de algo que parece una foto. */
function acabado(w: number, h: number) {
  return `
    <defs>
      <radialGradient id="vig" cx="0.5" cy="0.45" r="0.75">
        <stop offset="55%" stop-color="#000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.55"/>
      </radialGradient>
      <filter id="grano">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#vig)"/>
    <rect width="${w}" height="${h}" filter="url(#grano)" opacity="0.055"/>`;
}

export interface GeneratedPhoto {
  buffer: Buffer;
  width: number;
  height: number;
  escena: Escena;
}

export async function partyImage(seed: number): Promise<GeneratedPhoto> {
  const next = rng(seed * 2654435761);
  const palette = PALETTES[Math.floor(next() * PALETTES.length)];
  const tipo = NOMBRE_ESCENAS[Math.floor(next() * NOMBRE_ESCENAS.length)];

  // Proporciones mezcladas, como una galería real: sobre todo vertical, que es
  // como se sostiene el teléfono en una fiesta.
  const vertical = next() < 0.62;
  const width = vertical ? 1080 : 1440;
  const height = vertical ? 1440 : 1080;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${fondo(palette, width, height)}
    ${escena(tipo, palette, width, height, next)}
    ${acabado(width, height)}
  </svg>`;

  const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return { buffer, width, height, escena: tipo };
}
