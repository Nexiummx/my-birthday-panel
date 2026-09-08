import { Cinzel, Pacifico, Poppins, Rye } from "next/font/google";

/**
 * Tipografías propias de los temas.
 *
 * Las importan solo las páginas con tema —la invitación, la subida de fotos y
 * el recuerdo—, nunca el layout raíz, para que el panel no las cargue. Van con
 * `preload: false` a propósito: en una página solo se renderiza un tema, así
 * que precargar las cuatro desperdiciaría ancho de banda en las tres que no se
 * usan. El navegador descarga la que de verdad pinta texto.
 */
const rye = Rye({
  variable: "--font-rye",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const pacifico = Pacifico({
  variable: "--font-pacifico",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

/** Clases que exponen las variables CSS que consumen los bloques [data-theme]. */
export const themeFontVariables = [
  rye.variable,
  poppins.variable,
  pacifico.variable,
  cinzel.variable,
].join(" ");
