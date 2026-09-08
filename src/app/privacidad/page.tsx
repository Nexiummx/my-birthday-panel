import type { Metadata } from "next";
import { LegalPage, LegalSection, RESPONSABLE } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description: "Qué datos tratamos, para qué, y cómo ejercer tus derechos.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Aviso de privacidad" updated="8 de septiembre de 2026">
      <LegalSection title="Quién trata tus datos">
        <p>
          {RESPONSABLE.nombre}, con domicilio en {RESPONSABLE.domicilio}, es responsable del
          tratamiento de los datos personales recabados a través de {RESPONSABLE.sitio}. Puedes
          contactarnos en <strong>{RESPONSABLE.correo}</strong>.
        </p>
      </LegalSection>

      <LegalSection title="Qué datos recabamos">
        <p>Hay dos tipos de persona en este servicio, y de cada una tratamos cosas distintas.</p>
        <p>
          <strong>De quien contrata el servicio:</strong> nombre, correo electrónico y contraseña
          —guardada siempre cifrada, nunca en texto legible—. Si entras con Google o Facebook,
          recibimos de ellos tu nombre, tu correo y tu foto de perfil.
        </p>
        <p>
          <strong>De las personas invitadas:</strong> el nombre y el número de pases que el
          anfitrión captura, y la respuesta que envían: si asisten, cuántas personas y el
          comentario que escriban. No pedimos ni almacenamos su correo ni su teléfono.
        </p>
      </LegalSection>

      <LegalSection title="Para qué los usamos">
        <p>
          Únicamente para prestar el servicio: crear y mostrar las invitaciones, registrar las
          confirmaciones y darle al anfitrión el seguimiento de su evento. También para enviarte
          correos imprescindibles de la cuenta, como el restablecimiento de contraseña.
        </p>
        <p>
          <strong>No vendemos datos, no los compartimos con anunciantes y no enviamos publicidad.</strong>
        </p>
      </LegalSection>

      <LegalSection title="Quién más los procesa">
        <p>
          Para operar nos apoyamos en proveedores que tratan los datos por cuenta nuestra:
          Supabase (base de datos), Vercel (alojamiento) y Resend (envío de correo). Si eliges
          entrar con un proveedor social, Google o Meta procesan esa autenticación conforme a sus
          propias políticas.
        </p>
      </LegalSection>

      <LegalSection title="Cuánto tiempo los conservamos">
        <p>
          Mientras la cuenta siga activa. Al eliminar un evento se borran también sus invitaciones
          y las respuestas recibidas, y al eliminar una cuenta se borra todo lo suyo. La supresión
          es definitiva: no guardamos copias.
        </p>
      </LegalSection>

      <LegalSection title="Tus derechos">
        <p>
          Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los
          Particulares, puedes solicitar el acceso, la rectificación, la cancelación o la oposición
          al tratamiento de tus datos —los llamados derechos ARCO—, así como revocar tu
          consentimiento.
        </p>
        <p>
          Escríbenos a <strong>{RESPONSABLE.correo}</strong> indicando qué derecho quieres ejercer.
          Te responderemos en un plazo máximo de veinte días hábiles.
        </p>
        <p>
          Si eres una persona invitada y quieres que se elimine tu respuesta, puedes pedírselo
          directamente al anfitrión de tu evento o escribirnos a nosotros.
        </p>
      </LegalSection>

      <LegalSection title="Seguridad">
        <p>
          Las contraseñas se guardan con un algoritmo de cifrado de un solo sentido y la conexión
          viaja siempre cifrada. Cada cuenta solo puede ver sus propios eventos e invitados: el
          aislamiento se aplica en el servidor, en cada consulta.
        </p>
        <p>
          El enlace de cada invitación es privado por ser secreto: cualquiera que lo tenga puede
          verla y confirmar. Compártelo solo con la persona invitada.
        </p>
      </LegalSection>

      <LegalSection title="Cambios">
        <p>
          Si modificamos este aviso, publicaremos la versión nueva en esta misma página con su
          fecha de actualización.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
