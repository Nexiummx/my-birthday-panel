# Invitaciones digitales · Bosque Encantado

Aplicación web para enviar invitaciones digitales individuales, cada una con su
propio enlace, una apertura cinematográfica (la vegetación se abre desde el
centro como dos cortinas) y confirmación de asistencia.

Incluye un panel administrativo para crear invitaciones, copiar enlaces y seguir
las confirmaciones en tiempo real.

- **Invitación pública:** `/i/[slug]` — p. ej. `/i/mariana-lopez`
- **Panel:** `/admin/login`, `/admin`, `/admin/invitaciones`, `/admin/confirmaciones`

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Lenguaje | TypeScript en modo estricto |
| Estilos | Tailwind CSS v4 |
| Animación | GSAP (solo la apertura) + CSS y canvas para el resto |
| ORM | Prisma 7 con driver adapter de `node-postgres` |
| Base de datos | PostgreSQL (Supabase) |
| Validación | Zod (mismos esquemas en cliente y servidor) |
| Formularios | React Hook Form |
| Iconos | Lucide React |
| Sesión admin | JWT HS256 en cookie httpOnly (`jose`) + bcrypt |

Todo vive en un único proyecto Next.js: no hay backend separado, ni Docker, ni
Redux, ni GraphQL.

---

## Instalación

```bash
npm install          # `postinstall` ejecuta `prisma generate`
cp .env.example .env # y completa las variables
npm run setup        # migraciones + seed
npm run dev
```

Abre <http://localhost:3000/i/mariana-lopez> para ver la experiencia completa y
<http://localhost:3000/admin/login> para entrar al panel.

---

## Variables de entorno

Copia `.env.example` a `.env`:

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Conexión que usa la app en runtime. En Supabase, el **pooler** (puerto `6543`, con `?pgbouncer=true`). |
| `DIRECT_URL` | Conexión directa (puerto `5432`). La usan las migraciones de Prisma. |
| `NEXT_PUBLIC_APP_URL` | Dominio público. Con él se construyen los enlaces `https://DOMINIO/i/[slug]` que copia el panel. |
| `ADMIN_EMAIL` | Correo del administrador inicial. Lo consume el seed. |
| `ADMIN_PASSWORD` | Contraseña inicial. **Solo la lee el seed**: en la base de datos se guarda hasheada con bcrypt (12 rondas). Nunca se almacena en texto plano ni se sube al repositorio. |
| `AUTH_SECRET` | Firma la cookie de sesión. Genera uno con `openssl rand -base64 32`. |

`.env` está en `.gitignore`; `.env.example` sí se versiona.

En producción define `ADMIN_PASSWORD` únicamente como variable de entorno del
proveedor (Vercel, etc.), ejecuta el seed una vez para crear el usuario, y
después puedes retirarla.

---

## Configuración de Supabase

1. Crea un proyecto en <https://supabase.com>.
2. Ve a **Project Settings → Database → Connection string → URI**.
3. Copia las dos cadenas al `.env`:
   - **Transaction pooler** (`:6543`) → `DATABASE_URL`, añadiendo `?pgbouncer=true`.
   - **Direct connection** (`:5432`) → `DIRECT_URL`.
4. Sustituye `[YOUR-PASSWORD]` por la contraseña de la base de datos.

```env
DATABASE_URL="postgresql://postgres.abcdefgh:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.abcdefgh:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

> **Alternativa sin Supabase para desarrollo local:** `npm run db:local` levanta
> un PostgreSQL local con Prisma y muestra la cadena de conexión que debes pegar
> en `DATABASE_URL` y `DIRECT_URL`. Déjalo corriendo en una terminal aparte.

---

## Prisma, migraciones y seed

En Prisma 7 la URL de conexión no vive en el esquema sino en
[`prisma7.config.ts`](prisma7.config.ts). El cliente generado se escribe en
`src/generated/prisma` (ignorado por git y regenerado en cada `npm install` y
`npm run build`).

```bash
npm run db:generate   # regenera el cliente Prisma
npm run db:migrate    # crea y aplica una migración en desarrollo
npm run db:deploy     # aplica migraciones existentes (producción)
npm run db:seed       # datos de ejemplo + usuario administrador
npm run db:seed:prod  # solo evento + administrador, sin invitados de ejemplo
npm run db:studio     # explorador visual de la base de datos
npm run setup         # generate + deploy + seed, todo junto
```

> **En producción usa `npm run db:seed:prod`.** El seed normal incluye cuatro
> invitados de ejemplo (Mariana López, Carlos Hernández…) que no deben acabar en
> la lista real de invitados.

El seed ([`prisma/seed.ts`](prisma/seed.ts)) es **idempotente**: puedes
ejecutarlo las veces que quieras. Crea:

- Un evento de ejemplo (`Maya · 29`).
- Cuatro invitaciones con estados distintos, para probar el panel:

  | Invitado | Slug | Pases | Estado |
  | --- | --- | --- | --- |
  | Mariana López | `mariana-lopez` | 2 | Pendiente |
  | Carlos Hernández | `carlos-hernandez` | 1 | Confirmada |
  | Ana Martínez | `ana-martinez` | 4 | Confirmada |
  | Sofía García | `sofia-garcia` | 2 | No asistirá |

- El usuario administrador a partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## Ejecución local

```bash
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm run start      # sirve el build
npm run lint       # ESLint
npm run typecheck  # TypeScript sin emitir
```

---

## Login del administrador

1. Entra a `/admin/login`.
2. Usa el correo y la contraseña de `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

La sesión es un JWT firmado (HS256) guardado en una cookie `httpOnly`, `sameSite=lax`
y `secure` en producción, con 8 horas de validez. [`src/proxy.ts`](src/proxy.ts)
bloquea `/admin/*` en el borde antes de renderizar nada, y el layout del panel
vuelve a comprobar la sesión en el servidor.

Para cambiar la contraseña: actualiza `ADMIN_PASSWORD` y ejecuta `npm run db:seed`
(el seed reescribe el hash del usuario existente).

---

## Cómo crear una invitación

Desde **`/admin/invitaciones` → “Crear invitación”**:

- **Nombre del invitado** — genera el slug automáticamente:
  `Mariana López` → `mariana-lopez`. Si ya existe, añade sufijo: `mariana-lopez-2`.
- **Número de pases** — máximo de personas que puede confirmar esa invitación.
  El límite se valida **en el servidor**: el cliente no es fuente de verdad.
- **Mensaje personalizado** (opcional) — aparece en la invitación, bajo los datos
  del evento.

Cada fila de la tabla permite **ver**, **editar**, **copiar el enlace** y
**eliminar**. El enlace copiado usa `NEXT_PUBLIC_APP_URL`:
`https://DOMINIO/i/[slug]`.

---

## Cómo cambiar el contenido del evento

El MVP gestiona un evento a la vez (el más antiguo de la tabla `events`). Puedes
editarlo de dos formas:

- **Con Prisma Studio:** `npm run db:studio` → tabla `events`.
- **Editando el seed** ([`prisma/seed.ts`](prisma/seed.ts), función `seedEvent`)
  y ejecutando `npm run db:seed`.

Campos y cómo se representan en la invitación:

| Campo | Aparece como |
| --- | --- |
| `name` | Título. Si contiene `·` se parte en dos: `Maya · 29` → **MAYA** grande y **29** en dorado. Sin `·` se muestra completo. |
| `description` | Subtítulo bajo el nombre (p. ej. `Birthday Celebration`). |
| `date` | Fecha larga en español, sin año: “26 de septiembre”. |
| `time` | Texto libre: `4:00 pm`. |
| `location` | Lugar. Admite **saltos de línea**: la primera línea va destacada y la segunda más discreta (`Jardín Rosas y Miel\nSantiago Papasquiaro`). |
| `locationUrl` | Convierte el lugar en enlace (Google Maps). |
| `dressCode` / `dressCodeUrl` | Texto y enlace del dress code. |
| `invitationImage` | **Opcional.** Ruta o URL de la ilustración de la invitación. Si se define, encabeza la lámina respetando su proporción original (nunca se deforma) y la tipografía la acompaña debajo. Si se deja en `null`, el marco botánico dibujado en SVG sostiene toda la estética. Para usar una imagen local, colócala en `public/` y guarda la ruta (p. ej. `/invitacion.png`). |

---

## Vista previa al compartir (WhatsApp, Telegram…)

Cada invitación genera su propia miniatura en
[`src/app/i/[slug]/opengraph-image.tsx`](src/app/i/[slug]/opengraph-image.tsx):
el marco botánico de la invitación con el nombre del invitado, el evento, la
fecha y el lugar. Es lo que ve la persona **antes** de abrir el enlace.

- Se dibuja con `ImageResponse` (`next/og`) y se convierte a JPEG con `sharp`:
  en PNG pesaba 1.2 MB y los clientes de mensajería descartan las miniaturas
  pesadas; en JPEG ronda los 120 kB.
- Los recursos viven en `assets/` (el marco ya recortado a 1200×630 y las tres
  tipografías en `.ttf`, porque `next/font` sirve `woff2`, que `next/og` no
  admite). `next.config.ts` los incluye explícitamente en el bundle serverless.
- `metadataBase` sale de `NEXT_PUBLIC_APP_URL`; en los *preview deployments* de
  Vercel se usa `VERCEL_URL`. **Si `NEXT_PUBLIC_APP_URL` está mal, la miniatura
  apunta a un dominio que no existe y no se ve.**

Para regenerar el fondo si cambia la ilustración:

```bash
node -e "require('sharp')('public/images/fairy-garden-invitation-frame.png').resize(1200,630,{fit:'cover'}).jpeg({quality:82,mozjpeg:true}).toFile('assets/og-frame.jpg')"
```

---

## Despliegue

Pensado para **Vercel**:

1. Sube el repositorio a GitHub e impórtalo en Vercel.
2. Define las variables de entorno del apartado anterior
   (`NEXT_PUBLIC_APP_URL` con el dominio real, sin barra final).
3. El `build` ejecuta `prisma generate && prisma migrate deploy`, así que cada
   despliegue aplica las migraciones pendientes por su cuenta. Si la base no es
   alcanzable durante el build, el despliegue falla en vez de publicar una app
   rota.
4. Ejecuta `npm run db:seed:prod` **una sola vez**, apuntando a la base de
   producción, para crear el evento y el usuario administrador.

Funciona igual en cualquier proveedor con Node 20+ (`npm run build && npm run start`).

---

## Estructura

```
assets/                    Marco y tipografías de la miniatura social
prisma/
  schema.prisma            Event · Invitation · Rsvp · AdminUser
  seed.ts                  Datos de ejemplo, idempotente (`--prod` los omite)
src/
  app/
    i/[slug]/              Invitación pública + opengraph-image
    admin/login/           Acceso
    admin/(panel)/         Resumen · invitaciones · confirmaciones
    api/                   Route Handlers
  components/
    invitation/            ForestScene · OpeningCurtain · Fireflies ·
                           InvitationCard · InvitationInfo · RSVPModal ·
                           botanicals (biblioteca SVG) · ForegroundFauna
    admin/                 AdminSidebar · StatsCard · InvitationTable · RSVPTable
    ui/                    Button · Field · Modal · Badge · States
  lib/
    services/              Lógica de negocio (invitations · rsvp · stats)
    validations.ts         Esquemas Zod compartidos
    auth.ts / session.ts   Sesión del panel
    prisma.ts              Cliente singleton
  proxy.ts                 Protege /admin en el borde
```

La lógica de negocio vive en `lib/services` y nunca dentro de los componentes
visuales; las rutas de API solo validan, delegan y traducen errores.

---

## API

Todas las respuestas siguen el mismo formato: `{ data }` en éxito y
`{ error, issues? }` en error.

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Público | Inicia sesión y emite la cookie. |
| `POST` | `/api/auth/logout` | Público | Cierra la sesión. |
| `GET` | `/api/invitations` | Admin | Lista todas las invitaciones. |
| `POST` | `/api/invitations` | Admin | Crea una invitación (genera el slug). |
| `GET` | `/api/invitations/[id]` | Admin | Detalle de una invitación. |
| `PATCH` | `/api/invitations/[id]` | Admin | Actualiza una invitación. |
| `DELETE` | `/api/invitations/[id]` | Admin | Elimina una invitación y su RSVP. |
| `GET` | `/api/public/invitations/[slug]` | Público | Datos de la invitación para el invitado. |
| `POST` | `/api/rsvp` | Público | Registra **o actualiza** la respuesta (upsert). |
| `GET` | `/api/stats` | Admin | Métricas del panel. |

El RSVP es público a propósito: el “secreto” es el slug de la invitación. Una
invitación tiene como máximo **un RSVP**, y el invitado puede cambiar su
respuesta cuantas veces quiera; el RSVP y el estado de la invitación se escriben
en una sola transacción para que nunca diverjan.

---

## Accesibilidad y rendimiento

- **`prefers-reduced-motion`**: si el sistema lo pide, no hay apertura animada —
  la invitación se muestra directamente— y las animaciones decorativas se anulan.
- **Luciérnagas en canvas**: un único nodo del DOM y un sprite reutilizado, en
  lugar de decenas de elementos animados. Se detienen cuando la pestaña no está
  visible.
- **GSAP solo para la apertura**; el vaivén de hojas y mariposas es CSS puro
  (transformaciones en GPU sobre grupos, no por hoja).
- **Parallax** únicamente con puntero fino (no en táctil), limitado a un
  `requestAnimationFrame` por frame y sin renders de React.
- **SVG determinista**: la geometría se redondea a 3 decimales para que servidor
  y navegador generen exactamente el mismo marcado y no haya errores de
  hidratación.
- Modal con foco atrapado, cierre con `Escape` y bloqueo de scroll; estados de
  carga, vacío y error en todas las tablas.

---

## Nota sobre la referencia visual

La imagen de referencia indicada en el encargo (`/mnt/data/…png`) no estaba
disponible en este equipo, así que la lámina se **compuso en SVG** respetando la
estética descrita: bosque encantado, hojas, ramas, flores, mariposas, hongos,
verde oliva, crema, rosa suave, dorado tenue y textura de papel.

Si quieres usar la ilustración original, colócala en `public/` y guarda su ruta
en el campo `invitationImage` del evento: la lámina la mostrará arriba,
respetando su proporción, con la tipografía debajo. No hace falta tocar código.
