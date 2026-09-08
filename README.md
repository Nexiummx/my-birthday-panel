# Invitaciones digitales

Plataforma para enviar invitaciones digitales individuales, cada una con su
propio enlace, una apertura cinematográfica (el telón se abre desde el centro) y
confirmación de asistencia.

Cada cuenta gestiona sus propios eventos y cada evento elige uno de **cuatro
temas** —Bosque Encantado, Vaqueros, Barbie y Noche de Brillos—, que cambian la
paleta, las tipografías, la escena de fondo y los textos de bienvenida.

- **Invitación pública:** `/i/[slug]` — p. ej. `/i/mariana-lopez`
- **Panel del cliente:** `/admin/login`, `/admin`, `/admin/invitaciones`, `/admin/confirmaciones`, `/admin/evento`, `/admin/soporte`, `/admin/cuenta`
- **Solo equipo:** `/admin/clientes` (cuentas y créditos) y `/admin/tickets`

Cualquiera puede crear su cuenta, pero nace con **0 créditos de evento**: entra
al panel y no puede crear eventos hasta que el equipo se los habilite desde
`/admin/clientes`.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Lenguaje | TypeScript en modo estricto |
| Estilos | Tailwind CSS v4 |
| Animación | GSAP (solo la apertura) + CSS y canvas para el resto |
| ORM | Prisma 7 con driver adapter de `node-postgres` |
| Base de datos | PostgreSQL — Supabase en producción, Docker en local |
| Validación | Zod (mismos esquemas en cliente y servidor) |
| Formularios | React Hook Form |
| Iconos | Lucide React |
| Autenticación | Better Auth — correo/contraseña, Google, Facebook |
| Correo | Resend (sin API key, el enlace se imprime en consola) |

Todo vive en un único proyecto Next.js: no hay backend separado, ni Redux, ni
GraphQL. Docker se usa solo para levantar la base de datos de desarrollo.

---

## Instalación

```bash
npm install                # `postinstall` ejecuta `prisma generate`
cp .env.example .env.local # base local: ver "Variables de entorno"
docker compose up -d       # PostgreSQL 17 en el puerto 5433
npm run setup              # migraciones + seed
npm run dev
```

Abre <http://localhost:3000/i/mariana-lopez> para ver la experiencia completa y
<http://localhost:3000/admin/login> para entrar al panel.

---

## Variables de entorno

### `.env.local` gana sobre `.env`

[`scripts/env.ts`](scripts/env.ts) carga `.env.local` **antes** que `.env`, y
Next.js aplica la misma precedencia. Mientras exista un `.env.local` apuntando a
Docker, ningún `prisma migrate` puede alcanzar Supabase por descuido — que es el
accidente más caro posible en este proyecto.

Para trabajar contra producción a propósito, renombra `.env.local`.

Para la base local:

```bash
DATABASE_URL="postgresql://cumple:cumple@localhost:5433/cumple"
DIRECT_URL="postgresql://cumple:cumple@localhost:5433/cumple"
```

Variables:

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Conexión que usa la app en runtime. En Supabase, el **pooler** (puerto `6543`, con `?pgbouncer=true`). |
| `DIRECT_URL` | Conexión directa (puerto `5432`). La usan las migraciones de Prisma. |
| `NEXT_PUBLIC_APP_URL` | Dominio público. Con él se construyen los enlaces `https://DOMINIO/i/[slug]` que copia el panel. |
| `ADMIN_EMAIL` | Correo del administrador inicial. Lo consume el seed. |
| `ADMIN_PASSWORD` | Contraseña inicial. **Solo la lee el seed**: en la base de datos se guarda hasheada con bcrypt (12 rondas). Nunca se almacena en texto plano ni se sube al repositorio. |
| `AUTH_SECRET` | Firma la cookie de sesión. Genera uno con `openssl rand -base64 32`. |
| `RESEND_API_KEY` | Envío de correo (recuperación de contraseña). Sin ella el enlace se imprime en la consola. |
| `EMAIL_FROM` | Remitente. Su dominio debe estar verificado en Resend (SPF + DKIM). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Acceso con Google. El botón solo aparece si están las dos. |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | Igual, para Facebook. Cableado pero apagado hasta que Meta apruebe la app. |
| `NEXT_PUBLIC_CONTACT_WHATSAPP` | Número comercial, solo dígitos con lada país. Sin él los botones de contratación caen a `mailto:`. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Correo comercial de respaldo. |
| `SUPPORT_EMAIL` | Buzón al que llegan los avisos de tickets. Sin él se usa el de contacto. |

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
npm run accounts      # alta de cuentas y créditos (ver "Créditos de evento")
```

> **Nunca ejecutes `db:migrate` (`prisma migrate dev`) contra producción**: usa
> una shadow database y puede proponer un reset. En producción va `db:deploy`,
> que solo aplica las migraciones pendientes.

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

- La cuenta administradora a partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD`, como
  superadmin y con cupo de 5 eventos. El evento cuelga de ella: sin cuenta no
  puede haber evento, así que el seed la crea primero.

---

## Ejecución local

```bash
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm run start      # sirve el build
npm run lint       # ESLint
npm run typecheck  # TypeScript sin emitir
npm test           # Vitest, una pasada
npm run test:watch # Vitest en modo continuo
```

---

## Autenticación

La gestiona [Better Auth](src/lib/better-auth.ts), con cuatro pantallas públicas:
`/admin/login`, `/admin/registro`, `/admin/recuperar` y `/admin/restablecer`.

**Formas de entrar.** Correo y contraseña, Google y Facebook. Un proveedor social
solo aparece en pantalla si sus dos variables de entorno están puestas: un botón
sin credenciales lleva a una pantalla de error del proveedor, así que es mejor no
pintarlo.

**Vinculación de cuentas.** Si alguien se registra con correo y después entra con
Google del mismo correo, se vinculan **solo con proveedores que certifican el
correo como verificado**. Google lo hace; Facebook no de forma fiable, y vincular
a ciegas por correo es una vía conocida de secuestro de cuentas.

**Las credenciales no viven en el usuario.** La contraseña está en `accounts`, con
`providerId = "credential"`, que es como una misma cuenta puede tener a la vez
contraseña y proveedores sociales. El hash sigue siendo **bcrypt**: la
configuración lo verifica a propósito para que las cuentas anteriores a la
migración entren con su contraseña de siempre, sin restablecer nada.

**Límite de peticiones.** El contador vive en base y no en memoria: en un
despliegue sin servidor cada instancia tiene su propia memoria y un contador en
RAM no limitaría casi nada. Las tres rutas que cuestan dinero o permiten sondear
cuentas llevan límites más estrictos: acceso (8/min), alta (5/hora) y
restablecimiento (4/hora).

**La sesión vive en base**, no en un JWT autocontenido, así que puede revocarse de
verdad. [`src/proxy.ts`](src/proxy.ts) solo comprueba que exista la cookie —en el
borde no hay acceso a la base—: es un filtro de tráfico, no la barrera. Esa está
en el layout del panel y en `requireSession()` de cada ruta de API.

Para restablecer la contraseña de alguien sin pasar por su correo:
`npm run accounts password --email … --password …`.

---

## Importar la lista de invitados

Desde **`/admin/invitaciones` → “Importar lista”**. Se pega un invitado por
línea:

```
Mariana López, 2
Carlos Hernández, 1
Ana Martínez, 4
Sofía García
```

Acepta coma, punto y coma o tabulador —esto último es lo que sale al copiar de
una hoja de cálculo— y asume un pase cuando no se indica número. Antes de crear
nada se muestra cuántas invitaciones y cuántos pases saldrán, y qué líneas se
van a omitir: las filas problemáticas se marcan en vez de descartarse en
silencio.

Los slugs se acumulan sobre la marcha además de leerse de la base, así que dos
“Ana García” en el mismo pegado salen como `ana-garcia` y `ana-garcia-2`. Todo
va en una transacción: o entran todas o no entra ninguna.

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

## Planes y precios

Los precios viven en un solo archivo, [`src/lib/pricing.ts`](src/lib/pricing.ts).
Cambiarlos ahí los cambia a la vez en la portada (`/`) y en la pantalla de
activación del panel (`/admin/evento` con cupo 0). No hay precios escritos en
ningún componente.

| Plan | Precio | Créditos |
| --- | --- | --- |
| Evento único | $1,490 MXN, pago único | 1 evento |
| Dos eventos | $2,490 MXN, pago único | 2 eventos |
| Organizadores | $890 MXN al mes | 5 eventos cada mes |

**Son una propuesta, no una decisión.** Ajústalos antes de publicar.

Cada plan corresponde a un valor de `eventQuota`, y `planForQuota()` hace el
camino de vuelta: el panel de clientes muestra el nombre del plan al lado del
número para que nadie tenga que recordar qué significa un 2.

### La regla al escribir un plan

En `features` solo puede ir lo que el equipo cumple o el código impone. Los
**únicos** límites que la aplicación aplica sola son los créditos de evento y la
regla de cambio de fecha. No agregues "hasta 200 invitados" ni "1 GB de
imágenes": no hay nada que lo haga cumplir, y el cliente lo descubriría el día
de su fiesta.

Ojo con la fecha: **no se puede prometer "cambia la fecha cuando quieras"**.
Se cambia una vez y como mucho un mes; el resto pasa por un ticket.

### Cómo se cobra hoy

No hay pasarela de pago. El flujo es: el cliente se registra → ve los precios en
`/admin/evento` → escribe por WhatsApp (el mensaje lleva su correo ya escrito) →
el equipo cobra por fuera y le sube los créditos desde `/admin/clientes`. Para el
primer puñado de clientes esto es más barato que integrar Stripe, y deja ver qué
plan se vende antes de programarlo.

La suscripción funciona con el mismo mecanismo: cada mes que paga, se le suman
créditos. No hay un segundo modo de facturación en el código.

---

## Créditos de evento

Cualquiera crea su cuenta desde `/admin/registro`, pero nace con **0 créditos**.
Los créditos son la palanca comercial: los sube el equipo desde
**`/admin/clientes`** cuando el cliente paga.

**Un crédito se consume al crear un evento y no vuelve.** Ni al archivarlo ni al
borrarlo. Eso es deliberado y es la razón de ser de `AdminUser.eventsUsed`, un
contador que solo sube: si el consumo se midiera contando filas de `events`,
bastaría con borrar la fiesta del año pasado para recuperar el crédito.

"Devolver" un crédito es **subir `eventQuota`**, que deja rastro en el registro
de la cuenta en vez de esconderse en un borrado.

El consumo y la comprobación ocurren en la misma transacción, y en ese orden
—primero incrementa, después comprueba—: al revés, dos peticiones simultáneas
con un solo crédito pasarían las dos.

### La fecha del evento

Cerrar la fuga del crédito no basta, porque hay una segunda forma de reciclar
que no crea nada: **editar el evento del año pasado** hasta convertirlo en el de
este. Por eso la fecha tiene su propia regla, en
[`src/lib/event-date.ts`](src/lib/event-date.ts):

- El evento guarda la fecha con la que nació (`originalDate`) y no se toca nunca.
- La fecha se puede mover **una sola vez** (`dateChangedAt`).
- La fecha nueva tiene que caer en el **mes anterior o el siguiente** al original.

Eso cubre lo que de verdad pasa —el salón cambió el fin de semana— y deja fuera
el salto de temporada. Todo se calcula en UTC: con la zona local, un evento del
día 1 o del 31 cambiaría de mes según dónde corra el servidor.

El formulario acota el calendario con `min`/`max` y bloquea el campo cuando el
cambio ya se usó, pero **la regla se aplica en el servicio**: lo del formulario
es comodidad, no seguridad.

Para lo que queda fuera está `overrideEventDate()`, que mueve la fecha y
recoloca el ancla. Solo la usa el equipo, a partir de un ticket.

---

## Tickets

Una regla estricta sin válvula de escape se vuelve un problema de soporte. Los
tickets ([`src/lib/services/tickets.ts`](src/lib/services/tickets.ts)) son esa
válvula: el cliente los abre desde **`/admin/soporte`** y el equipo los contesta
desde **`/admin/tickets`**.

Cuando alguien choca con la regla de la fecha, el formulario del evento enlaza
al alta de ticket con el asunto, la categoría y el evento ya puestos en la URL.

- El estado lo decide quién escribe: contesta el equipo → `ANSWERED`; escribe el
  cliente → `OPEN`, aunque estuviera cerrado.
- Un ticket cuelga de la cuenta con `Cascade`, pero del evento con **`SetNull`**:
  es la prueba de lo que se pidió y tiene que sobrevivir a que el evento se borre.
- El aviso por correo **no puede tumbar la operación**: si Resend falla se
  registra y se sigue, porque el ticket ya está guardado y se ve en el panel.
- El correo del equipo sale de `SUPPORT_EMAIL`, y si no está, de
  `NEXT_PUBLIC_CONTACT_EMAIL`.

Igual que `/admin/clientes`, la bandeja del equipo responde **404** a quien no es
superadmin, y el permiso se comprueba en la página, no solo en el menú.

Esa sección solo la ven las cuentas con `isSuperAdmin`. El enlace se oculta a
los demás, pero eso es cosmético: **la página y las cuatro rutas de API
comprueban el permiso por su cuenta**, y responden `404` —no `403`— para no
confirmarle a un cliente que la sección existe.

Nadie puede quitarse a sí mismo el superadmin ni borrar su propia cuenta.

### Arranque en frío

La marca de superadmin no se puede dar desde el panel si todavía no hay ninguna,
así que la primera se activa por línea de comandos:

```bash
npm run accounts super --email tu@nexiummx.com --on
```

El resto del script sigue disponible como respaldo, y es la única vía para
restablecer la contraseña de un cliente que la haya perdido:

```bash
npm run accounts list
npm run accounts create --email ana@cliente.mx --password "…" --quota 1 --name "Ana"
npm run accounts quota  --email ana@cliente.mx --quota 3
npm run accounts password --email ana@cliente.mx --password "…"
```

**Archivar un evento no devuelve el crédito.** Archivar solo lo saca de la vista
del panel. Crear un evento sin créditos devuelve **402** con un mensaje que
explica qué pasa.

El crédito se consume en el servicio
([`lib/services/events.ts`](src/lib/services/events.ts)), no en la ruta, para que
valga sea cual sea la vía de entrada.

`npm run accounts transfer` mueve el crédito junto con el evento: si no, la
cuenta que lo recibe tendría un evento gratis y su crédito intacto.

El cliente se administra solo desde **`/admin/cuenta`**: cambia su nombre, su
correo de acceso y su contraseña sin intervención del equipo. Ambas operaciones
exigen la contraseña actual, que es la barrera si alguien encuentra una sesión
abierta. Quien entró con Google y nunca puso contraseña no la necesita.

Si la perdió, `/admin/recuperar` envía un enlace de un solo uso; el comando
`npm run accounts password` sigue siendo el respaldo cuando el correo falla.

El correo lo envía [Resend](src/lib/email.ts). Sin `RESEND_API_KEY` no se rompe
nada: el enlace se escribe en la consola, lo que permite probar el flujo completo
de recuperación en local sin dar de alta un dominio.

---

## La cookie huérfana

Eliminar una cuenta borra sus filas de `sessions` en cascada, pero **la cookie
sigue en el navegador de esa persona**. Eso provocaba un bucle de redirecciones
infinito, porque las dos capas se contradicen:

| | |
| --- | --- |
| `proxy.ts` | hay cookie → hay sesión → deja pasar a `/admin` |
| el layout | la sesión no está en la base → a `/admin/login` |
| `proxy.ts` | hay cookie y esto es una ruta de acceso → a `/admin` |

El borde no puede romperlo: validar la cookie exigiría una consulta a la base en
cada petición, que es justo lo que `proxy.ts` evita.

Lo resuelve [`/api/sesion/limpiar`](src/app/api/sesion/limpiar/route.ts), un route
handler —que sí puede escribir cookies— al que redirigen el layout y
`requirePanelContext()` en cuanto la sesión no valida. Expira las cookies de
Better Auth y devuelve a `/admin/login?sesion=expirada`.

Hay **dos mecanismos, no uno**: además del borrado, el proxy no rebota una ruta
de acceso mientras venga esa marca. Si el borrado fallara —un `path` o un
dominio que no coincidan—, el bucle termina igual.

No cuelga de `/api/auth/*` a propósito: ahí manda el catch-all de Better Auth y
se comería la ruta.

Cubre toda la familia, no solo la cuenta eliminada: sesión caducada, sesión
revocada desde otro dispositivo, o base recreada en desarrollo.

---

## Aislamiento entre cuentas

Todo evento cuelga de una cuenta, y **cada consulta del panel cruza por el dueño
de la sesión**, no solo por el id que llega del cliente:

```ts
prisma.invitation.findMany({ where: { eventId, event: { ownerId } } })
```

Sin ese `event: { ownerId }` bastaría con conocer el id de un evento ajeno para
leer su lista de invitados. La cookie que recuerda el evento en edición es solo
una preferencia: cada lectura vuelve a comprobar la propiedad, así que
manipularla a mano no da acceso a nada.

La invitación pública `/i/[slug]` es la excepción deliberada: no filtra por
dueño, porque el "secreto" es el slug.

---

## Temas

Cada evento elige uno de cuatro temas. Un tema son cuatro cosas que viajan
juntas, definidas en [`lib/themes.ts`](src/lib/themes.ts):

| Tema | Registro | Escena |
| --- | --- | --- |
| **Bosque Encantado** | Romántico y natural | Vegetación, luciérnagas, mariposas |
| **Vaqueros** | Blanco y negro, rústico | Desierto: sol, mesetas, saguaros, polvo |
| **Barbie** | Pop y brillante (único tema **claro**) | Sol de rayos, nubes, colinas rosas |
| **Noche de Brillos** | Glamour nocturno | Bola de espejos, haces de luz, destellos |

Cómo está montado:

1. **Colores** — [`globals.css`](src/app/globals.css). Las familias de tokens
   (`cream`, `ink`, `forest`, `gold`…) funcionan como **capa semántica de
   roles**: el nombre viene del tema original, pero el significado es el rol
   (`cream` = papel, `ink` = texto, `forest` = fondo de escena). Cada tema las
   reescribe bajo `[data-theme]`, así que ningún componente cambia de clases.
   El panel usa esa misma capa bajo `[data-panel]` para su paleta neutra.
2. **Tipografías** — [`i/[slug]/fonts.ts`](src/app/i/[slug]/fonts.ts), cargadas
   en el segmento de la invitación y no en el layout raíz, para que el panel no
   las descargue.
3. **Escena** — [`components/invitation/scenes/`](src/components/invitation/scenes/).
   Todas comparten `SceneShell`, que resuelve el parallax y la viñeta.
4. **Textos** — el `copy` del tema, que el anfitrión puede sobrescribir por
   evento. Cada campo cae por separado: dejarlo vacío usa el del tema.

El atributo `data-theme` solo se aplica en `/i/[slug]`, por eso el panel conserva
siempre su propia paleta.

### El panel es neutro a propósito

No lleva la estética de ningún tema. Hacerlo por tema no escalaría —cada
estética nueva obligaría a una variante del panel— y un cliente con dos eventos
de temas distintos vería la herramienta cambiar de identidad al alternar entre
ellos. El tema pertenece a la invitación, que es lo que se vende; el panel es el
taller.

Su paleta vive bajo `[data-panel]` y reasigna las mismas familias de roles:
neutros con sesgo azulado y acento azul pizarra. Agregar temas no lo toca nunca.
El tema sí aparece en el panel, pero **como dato** —la muestra de color en la
lista de eventos—, nunca como decorado.

---

## Cómo cambiar el contenido del evento

Desde **`/admin/evento`**, sin tocar la base ni el seed. Todo lo que se ve en la
invitación se edita ahí:

| Campo | Aparece como |
| --- | --- |
| `name` | Título. Si contiene `·` se parte en dos: `Maya · 29` → **MAYA** grande y **29** destacado. Sin `·` se muestra completo. |
| `description` | Subtítulo bajo el nombre (p. ej. `Birthday Celebration`). |
| `date` | Fecha larga en español, sin año: "26 de septiembre". |
| `time` | Texto libre: `4:00 pm`. |
| `location` | Lugar. Admite **saltos de línea**: la primera línea va destacada y la segunda más discreta. |
| `locationUrl` | Convierte el lugar en enlace (Google Maps). |
| `dressCode` / `dressCodeUrl` | Texto y enlace del dress code. |
| `invitationImage` | **Opcional.** Encabeza la lámina respetando su proporción original. |
| `theme` | Uno de los cuatro temas. |
| `sealedEyebrow` / `sealedHeadline` / `sealedCta` | Textos de la pantalla de bienvenida. Vacío = se usa el del tema. |

El evento en edición se elige en `/admin/evento` y se muestra siempre en la barra
lateral, porque el resto de las pantallas operan sobre él.

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
docker-compose.yml         PostgreSQL 17 de desarrollo (puerto 5433)
scripts/
  env.ts                   Precedencia .env.local > .env
  accounts.ts              Alta de cuentas y créditos
prisma/
  schema.prisma            AdminUser · Event · Invitation · Rsvp · Ticket
  seed.ts                  Datos de ejemplo, idempotente (`--prod` los omite)
src/
  app/
    i/[slug]/              Invitación pública + opengraph-image + fonts
    admin/login/           Acceso
    admin/(panel)/         Resumen · invitaciones · confirmaciones · evento ·
                           soporte · cuenta · clientes y tickets (superadmin)
    api/                   Route Handlers
  components/
    invitation/            InvitationCard · InvitationInfo · RSVPModal ·
                           OpeningCurtain · Fireflies · botanicals (SVG)
    invitation/scenes/     SceneShell + una escena por tema + Scene (resolver)
    admin/                 AdminSidebar · StatsCard · InvitationTable ·
                           RSVPTable · EventManager · EventFormModal ·
                           ThemePicker · AccountForms · AccountManager ·
                           AccountFormModal · ActivatePlanState ·
                           TicketBoard · TicketModals
    pricing/               PlanCards (portada y panel)
    ui/                    Button · Field · Modal · Badge · States
  lib/
    services/              Lógica de negocio (account · accounts · events ·
                           invitations · rsvp · stats · tickets)
    pricing.ts             Planes, precios y contacto comercial
    event-date.ts          Regla de cambio de fecha del evento
    themes.ts              Catálogo de temas (colores, copy, muestras)
    panel.ts               Contexto del panel: sesión + evento activo
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
| `*` | `/api/auth/[...all]` | Público | Todo lo de Better Auth: acceso, alta, cierre de sesión, recuperación y OAuth. |
| `GET` | `/api/account` | Admin | Datos de la cuenta en sesión. |
| `PATCH` | `/api/account` | Admin | Cambia nombre y correo. Exige la contraseña. |
| `POST` | `/api/account/password` | Admin | Cambia la contraseña. Exige la actual. |
| `GET` | `/api/admin/accounts` | Superadmin | Lista las cuentas y su cupo. |
| `POST` | `/api/admin/accounts` | Superadmin | Da de alta un cliente. |
| `PATCH` | `/api/admin/accounts/[id]` | Superadmin | Cambia correo, nombre, cupo o contraseña. |
| `DELETE` | `/api/admin/accounts/[id]` | Superadmin | Elimina la cuenta con todo lo suyo. |
| `GET` | `/api/events` | Admin | Lista los eventos de la cuenta y su cupo. |
| `POST` | `/api/events` | Admin | Crea un evento y consume un crédito. **402** si no le quedan. |
| `GET` | `/api/events/[id]` | Admin | Detalle de un evento de la cuenta. |
| `PATCH` | `/api/events/[id]` | Admin | Actualiza, archiva o reactiva. **409** si la fecha rompe la regla. |
| `DELETE` | `/api/events/[id]` | Admin | Elimina el evento con sus invitaciones. |
| `POST` | `/api/events/active` | Admin | Cambia el evento en edición. |
| `GET` | `/api/invitations` | Admin | Invitaciones del evento activo. |
| `POST` | `/api/invitations/import` | Admin | Alta en bloque desde una lista pegada. |
| `POST` | `/api/invitations` | Admin | Crea una invitación (genera el slug). |
| `GET` | `/api/invitations/[id]` | Admin | Detalle de una invitación. |
| `PATCH` | `/api/invitations/[id]` | Admin | Actualiza una invitación. |
| `DELETE` | `/api/invitations/[id]` | Admin | Elimina una invitación y su RSVP. |
| `GET` | `/api/public/invitations/[slug]` | Público | Datos de la invitación para el invitado. |
| `POST` | `/api/rsvp` | Público | Registra **o actualiza** la respuesta (upsert). |
| `GET` | `/api/stats` | Admin | Métricas del evento activo. |
| `POST` | `/api/tickets` | Admin | Abre un ticket con su primer mensaje. |
| `PATCH` | `/api/tickets/[id]` | Admin | Cierra o reabre. Solo el suyo, salvo el equipo. |
| `POST` | `/api/tickets/[id]/messages` | Admin | Responde en el hilo. |

El RSVP es público a propósito: el “secreto” es el slug de la invitación. Una
invitación tiene como máximo **un RSVP**, y el invitado puede cambiar su
respuesta cuantas veces quiera; el RSVP y el estado de la invitación se escriben
en una sola transacción para que nunca diverjan.

---

## Páginas públicas

| Ruta | Qué es |
| --- | --- |
| `/` | Portada del producto. **No consulta la base a propósito**: la versión anterior enlazaba la primera invitación que encontrara, con el nombre del invitado incluido. Como el secreto de una invitación es su slug, eso permitía a cualquiera abrirla y confirmar en nombre de esa persona. |
| `/privacidad` | Aviso de privacidad. Google exige uno accesible para verificar la app de OAuth. |
| `/terminos` | Términos del servicio. |

> Los datos del responsable viven en `RESPONSABLE`, dentro de
> [`LegalPage.tsx`](src/components/legal/LegalPage.tsx). **Hay que sustituirlos
> por los reales antes de publicar**: un aviso con marcadores de posición no
> pasa la revisión de Google.

---

## Pruebas

```bash
npm test
```

Cubren la lógica pura de mayor riesgo: la interpretación de la lista de
invitados, la generación de slugs —que son el secreto de cada invitación, y no
pueden repetirse ni siquiera dentro de un mismo lote—, la coherencia del
catálogo de temas y de los planes, y la regla de cambio de fecha, incluidos los
casos que suelen fallar: el cruce de año, febrero bisiesto y guardar el
formulario sin tocar la fecha.

> **Pendiente:** no hay pruebas de integración del aislamiento entre cuentas,
> que es la garantía más importante del sistema. Necesitan una base de datos de
> pruebas con su montaje y desmontaje.

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
