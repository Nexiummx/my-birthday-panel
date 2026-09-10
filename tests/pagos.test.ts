import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mercadoPagoIsConfigured, verifyNotification } from "@/lib/mercadopago";

/**
 * La firma del aviso es lo único que separa "Mercado Pago dice que te pagaron"
 * de "cualquiera que conozca la URL dice que te pagaron". Un fallo aquí regala
 * créditos.
 */
const SECRET = "un-secreto-de-pruebas";

function firmar(dataId: string, requestId: string, ts: string, secret = SECRET) {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

function cabeceras(dataId: string, requestId = "req-1", ts = "1700000000", secret = SECRET) {
  return new Headers({
    "x-signature": `ts=${ts},v1=${firmar(dataId, requestId, ts, secret)}`,
    "x-request-id": requestId,
  });
}

describe("sin credenciales", () => {
  beforeEach(() => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  });

  it("el cobro en línea simplemente no existe", () => {
    // El panel enseña entonces el camino de siempre: escribir por WhatsApp.
    expect(mercadoPagoIsConfigured()).toBe(false);
  });

  it("sin secreto se rechaza el aviso en vez de creérselo", () => {
    const resultado = verifyNotification(cabeceras("123"), "123");
    expect(resultado.ok).toBe(false);
    expect(resultado.reason).toMatch(/WEBHOOK_SECRET/);
  });
});

describe("verificación de la firma", () => {
  beforeEach(() => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  });

  it("acepta un aviso legítimo", () => {
    expect(verifyNotification(cabeceras("112233"), "112233").ok).toBe(true);
  });

  it("rechaza una firma de otro pago", () => {
    // Reenviar el aviso de un pago propio cambiando el id no debe colar.
    expect(verifyNotification(cabeceras("112233"), "445566").ok).toBe(false);
  });

  it("rechaza una firma hecha con otro secreto", () => {
    const otras = cabeceras("112233", "req-1", "1700000000", "secreto-del-atacante");
    expect(verifyNotification(otras, "112233").ok).toBe(false);
  });

  it("rechaza si cambia el request-id que se firmó", () => {
    const headers = cabeceras("112233", "req-1");
    headers.set("x-request-id", "req-2");
    expect(verifyNotification(headers, "112233").ok).toBe(false);
  });

  it("rechaza sin cabecera de firma", () => {
    const resultado = verifyNotification(new Headers(), "112233");
    expect(resultado.ok).toBe(false);
    expect(resultado.reason).toMatch(/x-signature/);
  });

  it("rechaza una firma incompleta", () => {
    const headers = new Headers({ "x-signature": "ts=1700000000", "x-request-id": "req-1" });
    expect(verifyNotification(headers, "112233").ok).toBe(false);
  });

  it("no revienta si la firma tiene una longitud rara", () => {
    // timingSafeEqual lanza con longitudes distintas: hay que comprobarlo antes.
    const headers = new Headers({ "x-signature": "ts=1,v1=abc", "x-request-id": "req-1" });
    expect(() => verifyNotification(headers, "112233")).not.toThrow();
    expect(verifyNotification(headers, "112233").ok).toBe(false);
  });

  it("normaliza a minúsculas el id alfanumérico", () => {
    // Mercado Pago firma el id en minúsculas; el aviso puede traerlo con
    // mayúsculas y aun así es el mismo pago.
    const headers = cabeceras("abc123");
    expect(verifyNotification(headers, "ABC123").ok).toBe(true);
  });
});
