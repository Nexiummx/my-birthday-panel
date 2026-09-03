/**
 * Biblioteca botánica en SVG.
 *
 * Todas las piezas son deterministas (sin Math.random) para que el marcado del
 * servidor y del cliente coincidan, y son puramente declarativas: no animan por
 * sí mismas. El movimiento lo aplica quien las usa, con una clase CSS sobre el
 * grupo contenedor — así se animan decenas de hojas con una sola transformación
 * en GPU en lugar de una por nodo.
 */

type Point = readonly [number, number];

/**
 * Redondea a 3 decimales. Node y los motores de los navegadores difieren en el
 * último bit de `Math.atan2`, y esa diferencia bastaba para romper la
 * hidratación: fijando la precisión, servidor y cliente emiten el mismo SVG.
 */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Punto sobre una curva cúbica de Bézier. */
function bezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const u = 1 - t;
  const x =
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
  const y =
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
  return [round(x), round(y)];
}

/** Ángulo (grados) de la tangente de la curva: orienta las hojas con el tallo. */
function bezierAngle(t: number, p0: Point, p1: Point, p2: Point, p3: Point): number {
  const u = 1 - t;
  const dx =
    3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy =
    3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return round((Math.atan2(dy, dx) * 180) / Math.PI);
}

/** Hoja apuntando hacia +x, con el peciolo en el origen. */
export function Leaf({
  length = 34,
  width = 16,
  fill = "var(--color-olive-600)",
  vein = "rgb(0 0 0 / 0.18)",
}: {
  length?: number;
  width?: number;
  fill?: string;
  vein?: string;
}) {
  const half = width / 2;
  return (
    <g>
      <path
        d={`M0 0 C ${length * 0.25} ${-half} ${length * 0.7} ${-half * 1.1} ${length} 0 C ${length * 0.7} ${half * 1.1} ${length * 0.25} ${half} 0 0 Z`}
        fill={fill}
      />
      <path
        d={`M2 0 L ${length - 3} 0`}
        stroke={vein}
        strokeWidth={0.9}
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}

/**
 * Rama con hojas distribuidas a lo largo de una curva.
 * El tallo nace en (0,0) y crece hacia la derecha; el llamador la rota.
 */
export function Sprig({
  length = 200,
  bend = -70,
  leaves = 9,
  leafLength = 34,
  leafWidth = 15,
  spread = 46,
  fill = "var(--color-olive-600)",
  stemColor = "var(--color-olive-700)",
  stemWidth = 3,
  tipLeaf = true,
}: {
  length?: number;
  bend?: number;
  leaves?: number;
  leafLength?: number;
  leafWidth?: number;
  spread?: number;
  fill?: string;
  stemColor?: string;
  stemWidth?: number;
  tipLeaf?: boolean;
}) {
  const p0: Point = [0, 0];
  const p1: Point = [length * 0.3, bend * 0.25];
  const p2: Point = [length * 0.7, bend * 0.8];
  const p3: Point = [length, bend];

  const nodes = Array.from({ length: leaves }, (_, index) => {
    const t = 0.16 + (index / Math.max(leaves - 1, 1)) * 0.78;
    const [x, y] = bezierPoint(t, p0, p1, p2, p3);
    const angle = bezierAngle(t, p0, p1, p2, p3);
    const side = index % 2 === 0 ? -1 : 1;
    // Las hojas se acortan hacia la punta: aspecto natural, no mecánico.
    const scale = round(1 - t * 0.42);
    return { x, y, rotation: round(angle + side * spread), scale, key: index };
  });

  return (
    <g>
      <path
        d={`M${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${p3[0]} ${p3[1]}`}
        stroke={stemColor}
        strokeWidth={stemWidth}
        strokeLinecap="round"
        fill="none"
      />
      {nodes.map((node) => (
        <g
          key={node.key}
          transform={`translate(${node.x} ${node.y}) rotate(${node.rotation}) scale(${node.scale})`}
        >
          <Leaf length={leafLength} width={leafWidth} fill={fill} />
        </g>
      ))}
      {tipLeaf && (
        <g transform={`translate(${p3[0]} ${p3[1]}) rotate(${bezierAngle(1, p0, p1, p2, p3)})`}>
          <Leaf length={leafLength * 0.7} width={leafWidth * 0.7} fill={fill} />
        </g>
      )}
    </g>
  );
}

/** Helecho: tallo largo con hojas pequeñas y muy juntas. */
export function Fern({
  length = 240,
  bend = -120,
  fill = "var(--color-sage-400)",
  stemColor = "var(--color-olive-700)",
}: {
  length?: number;
  bend?: number;
  fill?: string;
  stemColor?: string;
}) {
  return (
    <Sprig
      length={length}
      bend={bend}
      leaves={16}
      leafLength={26}
      leafWidth={9}
      spread={62}
      fill={fill}
      stemColor={stemColor}
      stemWidth={2}
    />
  );
}

/** Flor de cinco pétalos con corazón dorado. */
export function Flower({
  radius = 13,
  petals = 5,
  petal = "var(--color-blush-300)",
  petalEdge = "var(--color-blush-400)",
  heart = "var(--color-gold-400)",
}: {
  radius?: number;
  petals?: number;
  petal?: string;
  petalEdge?: string;
  heart?: string;
}) {
  return (
    <g>
      {Array.from({ length: petals }, (_, index) => (
        <ellipse
          key={index}
          cx={radius * 0.72}
          cy={0}
          rx={radius * 0.72}
          ry={radius * 0.42}
          fill={index % 2 === 0 ? petal : petalEdge}
          transform={`rotate(${(360 / petals) * index})`}
          opacity={0.95}
        />
      ))}
      <circle r={radius * 0.26} fill={heart} />
    </g>
  );
}

/** Hongo de bosque: sombrerete con lunares y pie claro. */
export function Mushroom({
  size = 26,
  cap = "var(--color-blush-400)",
  stem = "var(--color-cream-200)",
  dots = "var(--color-cream-100)",
}: {
  size?: number;
  cap?: string;
  stem?: string;
  dots?: string;
}) {
  const w = size;
  return (
    <g>
      <path
        d={`M${-w * 0.16} 0 L ${-w * 0.2} ${-w * 0.55} L ${w * 0.2} ${-w * 0.55} L ${w * 0.16} 0 Z`}
        fill={stem}
      />
      <path
        d={`M${-w * 0.5} ${-w * 0.5} C ${-w * 0.48} ${-w * 1.05} ${w * 0.48} ${-w * 1.05} ${w * 0.5} ${-w * 0.5} Z`}
        fill={cap}
      />
      <circle cx={-w * 0.2} cy={-w * 0.68} r={w * 0.07} fill={dots} />
      <circle cx={w * 0.12} cy={-w * 0.76} r={w * 0.06} fill={dots} />
      <circle cx={w * 0.28} cy={-w * 0.6} r={w * 0.05} fill={dots} />
    </g>
  );
}

/** Mariposa estilizada; el llamador puede animarla con .animate-flutter. */
export function Butterfly({
  size = 22,
  wing = "var(--color-blush-200)",
  wingBack = "var(--color-gold-300)",
  body = "var(--color-olive-700)",
  opacity = 0.9,
}: {
  size?: number;
  wing?: string;
  wingBack?: string;
  body?: string;
  opacity?: number;
}) {
  const s = size;
  return (
    <g opacity={opacity}>
      <path
        d={`M0 0 C ${-s * 0.9} ${-s * 0.85} ${-s * 1.05} ${s * 0.2} 0 ${s * 0.18} Z`}
        fill={wingBack}
      />
      <path
        d={`M0 0 C ${s * 0.9} ${-s * 0.85} ${s * 1.05} ${s * 0.2} 0 ${s * 0.18} Z`}
        fill={wing}
      />
      <path
        d={`M0 ${-s * 0.32} C ${s * 0.12} ${-s * 0.1} ${s * 0.12} ${s * 0.28} 0 ${s * 0.45} C ${-s * 0.12} ${s * 0.28} ${-s * 0.12} ${-s * 0.1} 0 ${-s * 0.32} Z`}
        fill={body}
      />
      <path
        d={`M0 ${-s * 0.3} L ${-s * 0.3} ${-s * 0.6}`}
        stroke={body}
        strokeWidth={s * 0.05}
        strokeLinecap="round"
      />
      <path
        d={`M0 ${-s * 0.3} L ${s * 0.3} ${-s * 0.6}`}
        stroke={body}
        strokeWidth={s * 0.05}
        strokeLinecap="round"
      />
    </g>
  );
}

/** Baya / capullo pequeño para rellenar huecos entre ramas. */
export function Berries({
  color = "var(--color-blush-400)",
  size = 5,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <g fill={color}>
      <circle cx={0} cy={0} r={size} />
      <circle cx={size * 1.7} cy={size * 0.9} r={size * 0.8} />
      <circle cx={size * 0.4} cy={size * 2} r={size * 0.7} />
    </g>
  );
}

/**
 * Generador pseudoaleatorio determinista (LCG).
 * Da variación orgánica manteniendo idéntico el marcado en servidor y cliente.
 */
function seeded(seed: number): () => number {
  let state = seed * 9301 + 49297;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/** Ramillete de tres hojas: la unidad con la que se rompe cualquier silueta. */
export function LeafCluster({
  size = 30,
  fill = "var(--color-olive-600)",
}: {
  size?: number;
  fill?: string;
}) {
  return (
    <g>
      <g transform="rotate(-34)">
        <Leaf length={size * 0.82} width={size * 0.38} fill={fill} />
      </g>
      <Leaf length={size} width={size * 0.44} fill={fill} />
      <g transform="rotate(32)">
        <Leaf length={size * 0.78} width={size * 0.36} fill={fill} />
      </g>
    </g>
  );
}

/**
 * Masa de follaje: silueta orgánica que hace de fondo de las cortinas.
 *
 * El borde que mira al centro se construye con lóbulos de altura y profundidad
 * irregulares, no con una onda regular: así no se lee como una forma abstracta
 * sino como una masa de vegetación.
 */
export function FoliageMass({
  width = 520,
  height = 1000,
  lobes = 9,
  depth = 90,
  fill = "var(--color-forest-800)",
  opacity = 1,
  seed = 3,
}: {
  width?: number;
  height?: number;
  lobes?: number;
  depth?: number;
  fill?: string;
  opacity?: number;
  seed?: number;
}) {
  const random = seeded(seed);
  const step = height / lobes;
  let d = `M0 0 L ${round(width - depth * (0.6 + random() * 0.5))} 0`;

  for (let index = 0; index < lobes; index += 1) {
    const y1 = round((index + 1) * step + (random() - 0.5) * step * 0.5);
    const bulge = round(width - depth * (random() * 1.5 - 0.15));
    const pinch = round(width - depth * (0.55 + random() * 0.8));
    d += ` C ${bulge} ${round(y1 - step * 0.72)} ${bulge} ${round(y1 - step * 0.2)} ${pinch} ${y1}`;
  }

  d += ` L 0 ${height} Z`;

  return <path d={d} fill={fill} opacity={opacity} />;
}

/**
 * Franja de ramilletes repartidos a lo largo del filo interior de la cortina.
 * Es lo que convierte el borde en follaje reconocible; con ~24 ramilletes
 * (3 hojas cada uno) basta para dar densidad sin castigar el render.
 */
export function FoliageEdge({
  height = 1000,
  x = 690,
  jitter = 90,
  count = 24,
  size = 34,
  fill = "var(--color-olive-600)",
  seed = 11,
}: {
  height?: number;
  x?: number;
  jitter?: number;
  count?: number;
  size?: number;
  fill?: string;
  seed?: number;
}) {
  const random = seeded(seed);

  const items = Array.from({ length: count }, (_, index) => {
    const y = round(((index + 0.5) / count) * height + (random() - 0.5) * (height / count));
    const offsetX = round(x - random() * jitter);
    // Apuntan hacia el centro de la pantalla, abriéndose en abanico.
    const rotation = round((random() - 0.5) * 150);
    // Los ramilletes crecen hacia el exterior del panel: lo que está "más
    // cerca de la cámara" es más grande, y eso genera profundidad real.
    const depthFactor = 1 - Math.min(offsetX / Math.max(x, 1), 1) * 0.55;
    const scale = round((0.5 + random() * 0.75) * (0.75 + depthFactor));
    return { key: index, y, offsetX, rotation, scale };
  });

  return (
    <g>
      {items.map((item) => (
        <g
          key={item.key}
          transform={`translate(${item.offsetX} ${item.y}) rotate(${item.rotation}) scale(${item.scale})`}
        >
          <LeafCluster size={size} fill={fill} />
        </g>
      ))}
    </g>
  );
}
