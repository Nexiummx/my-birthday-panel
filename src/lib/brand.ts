/**
 * La marca, en un solo sitio.
 *
 * ⚠ NOMBRE Y LOGO PENDIENTES. Están aquí y no repartidos por la portada a
 * propósito: cuando se decidan, se cambian estas líneas y cambia todo —la
 * portada, la pestaña del navegador, el pie, el correo— sin tocar un
 * componente. El nombre además se puede sobrescribir por entorno para poder
 * probar candidatos sin desplegar código.
 *
 * El monograma se dibuja a partir de la inicial, así que tampoco hay que
 * esperar a tener un logo para que la portada se vea terminada.
 */

export const BRAND = {
  /** PENDIENTE de decidir. Se puede probar otro con NEXT_PUBLIC_BRAND_NAME. */
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "Invitaciones",
  /** Lo que se dice debajo del nombre, en versalitas. */
  kicker: "Invitaciones digitales",
  /** Una línea que explique el producto a quien no lo conoce. */
  tagline: "Una invitación distinta para cada invitado",
  /** Para el pie y los textos legales. */
  legalName: "Nexium",
} as const;

/** La inicial que se dibuja dentro del sello mientras no haya logo. */
export const BRAND_INITIAL = BRAND.name.trim().charAt(0).toUpperCase() || "I";
