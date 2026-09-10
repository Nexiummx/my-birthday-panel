import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptField,
  decryptNullable,
  encryptField,
  encryptNullable,
  encryptionEnabled,
  isEncrypted,
} from "@/lib/crypto/field-crypto";

/** 32 bytes en base64, que es lo que exige AES-256. */
const KEY = Buffer.alloc(32, 7).toString("base64");
const OTRA = Buffer.alloc(32, 9).toString("base64");

describe("sin clave configurada", () => {
  beforeEach(() => {
    delete process.env.FIELD_ENCRYPTION_KEY_V1;
  });

  it("no cifra nada y lo dice", () => {
    // Es lo que permite desplegar el código antes de generar la clave y que
    // quien clone el repositorio trabaje sin ceremonias.
    expect(encryptionEnabled()).toBe(false);
    expect(encryptField("5512345678")).toBe("5512345678");
  });

  it("sigue leyendo el texto plano", () => {
    expect(decryptField("5512345678")).toBe("5512345678");
  });
});

describe("con clave configurada", () => {
  beforeEach(() => {
    process.env.FIELD_ENCRYPTION_KEY_V1 = KEY;
  });
  afterEach(() => {
    delete process.env.FIELD_ENCRYPTION_KEY_V1;
    delete process.env.FIELD_ENCRYPTION_KEY_V2;
  });

  it("va y vuelve", () => {
    const original = "618 123 4567";
    const cifrado = encryptField(original);
    expect(cifrado).not.toBe(original);
    expect(decryptField(cifrado)).toBe(original);
  });

  it("respeta los acentos y los emojis", () => {
    // Los mensajes de los invitados vienen así de verdad.
    const texto = "¡Ahí estaré! Nos vemos 🎉 — Mariana López";
    expect(decryptField(encryptField(texto))).toBe(texto);
  });

  it("cifra distinto el mismo texto dos veces", () => {
    // Con IV fijo, dos invitados con el mismo teléfono se delatarían solos.
    const a = encryptField("5512345678");
    const b = encryptField("5512345678");
    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe(decryptField(b));
  });

  it("se reconoce a sí mismo", () => {
    expect(isEncrypted(encryptField("hola"))).toBe(true);
    expect(isEncrypted("hola")).toBe(false);
    expect(isEncrypted("5512345678")).toBe(false);
    // Un texto con dos puntos no basta para parecer un sobre cifrado.
    expect(isEncrypted("v1:algo")).toBe(false);
  });

  it("detecta que alguien tocó el dato en la base", () => {
    const cifrado = encryptField("5512345678");
    const [version, iv, tag] = cifrado.split(":");
    // Se cambia un byte del contenido: el tag de GCM ya no cuadra.
    const alterado = [version, iv, tag, Buffer.from("otro-numero").toString("base64")].join(":");
    expect(() => decryptField(alterado)).toThrow();
  });

  it("no descifra con la clave equivocada", () => {
    const cifrado = encryptField("5512345678");
    process.env.FIELD_ENCRYPTION_KEY_V1 = OTRA;
    expect(() => decryptField(cifrado)).toThrow();
  });

  it("rechaza una clave que no mida 32 bytes", () => {
    process.env.FIELD_ENCRYPTION_KEY_V1 = Buffer.alloc(16, 1).toString("base64");
    expect(() => encryptField("hola")).toThrow(/32 bytes/);
  });

  it("convive con las filas que todavía no se han migrado", () => {
    // Durante el backfill hay texto plano y texto cifrado en la misma columna.
    // Si esto no funcionara, el sitio se caería a mitad de la migración.
    expect(decryptField("todavía en claro")).toBe("todavía en claro");
  });

  it("avisa si falta la clave de una versión que sí se usó", () => {
    const cifrado = encryptField("dato");
    const v2 = cifrado.replace(/^v1:/, "v2:");
    expect(() => decryptField(v2)).toThrow(/FIELD_ENCRYPTION_KEY_V2/);
  });

  it("trata el vacío como ausencia", () => {
    // Un teléfono vacío es "no hay teléfono", no una cadena cifrada de cero
    // caracteres que después haya que descifrar para descubrir que estaba vacía.
    expect(encryptNullable("")).toBeNull();
    expect(encryptNullable(null)).toBeNull();
    expect(encryptNullable(undefined)).toBeNull();
    expect(decryptNullable(null)).toBeNull();
    expect(decryptNullable(undefined)).toBeNull();
  });
});
