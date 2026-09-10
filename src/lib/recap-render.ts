import {
  type RecapFilm,
  type RecapScene,
  easeOut,
  fadeAt,
  shotAt,
} from "@/lib/recap-film";

/**
 * El dibujo del video para redes, fotograma a fotograma sobre un canvas.
 *
 * `drawRecapFrame` es una función del tiempo y de nada más: dado el segundo `t`
 * pinta lo que hay que ver en ese instante. Eso es lo que permite que el mismo
 * código sirva para la vista previa que corre en bucle en el panel, para la
 * grabación de verdad y para sacar una portada suelta en un JPEG — tres cosas
 * que de otro modo se irían pareciendo cada vez menos.
 *
 * Todo se mide en fracciones del ancho, nunca en píxeles: el mismo dibujo tiene
 * que salir bien en 1080×1920 y en 1080×1080.
 */

export interface RecapPalette {
  top: string;
  bottom: string;
  accent: string;
  paper: string;
}

/** Familias tipográficas ya resueltas. El canvas necesita nombres reales. */
export interface RecapFonts {
  display: string;
  body: string;
}

export interface RecapStage {
  film: RecapFilm;
  palette: RecapPalette;
  fonts: RecapFonts;
  images: Map<string, HTMLImageElement>;
  width: number;
  height: number;
}

/* ─────────────────────────────── Utilidades ─────────────────────────────── */

function rgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Texto con espaciado entre letras, dibujado carácter a carácter.
 *
 * `ctx.letterSpacing` existe pero no en todas partes, y en las versalitas
 * pequeñas el espaciado no es un adorno: sin él dejan de leerse como una
 * etiqueta y parecen una palabra mal escrita.
 */
function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  spacing: number
): void {
  const chars = [...text];
  const width =
    chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) + spacing * (chars.length - 1);
  let x = cx - width / 2;
  for (const char of chars) {
    ctx.fillText(char, x, y);
    x += ctx.measureText(char).width + spacing;
  }
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * El tamaño más grande con el que el texto cabe en el ancho y en las líneas
 * disponibles. Un nombre largo no puede desbordar el fotograma: en el recuerdo
 * en pantalla el navegador lo resolvería solo, aquí no hay quien lo haga.
 */
function fitSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  maxWidth: number,
  maxLines: number,
  from: number,
  to: number
): { size: number; lines: string[] } {
  for (let size = from; size > to; size -= Math.max(1, Math.round(from / 40))) {
    ctx.font = font(size);
    const lines = wrapLines(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = font(to);
  return { size: to, lines: wrapLines(ctx, text, maxWidth).slice(0, maxLines) };
}

/** Dibuja una imagen recortada para llenar el hueco, con zoom y desplazamiento. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  scale = 1,
  panX = 0,
  panY = 0
): void {
  const ratio = Math.max(w / image.naturalWidth, h / image.naturalHeight) * scale;
  const drawWidth = image.naturalWidth * ratio;
  const drawHeight = image.naturalHeight * ratio;
  ctx.drawImage(
    image,
    x + (w - drawWidth) / 2 + panX * w,
    y + (h - drawHeight) / 2 + panY * h,
    drawWidth,
    drawHeight
  );
}

function roundedClip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();
}

/* ──────────────────────────── Grano de película ─────────────────────────── */

let grainTile: HTMLCanvasElement | null = null;

/**
 * Una loseta de ruido que se genera una vez y se repite. Un degradado limpio a
 * 1080 px de ancho enseña bandas en cuanto se comprime el video; el grano las
 * rompe. Generar ruido de dos millones de píxeles en cada fotograma costaría
 * más que todo lo demás junto.
 */
function getGrain(): HTMLCanvasElement {
  if (grainTile) return grainTile;

  const size = 128;
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const context = tile.getContext("2d")!;
  const data = context.createImageData(size, size);

  for (let i = 0; i < data.data.length; i += 4) {
    const value = 120 + Math.random() * 135;
    data.data[i] = value;
    data.data[i + 1] = value;
    data.data[i + 2] = value;
    data.data[i + 3] = 255;
  }

  context.putImageData(data, 0, 0);
  grainTile = tile;
  return tile;
}

/* ──────────────────────────────── El fondo ──────────────────────────────── */

function drawBackground(ctx: CanvasRenderingContext2D, stage: RecapStage, t: number): void {
  const { width: w, height: h, palette } = stage;

  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, palette.top);
  gradient.addColorStop(1, palette.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Un halo del color de acento que deriva despacio. Es lo que hace que el
  // fondo esté vivo entre plano y plano sin que nada se mueva de verdad.
  const driftX = 0.5 + Math.sin(t * 0.22) * 0.12;
  const driftY = 0.38 + Math.cos(t * 0.17) * 0.08;
  const glow = ctx.createRadialGradient(
    w * driftX,
    h * driftY,
    0,
    w * driftX,
    h * driftY,
    w * 0.85
  );
  glow.addColorStop(0, rgba(palette.accent, 0.16));
  glow.addColorStop(1, rgba(palette.accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function drawVignetteAndGrain(ctx: CanvasRenderingContext2D, stage: RecapStage): void {
  const { width: w, height: h } = stage;

  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.32, w / 2, h / 2, h * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.globalCompositeOperation = "overlay";
  const pattern = ctx.createPattern(getGrain(), "repeat");
  if (pattern) {
    // Se mueve la loseta cada fotograma: si no, el grano se queda quieto y
    // parece suciedad en la lente en vez de película.
    ctx.translate(Math.random() * 128, Math.random() * 128);
    ctx.fillStyle = pattern;
    ctx.fillRect(-128, -128, w + 256, h + 256);
  }
  ctx.restore();
}

/* ─────────────────────────────── Los planos ─────────────────────────────── */

/** Zona segura: en vertical, Instagram tapa arriba y abajo con su interfaz. */
function safeInset(stage: RecapStage): number {
  const tall = stage.height / stage.width > 1.5;
  return stage.height * (tall ? 0.14 : 0.07);
}

/** Desplazamiento y opacidad de un elemento que entra, con retardo. */
function enter(local: number, delay: number): { alpha: number; offset: number } {
  const progress = easeOut((local - delay) / 0.75);
  return { alpha: progress, offset: (1 - progress) * 40 };
}

function drawTitle(
  ctx: CanvasRenderingContext2D,
  stage: RecapStage,
  scene: Extract<RecapScene, { kind: "title" }>,
  local: number
): void {
  // El plano entra y sale con un fundido que ya viene aplicado; cada trazo
  // lo multiplica en vez de pisarlo.
  const base = ctx.globalAlpha;
  const { width: w, height: h, palette, fonts } = stage;
  const maxWidth = w * 0.82;
  const center = h / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const eyebrow = enter(local, 0);
  ctx.globalAlpha = base * eyebrow.alpha;
  ctx.fillStyle = rgba(palette.paper, 0.72);
  ctx.font = `500 ${w * 0.028}px ${fonts.body}`;
  drawTracked(ctx, "EL RECUERDO DE", w / 2, center - h * 0.19 + eyebrow.offset, w * 0.012);

  const title = enter(local, 0.12);
  const fitted = fitSize(
    ctx,
    scene.title,
    (size) => `${size}px ${fonts.display}`,
    maxWidth,
    2,
    w * 0.19,
    w * 0.075
  );
  ctx.globalAlpha = base * title.alpha;
  ctx.fillStyle = palette.paper;
  ctx.font = `${fitted.size}px ${fonts.display}`;
  fitted.lines.forEach((line, index) => {
    ctx.fillText(line, w / 2, center - h * 0.055 + index * fitted.size * 0.95 + title.offset);
  });

  if (scene.highlight) {
    const highlight = enter(local, 0.24);
    ctx.globalAlpha = base * highlight.alpha;
    ctx.fillStyle = palette.accent;
    ctx.font = `${w * 0.13}px ${fonts.display}`;
    ctx.fillText(
      scene.highlight,
      w / 2,
      center + h * 0.045 + fitted.lines.length * 4 + highlight.offset
    );
  }

  const date = enter(local, 0.36);
  ctx.globalAlpha = base * date.alpha;
  ctx.fillStyle = rgba(palette.paper, 0.7);
  ctx.font = `500 ${w * 0.026}px ${fonts.body}`;
  drawTracked(ctx, scene.dateLabel.toUpperCase(), w / 2, center + h * 0.15 + date.offset, w * 0.01);

  // Un filete corto bajo la fecha. Remata la composición y da una referencia de
  // ancho que el texto centrado por sí solo no tiene.
  ctx.globalAlpha = base * date.alpha * 0.6;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = Math.max(1, w * 0.002);
  ctx.beginPath();
  ctx.moveTo(w / 2 - w * 0.07, center + h * 0.185 + date.offset);
  ctx.lineTo(w / 2 + w * 0.07, center + h * 0.185 + date.offset);
  ctx.stroke();
}

function drawStat(
  ctx: CanvasRenderingContext2D,
  stage: RecapStage,
  scene: Extract<RecapScene, { kind: "stat" }>,
  local: number,
  duration: number
): void {
  // El plano entra y sale con un fundido que ya viene aplicado; cada trazo
  // lo multiplica en vez de pisarlo.
  const base = ctx.globalAlpha;
  const { width: w, height: h, palette, fonts } = stage;
  const center = h / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const eyebrow = enter(local, 0);
  ctx.globalAlpha = base * eyebrow.alpha;
  ctx.fillStyle = rgba(palette.paper, 0.72);
  ctx.font = `500 ${w * 0.028}px ${fonts.body}`;
  drawTracked(
    ctx,
    scene.eyebrow.toUpperCase(),
    w / 2,
    center - h * 0.13 + eyebrow.offset,
    w * 0.012
  );

  // La cifra sube desde cero durante la primera mitad del plano. Un número que
  // aparece ya puesto es un dato; uno que sube es un resultado.
  const counted = Math.round(scene.value * easeOut(local / (duration * 0.55)));
  ctx.globalAlpha = base * enter(local, 0.08).alpha;
  ctx.fillStyle = palette.accent;
  ctx.font = `${w * 0.32}px ${fonts.display}`;
  ctx.fillText(String(counted), w / 2, center + h * 0.005);

  const unit = enter(local, 0.2);
  ctx.globalAlpha = base * unit.alpha;
  ctx.fillStyle = palette.paper;
  ctx.font = `${w * 0.075}px ${fonts.display}`;
  ctx.fillText(scene.unit, w / 2, center + h * 0.115 + unit.offset);
}

function drawPhoto(
  ctx: CanvasRenderingContext2D,
  stage: RecapStage,
  scene: Extract<RecapScene, { kind: "photo" }>,
  local: number,
  progress: number
): void {
  // El plano entra y sale con un fundido que ya viene aplicado; cada trazo
  // lo multiplica en vez de pisarlo.
  const base = ctx.globalAlpha;
  const { width: w, height: h, palette, fonts, images } = stage;
  const image = images.get(scene.url);

  if (image) {
    ctx.save();
    // Ken Burns: la foto entra ya moviéndose y no para. Quieta a pantalla
    // completa parece un error de reproducción.
    drawCover(ctx, image, 0, 0, w, h, 1.06 + progress * 0.1, (progress - 0.5) * 0.04, 0);
    ctx.restore();

    const scrim = ctx.createLinearGradient(0, h * 0.45, 0, h);
    scrim.addColorStop(0, "rgba(0,0,0,0)");
    scrim.addColorStop(1, "rgba(0,0,0,0.82)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, h * 0.45, w, h * 0.55);
  }

  const inset = safeInset(stage);
  const pad = w * 0.09;
  let y = h - inset - w * 0.03;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const author = enter(local, 0.2);
  ctx.globalAlpha = base * author.alpha;
  ctx.fillStyle = rgba(palette.paper, 0.78);
  ctx.font = `500 ${w * 0.026}px ${fonts.body}`;
  ctx.fillText(scene.author.toUpperCase(), pad, y + author.offset);

  if (scene.caption) {
    const caption = enter(local, 0.1);
    const fitted = fitSize(
      ctx,
      `“${scene.caption}”`,
      (size) => `${size}px ${fonts.display}`,
      w - pad * 2,
      3,
      w * 0.075,
      w * 0.042
    );
    ctx.globalAlpha = base * caption.alpha;
    ctx.fillStyle = palette.paper;
    ctx.font = `${fitted.size}px ${fonts.display}`;
    y -= w * 0.055;
    for (let index = fitted.lines.length - 1; index >= 0; index -= 1) {
      ctx.fillText(fitted.lines[index], pad, y + caption.offset);
      y -= fitted.size * 1.18;
    }
  }
}

function drawCollage(
  ctx: CanvasRenderingContext2D,
  stage: RecapStage,
  scene: Extract<RecapScene, { kind: "collage" }>,
  local: number,
  progress: number
): void {
  // El plano entra y sale con un fundido que ya viene aplicado; cada trazo
  // lo multiplica en vez de pisarlo.
  const base = ctx.globalAlpha;
  const { width: w, height: h, palette, images } = stage;
  const urls = scene.urls.slice(0, 4);
  if (urls.length === 0) return;

  const inset = safeInset(stage);
  const gap = w * 0.035;
  const pad = w * 0.09;
  const areaWidth = w - pad * 2;
  const areaHeight = h - inset * 2;

  const columns = urls.length === 1 ? 1 : 2;
  const rows = Math.ceil(urls.length / columns);
  const cellWidth = (areaWidth - gap * (columns - 1)) / columns;
  const cellHeight = Math.min((areaHeight - gap * (rows - 1)) / rows, cellWidth * 1.3);

  const totalHeight = cellHeight * rows + gap * (rows - 1);
  const originY = (h - totalHeight) / 2;

  urls.forEach((url, index) => {
    const image = images.get(url);
    if (!image) return;

    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = pad + column * (cellWidth + gap);
    // Las de la segunda columna caen un poco: cuatro fotos alineadas parecen un
    // catálogo, y esto es un recuerdo.
    const y = originY + row * (cellHeight + gap) + (column === 1 ? gap * 1.4 : 0);

    const step = enter(local, 0.06 * index);

    ctx.save();
    ctx.globalAlpha = base * step.alpha;
    ctx.translate(x + cellWidth / 2, y + cellHeight / 2 + step.offset);
    ctx.rotate(((index % 2 === 0 ? -1.5 : 1.7) * Math.PI) / 180);
    ctx.translate(-cellWidth / 2, -cellHeight / 2);

    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = w * 0.05;
    ctx.shadowOffsetY = w * 0.015;
    ctx.fillStyle = rgba(palette.paper, 0.1);
    ctx.beginPath();
    ctx.roundRect(0, 0, cellWidth, cellHeight, w * 0.03);
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.save();
    roundedClip(ctx, 0, 0, cellWidth, cellHeight, w * 0.03);
    drawCover(ctx, image, 0, 0, cellWidth, cellHeight, 1.04 + progress * 0.05);
    ctx.restore();

    ctx.strokeStyle = rgba(palette.paper, 0.22);
    ctx.lineWidth = Math.max(1, w * 0.0025);
    ctx.beginPath();
    ctx.roundRect(0, 0, cellWidth, cellHeight, w * 0.03);
    ctx.stroke();
    ctx.restore();
  });
}

function drawQuote(
  ctx: CanvasRenderingContext2D,
  stage: RecapStage,
  scene: Extract<RecapScene, { kind: "quote" }>,
  local: number
): void {
  // El plano entra y sale con un fundido que ya viene aplicado; cada trazo
  // lo multiplica en vez de pisarlo.
  const base = ctx.globalAlpha;
  const { width: w, height: h, palette, fonts } = stage;
  const center = h / 2;
  const maxWidth = w * 0.8;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const mark = enter(local, 0);
  ctx.globalAlpha = base * mark.alpha * 0.55;
  ctx.fillStyle = palette.accent;
  ctx.font = `${w * 0.22}px ${fonts.display}`;
  ctx.fillText("”", w / 2, center - h * 0.16 + mark.offset);

  const body = enter(local, 0.12);
  const fitted = fitSize(
    ctx,
    scene.text,
    (size) => `${size}px ${fonts.display}`,
    maxWidth,
    5,
    w * 0.085,
    w * 0.042
  );
  ctx.globalAlpha = base * body.alpha;
  ctx.fillStyle = palette.paper;
  ctx.font = `${fitted.size}px ${fonts.display}`;

  const lineHeight = fitted.size * 1.24;
  const startY = center - ((fitted.lines.length - 1) * lineHeight) / 2;
  fitted.lines.forEach((line, index) => {
    ctx.fillText(line, w / 2, startY + index * lineHeight + body.offset);
  });

  const author = enter(local, 0.3);
  ctx.globalAlpha = base * author.alpha;
  ctx.fillStyle = rgba(palette.paper, 0.72);
  ctx.font = `500 ${w * 0.026}px ${fonts.body}`;
  drawTracked(
    ctx,
    scene.author.toUpperCase(),
    w / 2,
    startY + fitted.lines.length * lineHeight + h * 0.03 + author.offset,
    w * 0.01
  );
}

function drawEnd(
  ctx: CanvasRenderingContext2D,
  stage: RecapStage,
  scene: Extract<RecapScene, { kind: "end" }>,
  local: number
): void {
  // El plano entra y sale con un fundido que ya viene aplicado; cada trazo
  // lo multiplica en vez de pisarlo.
  const base = ctx.globalAlpha;
  const { width: w, height: h, palette, fonts } = stage;
  const center = h / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const title = enter(local, 0);
  const fitted = fitSize(
    ctx,
    scene.title,
    (size) => `${size}px ${fonts.display}`,
    w * 0.8,
    2,
    w * 0.14,
    w * 0.07
  );
  ctx.globalAlpha = base * title.alpha;
  ctx.fillStyle = palette.paper;
  ctx.font = `${fitted.size}px ${fonts.display}`;
  fitted.lines.forEach((line, index) => {
    ctx.fillText(line, w / 2, center - h * 0.02 + index * fitted.size + title.offset);
  });

  const note = enter(local, 0.18);
  ctx.globalAlpha = base * note.alpha;
  ctx.fillStyle = rgba(palette.paper, 0.72);
  ctx.font = `500 ${w * 0.026}px ${fonts.body}`;
  drawTracked(ctx, scene.note.toUpperCase(), w / 2, center + h * 0.075 + note.offset, w * 0.01);
}

/* ──────────────────────────────── Entrada ───────────────────────────────── */

/** Todas las imágenes que hacen falta, sin repetir. */
export function collectImageUrls(scenes: RecapScene[]): string[] {
  const urls = new Set<string>();
  for (const scene of scenes) {
    if (scene.kind === "photo") urls.add(scene.url);
    if (scene.kind === "collage") for (const url of scene.urls) urls.add(url);
  }
  return [...urls];
}

/**
 * Carga las imágenes antes de grabar.
 *
 * `crossOrigin` es obligatorio y no opcional: dibujar en el canvas una imagen de
 * otro origen sin CORS lo "contamina", y un canvas contaminado no se puede
 * grabar. El fallo no sería un error visible, sería un video que no existe.
 *
 * Una imagen que no cargue se omite: mejor un video con un hueco menos que
 * ningún video.
 */
export async function loadRecapImages(urls: string[]): Promise<Map<string, HTMLImageElement>> {
  const entries = await Promise.all(
    urls.map(
      (url) =>
        new Promise<[string, HTMLImageElement] | null>((resolve) => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.onload = () => resolve([url, image]);
          image.onerror = () => resolve(null);
          image.src = url;
        })
    )
  );

  return new Map(entries.filter((entry): entry is [string, HTMLImageElement] => entry !== null));
}

/** Pinta el fotograma que corresponde al segundo `t`. */
export function drawRecapFrame(ctx: CanvasRenderingContext2D, stage: RecapStage, t: number): void {
  ctx.save();
  ctx.globalAlpha = 1;
  drawBackground(ctx, stage, t);

  const current = shotAt(stage.film, t);
  if (current) {
    const { shot, local, progress } = current;
    ctx.save();
    ctx.globalAlpha = fadeAt(local, shot.duration);

    switch (shot.scene.kind) {
      case "title":
        drawTitle(ctx, stage, shot.scene, local);
        break;
      case "stat":
        drawStat(ctx, stage, shot.scene, local, shot.duration);
        break;
      case "photo":
        drawPhoto(ctx, stage, shot.scene, local, progress);
        break;
      case "collage":
        drawCollage(ctx, stage, shot.scene, local, progress);
        break;
      case "quote":
        drawQuote(ctx, stage, shot.scene, local);
        break;
      case "end":
        drawEnd(ctx, stage, shot.scene, local);
        break;
    }

    ctx.restore();
  }

  ctx.globalAlpha = 1;
  drawVignetteAndGrain(ctx, stage);
  ctx.restore();
}
