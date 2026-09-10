import { describe, expect, it } from "vitest";
import { toWhatsApp, formatPhone, whatsappLink, DEFAULT_COUNTRY_CODE } from "@/lib/phone";
import {
  DEFAULT_INVITE_MESSAGE,
  renderInviteMessage,
  usedPlaceholders,
} from "@/lib/invite-message";
import { countByStage, needsAction, stageOf } from "@/lib/invite-stage";
import { invitationPath } from "@/lib/utils";

/**
 * La ruta pública agrupa por evento. El prefijo /e/ no es decorativo: es lo que
 * impide que un evento llamado "precios" o una página nueva de la aplicación se
 * queden con la URL del otro.
 */
describe("invitationPath", () => {
  it("mete el evento delante del invitado", () => {
    expect(invitationPath("xv-de-sofia", "mariana-lopez-k3m9q2p")).toBe(
      "/e/xv-de-sofia/i/mariana-lopez-k3m9q2p"
    );
  });

  it("vive bajo /e/, fuera del espacio de rutas de la aplicación", () => {
    // Un evento no puede pisar /admin, /precios ni lo que se estrene mañana.
    expect(invitationPath("admin", "ana-k3m9q2p").startsWith("/e/")).toBe(true);
  });
});

describe("toWhatsApp", () => {
  it("añade la lada del país a un número nacional", () => {
    expect(toWhatsApp("5512345678").wa).toBe(`${DEFAULT_COUNTRY_CODE}5512345678`);
  });

  it("ignora espacios, guiones y paréntesis, que es como los escribe la gente", () => {
    expect(toWhatsApp("(618) 123-4567").wa).toBe(`${DEFAULT_COUNTRY_CODE}6181234567`);
    expect(toWhatsApp("55 1234 5678").wa).toBe(`${DEFAULT_COUNTRY_CODE}5512345678`);
  });

  it("respeta un número que ya trae lada", () => {
    expect(toWhatsApp("+52 1 618 123 4567").wa).toBe("5216181234567");
    expect(toWhatsApp("+1 415 555 0132").wa).toBe("14155550132");
  });

  it("rechaza lo que no es un teléfono, diciendo por qué", () => {
    expect(toWhatsApp("")).toEqual({ wa: null, problem: "vacio" });
    expect(toWhatsApp("   ")).toEqual({ wa: null, problem: "vacio" });
    expect(toWhatsApp("no tiene")).toEqual({ wa: null, problem: "vacio" });
    expect(toWhatsApp("123").problem).toBe("corto");
    expect(toWhatsApp("1234567890123456789").problem).toBe("largo");
  });
});

describe("whatsappLink", () => {
  it("sin número abre el selector de WhatsApp, no un enlace roto", () => {
    // Sigue ahorrándole escribir el mensaje aunque no tengamos el teléfono.
    expect(whatsappLink(null, "hola")).toBe("https://wa.me/?text=hola");
  });

  it("escapa el mensaje", () => {
    const link = whatsappLink("5512345678", "Hola & bienvenida: https://x.mx/i/ana");
    expect(link).toContain("wa.me/525512345678");
    expect(link).not.toContain(" ");
    expect(decodeURIComponent(link.split("text=")[1])).toContain("https://x.mx/i/ana");
  });
});

describe("formatPhone", () => {
  it("devuelve lo que escribió el anfitrión si no se puede interpretar", () => {
    // Nunca se le pisa el dato: si no lo entendemos, se lo enseñamos tal cual
    // para que pueda corregirlo.
    expect(formatPhone("ext 220")).toBe("ext 220");
    expect(formatPhone("")).toBeNull();
    expect(formatPhone("5512345678")).toBe("+52 551 234 5678");
  });
});

describe("renderInviteMessage", () => {
  const vars = {
    invitado: "Ana García",
    evento: "Maya · 29",
    fecha: "26 de septiembre",
    enlace: "https://x.mx/i/ana-garcia",
  };

  it("sustituye los marcadores conocidos", () => {
    expect(renderInviteMessage("Hola {invitado}, {evento} el {fecha}: {enlace}", vars)).toBe(
      "Hola Ana García, Maya · 29 el 26 de septiembre: https://x.mx/i/ana-garcia"
    );
  });

  it("deja intactos los que no existen", () => {
    // Que desaparezcan en silencio haría creer al anfitrión que funcionan.
    expect(renderInviteMessage("Hola {invitado} {precio}", vars)).toBe("Hola Ana García {precio}");
  });

  it("una plantilla vacía cae a la de fábrica", () => {
    expect(renderInviteMessage("", vars)).toContain("Ana García");
    expect(renderInviteMessage(null, vars)).toContain("https://x.mx/i/ana-garcia");
    expect(renderInviteMessage("   ", vars)).toBe(renderInviteMessage(null, vars));
  });

  it("la de fábrica usa los cuatro marcadores", () => {
    expect(usedPlaceholders(DEFAULT_INVITE_MESSAGE).sort()).toEqual([
      "enlace",
      "evento",
      "fecha",
      "invitado",
    ]);
  });

  it("no repite la sustitución sobre lo ya sustituido", () => {
    // Si el nombre del invitado fuera "{enlace}", una implementación ingenua
    // acabaría metiendo la URL en su lugar.
    expect(
      renderInviteMessage("Hola {invitado}", { ...vars, invitado: "{enlace}" })
    ).toBe("Hola {enlace}");
  });
});

describe("stageOf", () => {
  const base = { status: "PENDING", sentAt: null, firstViewedAt: null };

  it("recorre el camino completo", () => {
    expect(stageOf(base)).toBe("SIN_ENVIAR");
    expect(stageOf({ ...base, sentAt: new Date() })).toBe("ENVIADA");
    expect(stageOf({ ...base, sentAt: new Date(), firstViewedAt: new Date() })).toBe("ABIERTA");
  });

  it("una respuesta manda sobre cualquier otra señal", () => {
    // El anfitrión puede marcar a mano a quien le confirmó por teléfono, sin
    // que esa invitación se haya enviado ni abierto nunca.
    expect(stageOf({ ...base, status: "CONFIRMED" })).toBe("CONFIRMADA");
    expect(stageOf({ ...base, status: "DECLINED" })).toBe("DECLINADA");
  });

  it("abierta sin marcar como enviada sigue siendo abierta", () => {
    // Pasa de verdad: el anfitrión manda el enlace por su cuenta y no lo marca.
    expect(stageOf({ ...base, firstViewedAt: new Date() })).toBe("ABIERTA");
  });
});

describe("countByStage", () => {
  it("cuenta cada punto y deja en cero los vacíos", () => {
    const counts = countByStage([
      { status: "PENDING", sentAt: null, firstViewedAt: null },
      { status: "PENDING", sentAt: new Date(), firstViewedAt: null },
      { status: "CONFIRMED", sentAt: new Date(), firstViewedAt: new Date() },
    ]);
    expect(counts).toEqual({
      SIN_ENVIAR: 1,
      ENVIADA: 1,
      ABIERTA: 0,
      CONFIRMADA: 1,
      DECLINADA: 0,
    });
  });
});

describe("needsAction", () => {
  it("solo las que el anfitrión puede empujar", () => {
    expect(needsAction({ status: "PENDING", sentAt: null, firstViewedAt: null })).toBe(true);
    expect(needsAction({ status: "CONFIRMED", sentAt: null, firstViewedAt: null })).toBe(false);
    expect(needsAction({ status: "DECLINED", sentAt: null, firstViewedAt: null })).toBe(false);
  });
});

describe("toCsv", () => {
  it("separa por punto y coma y abre con BOM, que es lo que entiende Excel", async () => {
    const { toCsv } = await import("@/lib/csv");
    const csv = toCsv(["A", "B"], [["uno", "dos"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("A;B");
    expect(csv).toContain("uno;dos");
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("entrecomilla lo que llevaría separador, comillas o saltos de línea", async () => {
    const { toCsv } = await import("@/lib/csv");
    const csv = toCsv(["M"], [['dijo "sí"'], ["una;dos"], ["dos\nlíneas"]]);
    expect(csv).toContain('"dijo ""sí"""');
    expect(csv).toContain('"una;dos"');
    expect(csv).toContain('"dos\nlíneas"');
  });

  it("neutraliza las celdas que Excel trataría como fórmula", async () => {
    // Un invitado apuntado como "=1+1" no puede ejecutar nada en la máquina
    // del salón al abrir la lista.
    const { toCsv } = await import("@/lib/csv");
    expect(toCsv(["N"], [["=SUMA(A1:A9)"]])).toContain("'=SUMA(A1:A9)");
    expect(toCsv(["N"], [["+34 600"]])).toContain("'+34 600");
    expect(toCsv(["N"], [["@ana"]])).toContain("'@ana");
  });

  it("las celdas vacías no rompen la fila", async () => {
    const { toCsv } = await import("@/lib/csv");
    expect(toCsv(["A", "B", "C"], [[null, undefined, 0]])).toContain(";;0");
  });
});

describe("csvFilename", () => {
  it("convierte el nombre del evento en algo que cualquier sistema acepta", async () => {
    const { csvFilename } = await import("@/lib/csv");
    expect(csvFilename("Maya · 29", "invitados")).toBe("maya-29-invitados.csv");
    expect(csvFilename("Boda Ana & Luis", "invitados")).toBe("boda-ana-luis-invitados.csv");
    expect(csvFilename("···", "invitados")).toBe("evento-invitados.csv");
  });
});

describe("formatPhone agrupa para poder leerlo", () => {
  it("separa la lada y los bloques de un número mexicano", () => {
    // En una lista de cincuenta filas, "+526184845834" hay que leerlo dígito a
    // dígito; agrupado se reconoce de un vistazo.
    expect(formatPhone("618 484 5834")).toBe("+52 618 484 5834");
    expect(formatPhone("(618) 123-4567")).toBe("+52 618 123 4567");
  });

  it("devuelve lo escrito si no se entiende como teléfono", () => {
    expect(formatPhone("pregúntale a su mamá")).toBe("pregúntale a su mamá");
  });

  it("sin teléfono no inventa nada", () => {
    expect(formatPhone(null)).toBeNull();
    expect(formatPhone("   ")).toBeNull();
  });
});
