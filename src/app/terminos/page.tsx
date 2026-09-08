import type { Metadata } from "next";
import { LegalPage, LegalSection, RESPONSABLE } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Términos del servicio",
  description: "Las condiciones de uso del servicio de invitaciones digitales.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Términos del servicio" updated="8 de septiembre de 2026">
      <LegalSection title="Qué es este servicio">
        <p>
          {RESPONSABLE.nombre} ofrece una herramienta para crear invitaciones digitales
          personalizadas y dar seguimiento a las confirmaciones de asistencia. Al crear una cuenta
          aceptas estos términos.
        </p>
      </LegalSection>

      <LegalSection title="Tu cuenta">
        <p>
          Eres responsable de tu contraseña y de lo que ocurra desde tu cuenta. Si crees que
          alguien más entró, cámbiala de inmediato desde “Mi cuenta” y avísanos.
        </p>
        <p>
          Una cuenta recién creada no puede publicar eventos hasta que se le habilite el plan
          correspondiente.
        </p>
      </LegalSection>

      <LegalSection title="Los datos de tus invitados">
        <p>
          Cuando capturas la lista de invitados nos confías datos de terceros. Al hacerlo declaras
          que cuentas con su consentimiento para compartirlos con nosotros con el único fin de
          enviarles su invitación y registrar su respuesta.
        </p>
        <p>
          Esos datos son tuyos: no los usamos para nada más, y desaparecen cuando eliminas el
          evento o la cuenta.
        </p>
      </LegalSection>

      <LegalSection title="Uso aceptable">
        <p>
          No puedes usar el servicio para enviar publicidad no solicitada, suplantar a otra
          persona, ni publicar contenido ilegal u ofensivo. Podemos suspender una cuenta que lo
          haga, avisando por correo salvo que la gravedad exija actuar antes.
        </p>
      </LegalSection>

      <LegalSection title="Disponibilidad">
        <p>
          Hacemos lo razonable por mantener el servicio en línea, pero no garantizamos que esté
          disponible sin interrupciones. Cuando haya mantenimiento previsto que pueda afectar a un
          evento cercano, avisaremos con antelación.
        </p>
        <p>
          Guarda siempre tu lista de invitados por tu cuenta. Es tu respaldo si algo falla.
        </p>
      </LegalSection>

      <LegalSection title="Pagos">
        <p>
          El número de eventos activos depende del plan contratado. Los planes se acuerdan
          directamente con nosotros; no hay cobro automático ni renovación sin tu confirmación.
        </p>
      </LegalSection>

      <LegalSection title="Cancelación">
        <p>
          Puedes dejar de usar el servicio cuando quieras y pedirnos la eliminación de tu cuenta en{" "}
          <strong>{RESPONSABLE.correo}</strong>. La eliminación borra tus eventos, invitaciones y
          respuestas de forma definitiva.
        </p>
      </LegalSection>

      <LegalSection title="Contacto">
        <p>
          Cualquier duda sobre estos términos: <strong>{RESPONSABLE.correo}</strong>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
