# Invitaciones digitales

Plataforma para enviar invitaciones digitales individuales, cada una con su
propio enlace, una apertura cinematográfica (el telón se abre desde el centro) y
confirmación de asistencia.

Cada cuenta gestiona sus propios eventos y cada evento elige uno de **cuatro
temas** —Bosque Encantado, Vaqueros, Barbie y Noche de Brillos—, que cambian la
paleta, las tipografías, la escena de fondo y los textos de bienvenida.

- **Invitación pública:** `/i/[slug]` — p. ej. `/i/mariana-lopez`
- **Fotos de la fiesta:** `/f/[code]` (el QR de las mesas) y `/i/[slug]/fotos` (desde la invitación)
- **El recuerdo:** `/r/[code]`
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
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Almacenamiento de las fotos. Sin ellas se usa el disco local (solo desarrollo). |
| `SUPABASE_STORAGE_BUCKET` | Bucket de las fotos. Por defecto `fotos`. |

`.env` está en `.gitignore`; `.env.example` sí se versiona.

En producción define `ADMIN_PASSWORD` únicamente como variable de entorno del
proveedor (Vercel, etc.), ejecuta el seed una vez para crear el usuario, y
después puedes retirarla.

---

### Variables nuevas de esta tanda

```
# Cobro en línea. Sin ellas, el panel sigue pidiendo que escriban por WhatsApp.
MERCADOPAGO_ACCESS_TOKEN="APP_USR-…"
MERCADOPAGO_WEBHOOK_SECRET="…"

# Cifrado de campos en reposo. Sin ella no se cifra nada y todo funciona igual.
# openssl rand -base64 32   ·   ⚠ si se pierde, lo cifrado con ella no vuelve
FIELD_ENCRYPTION_KEY_V1="…"

# El nombre de la marca, para probar candidatos sin desplegar código.
NEXT_PUBLIC_BRAND_NAME="Invitaciones"
```

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

## Envío, seguimiento y entrada

El hueco más grande que tenía el producto no era una pantalla: era el camino
entre **"invitación creada"** e **"invitado en la fiesta"**. El anfitrión
copiaba enlaces uno por uno y no sabía quién los había abierto.

### El embudo

`/admin/envio` clasifica cada invitación en el punto donde está
([`lib/invite-stage.ts`](src/lib/invite-stage.ts)):

| Punto | Qué significa | Qué le toca al anfitrión |
| --- | --- | --- |
| Sin enviar | No ha salido | Mandarla |
| Enviada, sin abrir | Salió y nadie la abrió | Puede que no llegara: reenviar |
| Abierta, sin responder | La vio y no contestó | Un recordatorio |
| Confirmada / No asistirá | Ya respondió | Nada |

Antes solo se sabía "confirmadas" y "pendientes", y con eso lo único que se
puede hacer es insistirle a todo el mundo por igual. La distinción entre *no le
llegó* y *la vio y no responde* es la que convierte el panel en algo accionable.

Una respuesta **gana sobre cualquier otra señal**: el anfitrión puede marcar a
quien le confirmó por teléfono, sin que esa invitación se abriera nunca.

### Cómo se manda

Un toque por invitado abre WhatsApp con el mensaje escrito y, si hay teléfono,
con el chat ya elegido. La plantilla se escribe una vez por evento y admite
`{invitado}`, `{evento}`, `{fecha}` y `{enlace}`
([`lib/invite-message.ts`](src/lib/invite-message.ts)). Un marcador que no
exista se deja tal cual en vez de desaparecer: así el anfitrión ve que no vale.

El teléfono se guarda **como él lo escribió** y se normaliza solo al construir
el enlace ([`lib/phone.ts`](src/lib/phone.ts)). Reescribirlo en la base le
impediría corregir un número que él ve bien y nosotros interpretamos mal.

Marcar como enviada es manual a propósito: WhatsApp se abre en otra aplicación
y no nos cuenta nada, así que fingir certeza sería peor que pedir un toque. Se
marca al abrir WhatsApp y se puede desmarcar.

### Cómo se sabe que la abrió

El aviso lo manda **el navegador del invitado**, no el render de la página. Es
la decisión importante de todo esto: WhatsApp, Telegram y los buscadores piden
el HTML para armar la miniatura, y contarlos haría creer al anfitrión que su
invitado ya la vio — dejaría de insistirle a quien nunca la recibió. Los bots no
ejecutan JavaScript, así que el dato es limpio.

`firstViewedAt` solo se escribe la primera vez y por eso son **dos escrituras**:
un `update` por id no puede expresar "solo si está vacío". Pisarla borraría
cuándo llegó.

La ruta responde **204 siempre**, incluso con un slug que no existe: es pública
y no tiene por qué servir para averiguar qué invitaciones hay.

### La lista de la puerta

`/admin/entrada` se usa el día del evento, de pie y con prisa, así que sus
reglas son distintas a las del resto del panel: objetivos grandes, sin
confirmaciones que interrumpan, y todo deshacible de un toque — en la puerta se
marca mal, y el error tiene que costar un gesto y no una búsqueda.

Cuenta **personas, no invitaciones**: al salón le importa cuánta gente hay
dentro, y una invitación de cuatro pases con dos que llegaron es otro dato. La
hora de llegada no se pisa al corregir el número, y llega gente que no confirmó
—o más de la que cabía en su pase—, así que los textos están escritos para que
eso no parezca un error del sistema.

### La lista, fuera del panel

`/api/invitations/export` da un CSV
([`lib/csv.ts`](src/lib/csv.ts)) porque el día del evento la lista acaba en manos
del salón o del catering, y esa gente trabaja en Excel. Dos detalles que parecen
manías y no lo son: separa por **punto y coma** —Excel en español mete todo en
una columna si ve comas— y lleva **BOM**, sin el cual "Mariana López" sale
"Mariana LÃ³pez". Además, una celda que empiece por `=`, `+`, `-` o `@` se
neutraliza: un invitado apuntado como `=SUMA(...)` no debe ejecutar nada en la
máquina de nadie.

### En la invitación

- **Cuenta atrás.** Es lo que hace que abrirla dos veces no sea lo mismo las dos.
  Se calcula solo en el navegador: `useNow` devuelve 0 en el servidor y el
  componente reserva el hueco sin pintar números, porque una cuenta atrás
  calculada en el servidor ya está caducada cuando llega.
- **Mesa de regalos.** En México casi toda invitación lleva una, y hasta ahora
  el anfitrión no tenía dónde ponerla salvo dentro de la descripción.

---

## Cobro con Mercado Pago

Mercado Pago y no Stripe porque esto se vende en México: aquí la gente paga con
débito, con transferencia SPEI o en efectivo en un OXXO, y Checkout Pro trae los
tres. Se habla con su API REST por `fetch`, sin SDK
([`lib/mercadopago.ts`](src/lib/mercadopago.ts)) — son tres llamadas, la misma
decisión que se tomó con Supabase Storage.

**Sin credenciales configuradas el cobro en línea no existe** y el panel sigue
enseñando el camino de siempre: escribir por WhatsApp y que el equipo suba el
cupo a mano. Nunca revienta por una variable que falte.

```
MERCADOPAGO_ACCESS_TOKEN="APP_USR-…"     # de tu aplicación en Mercado Pago
MERCADOPAGO_WEBHOOK_SECRET="…"           # el de "Notificaciones webhooks"
```

### Dos reglas, y las dos existen porque cobrar mal se paga con dinero

**1. Los créditos NUNCA se dan desde el navegador.** La URL de vuelta la controla
quien paga: cualquiera puede escribir `/admin/pago?estado=exito` en la barra de
direcciones. `/admin/pago` no acredita nada — solo cuenta lo que está pasando y
enseña el cupo real. Los créditos los da
[`/api/pagos/mercadopago`](src/app/api/pagos/mercadopago/route.ts), que es
servidor a servidor, va firmado, y encima le vuelve a preguntar a Mercado Pago
cómo quedó el pago antes de tocar nada.

**2. Acreditar es idempotente.** El aviso llega repetido —siempre— y a veces dos
veces a la vez. Quien lo impide de verdad no es un `if`: es la restricción de
unicidad sobre `providerId` en la base, más `creditedAt`, que una vez puesto no
se vuelve a sumar.

El importe tampoco viaja en la petición: a `/api/pagos/checkout` solo llega el id
del plan y el precio sale del catálogo del servidor. Si viniera del navegador, se
podría comprar el plan de cinco eventos por un peso.

### El libro de créditos

La tabla `payments` es también la respuesta a "¿de dónde salieron mis 3
créditos?". `AdminUser.eventQuota` dice cuántos hay; estas filas dicen de dónde
vinieron, con su plan, su importe y su fecha. El nombre, los créditos y el
importe se **copian** del catálogo al crear el cobro: si mañana sube el precio,
ese cobro tiene que seguir diciendo lo que se cobró aquel día.

Un pago en efectivo tarda hasta tres días hábiles en confirmarse. Por eso la fila
se crea en `PENDING` **antes** de mandar a nadie a pagar: así el aviso siempre
encuentra a quién acreditarle, aunque llegue mucho después de que el navegador
volviera.

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

## Fotos, videos y el recuerdo

Los invitados suben fotos y videos de la fiesta, y con ese material salen dos
piezas distintas:

| Pieza | Para quién | Qué es |
| --- | --- | --- |
| **El recuerdo** (`/r/[code]`) | Quien estuvo en la fiesta | Una web en pantallas, estilo stories. Puede durar dos minutos y nombrar a todo el mundo, porque quien la ve se está buscando en ella. |
| **El video para redes** (`/admin/recuerdo`) | Quien no fue | Un archivo de video descargable, de menos de 32 s, para publicar. Pocos planos, cifras grandes y las mejores fotos. |

No es el mismo contenido en dos formatos: son dos guiones, y por eso la lista de
nombres o el "fotógrafo de la noche" están en el primero y no en el segundo —
fuera de la fiesta no significan nada.

### Dos puertas de entrada

| Ruta | Quién | Cómo se firma la foto |
| --- | --- | --- |
| `/f/[code]` | Cualquiera con el QR de las mesas | Escribe su nombre |
| `/i/[slug]/fotos` | Un invitado, desde su invitación | Con su nombre, sin preguntarle |

Las dos existen porque **los acompañantes no tienen invitación propia** y son
justo quienes más fotos toman. El `code` es un código público del evento
(`Event.shareCode`), corto y aleatorio, generado con un alfabeto de 32 símbolos
sin `0`, `1`, `l` ni `o`, para poder imprimirlo y dictarlo sin confusiones.

Cuando se entra con `slug`, **el nombre lo pone el servidor**: el `authorName`
que llegue en el cuerpo se ignora, para que nadie firme con el nombre de otro.

### El archivo no pasa por el servidor

Son tres pasos por foto en vez de uno, y no es rebuscado: en Vercel el cuerpo de
una función serverless no llega a 5 MB, así que proxear una foto de móvil
rompería con la primera.

1. El navegador **comprime** la foto (1600 px, calidad 0.82 → unos 300 KB).
   Ver [`lib/image.ts`](src/lib/image.ts). En una fiesta se sube con datos
   móviles y mala cobertura: mandar el original son esperas eternas.
2. `POST /api/public/photos/firmar` autoriza y devuelve **a dónde** mandarla.
3. El navegador la sube directo, y `POST /api/public/photos` la da de alta.

Las subidas van **en serie**: cinco a la vez en la red de una fiesta se
estorban entre ellas y fallan más que de una en una.

### Almacenamiento

[`lib/storage.ts`](src/lib/storage.ts) tiene dos controladores tras una interfaz
estrecha. **Nada fuera de ese archivo sabe dónde viven los archivos.**

- **supabase** — producción. API REST por `fetch`, sin SDK: son cuatro llamadas.
- **local** — desarrollo. Escribe en `.uploads/` y sirve por `/api/media`. Existe
  para poder probar el flujo completo sin credenciales, y de paso obliga a que
  la interfaz sea real y no decorativa.

Se elige solo: Supabase manda en cuanto están sus dos variables. El panel avisa
cuando está en local, porque ahí las fotos no se conservan.

La ruta lleva un UUID aleatorio, así que la URL no se adivina: el mismo trato
que ya tienen los slugs de invitación.

### Límites

Viven en el servicio y no en la ruta, porque las dos puertas son públicas:

| | Fotos | Videos |
| --- | --- | --- |
| Por evento | 500 | 60 |
| Por archivo | 8 MB | 40 MB |
| Formatos | JPG, PNG, WebP | MP4, WebM |

Los cupos van **separados**: un clip comprimido pesa como treinta fotos, y
contarlos juntos dejaría un evento sin sitio para fotos por culpa de veinte
videos.

Además, la ruta que se registra tiene que empezar por la del propio evento; si
no, cualquiera podría colgar de su evento un archivo ajeno del bucket. La
portada de un video se comprueba igual que el video, porque es otro archivo del
bucket.

### Videos

Un móvil actual graba a 1080p o 4K con 15–50 MB por cada diez segundos: subir el
original desde la red de un salón no es lento, es imposible. Así que el clip se
**vuelve a codificar en el navegador** antes de salir
([`lib/video.ts`](src/lib/video.ts)): se reproduce, cada fotograma se pinta en un
canvas escalado a 720p, y `MediaRecorder` graba ese canvas con el audio del
original. Medido con un clip de 12 s: **1,76 MB → 940 KB**.

Eso tiene una consecuencia que manda sobre el diseño: **comprimir cuesta lo que
dura el clip**. De ahí el tope de **30 segundos**, que no es solo una decisión de
producto sino lo que hace la espera tolerable, y de ahí que el video sea lo único
que enseña porcentaje mientras sube.

Un video sube **dos archivos**: el clip y su portada (un fotograma tomado a un
décimo del clip, nunca el primero, que suele ser el suelo). Los dos permisos se
firman de una vez, para no obligar a una segunda ida y vuelta a mitad de la
subida. La portada es **best-effort**: si falla, el clip ya está arriba y la
galería tira del propio video. Sin ella, una cuadrícula de diez videos obligaría
al móvil a descargar diez videos para enseñar diez miniaturas.

Tres cosas que se aprendieron midiendo, no leyendo:

- **La duración no sale del archivo grabado.** `MediaRecorder` escribe
  contenedores que mienten: el WebM ni siquiera trae duración. `durationMs` se
  mide sobre la reproducción del original, que es la única cifra fiable.
- **El audio se comprueba antes de conectarlo.** En un Chrome sin dispositivo de
  salida, `AudioContext.currentTime` avanzaba 0,01 s por cada 2 s de reloj; con
  un reloj así el MP4 sale a **tres veces la velocidad** —la imagen llega entera,
  pero cinco segundos se ven en menos de dos—. Si el reloj no avanza, el clip se
  graba mudo, que es un clip que sirve.
- **El bucle de fotogramas tiene dos relojes.** `requestVideoFrameCallback` es el
  bueno mientras la pestaña está a la vista; un `setInterval` de respaldo la
  sigue cuando no lo está. Sin él, cambiar de aplicación a mitad de la subida
  —lo que hace cualquiera en una fiesta— dejaba la barra clavada para siempre.
  Se comprobó: un clip de doce segundos se paró en el 46 % y no volvió.

En la galería los videos van en un **carril horizontal** aparte de las fotos, y
ninguno se reproduce hasta que alguien lo pide. En desarrollo, `/api/media`
atiende **peticiones por rango** (206): sin eso Safari ni empieza a reproducir.

### Moderación

Las fotos se publican **al instante**: en una fiesta la gracia es verlas
aparecer, y pedir aprobación mata la participación. El anfitrión modera después
desde `/admin/fotos`.

**Ocultar y borrar son cosas distintas.** Ocultar es reversible y no toca el
archivo: quita de la vista una foto desafortunada sin destruir el recuerdo de
quien la subió. Borrar sí elimina el archivo. El borrado se hace primero en base
y después en el almacenamiento: si el almacenamiento falla queda un archivo
huérfano, que es mucho más barato que una foto visible cuya fila ya no existe y
que por tanto nadie puede administrar.

### El recuerdo

[`services/rewind.ts`](src/lib/services/rewind.ts) arma la lista de pantallas
**en el servidor**. El navegador no recibe la lista de invitados ni los mensajes
que no se van a enseñar, y añadir una pantalla es añadir un tipo ahí, sin tocar
la animación.

Las pantallas sin datos no se generan: un evento sin fotos no enseña "0 fotos",
simplemente no tiene esa pantalla.

El fondo es **la escena del propio tema**, la misma que la invitación: el
recuerdo tiene que parecer la segunda mitad de la misma pieza, no otra app. Va
con una penumbra encima que sale de `--shade`, porque el elemento más detallado
de cada tema —la bola de espejos, la luna— cae justo donde va el título.

En el reproductor, **una sola línea de tiempo de GSAP por pantalla** gobierna
cuatro cosas: la transición de entrada, la cascada de los elementos, la deriva
de las fotos y la barra de progreso; al terminar, salta. Tenerlo todo junto es
lo que hace que pausar funcione de verdad —se pausa una cosa, no cuatro que se
desincronizan— y que la barra siempre coincida con lo que se ve.

Detalles que separan esto de una galería con botones:

- **Ken Burns**: la foto deriva despacio mientras dura la pantalla. Una foto
  quieta a pantalla completa se ve muerta.
- **Precarga** de las fotos de las dos pantallas siguientes. Sin ella, la foto
  grande aparece a medio cargar justo cuando le toca salir.
- **Gestos**: mantener pulsado pausa, arrastrar de lado cambia, tocar avanza o
  retrocede según la mitad. Un solo puntero resuelve los tres; separarlo en
  botones haría imposible el arrastre, así que los botones de abajo quedan como
  los destinos reales para teclado y lectores de pantalla.
- Una pantalla **a sangre** con la mejor foto —se prefiere una con pie: si
  alguien se molestó en escribirlo, esa foto tiene algo que contar.
- **Compartir** al final: hoja nativa en móvil, portapapeles en escritorio.

El tipo grande se mide en `vh` y no en `vw`: estas pantallas ocupan el viewport
entero y en un móvil en horizontal el texto no cabía.

Con **reducir movimiento** activo no hay animación ni avance automático: las
pantallas se pasan a mano y todo está visible desde el primer frame.

### Qué sale y qué no

El anfitrión decide desde **`/admin/recuerdo`**: marca fotos y mensajes, los
ordena, y ve el resultado. La regla es una sola y vale para los dos
([`lib/rewind-selection.ts`](src/lib/rewind-selection.ts)):

> Si **nadie** tiene posición asignada, elige el sistema.
> Si **alguno** la tiene, salen solo esos, en ese orden.

Eso es lo que permite que el recuerdo funcione sin tocar nada —el caso normal—
y que, en cuanto el anfitrión quiera mandar, no tenga que descartar cincuenta
fotos una por una para quedarse con seis. Vaciar la selección devuelve el
evento a automático, y hay un botón para eso.

Un detalle que no es casual: `rewindOrder` es **NULL** por defecto, así que la
migración no cambió el recuerdo de ningún evento que ya existía.

**El orden es contenido**: la primera foto elegida es la portada a sangre. Si
no hay selección, la portada se prefiere entre las que tengan pie — quien se
molestó en escribirlo tiene algo que contar.

El panel guarda **la lista completa**, no cambios sueltos: encender, apagar y
mover son la misma operación, en una transacción que borra todas las posiciones
y reescribe las que quedan. Idempotente, y sin forma de dejar posiciones
huérfanas o repetidas. Las posiciones se guardan compactas desde 1, para que el
número que ve el anfitrión sea el que hay en la base.

Los topes (**13 fotos**, **5 mensajes**) salen de la forma del recuerdo: una
portada y tres rejillas de cuatro. Pasado eso, lo de más no se vería y el
anfitrión creería que sí, así que se rechaza con un mensaje en vez de tragarlo
en silencio.

Los ids llegan del cliente, así que se comprueban contra el evento antes de
escribir: una foto de otra cuenta se descarta, no se guarda.

Los videos se eligen igual y con su propia numeración: comparten la columna
`rewindOrder` con las fotos, pero el recuerdo los pide en dos consultas
distintas y cada lista se ordena sola, así que un video y una foto pueden tener
los dos la posición 1 sin estorbarse.

### El video para redes

Se genera **en el navegador del anfitrión**, no en el servidor. Componer video
en servidor significa una cola, una máquina que aguante `ffmpeg` y una factura
por evento; aquí el coste es cero y el archivo no sale de su equipo.

El guion lo arma [`services/recap.ts`](src/lib/services/recap.ts) y respeta la
misma selección que el recuerdo: no se le pide al anfitrión que elija las fotos
dos veces.

Tres módulos, separados por lo que hace falta para probarlos:

| Archivo | Qué es | Se puede testear |
| --- | --- | --- |
| [`lib/recap-film.ts`](src/lib/recap-film.ts) | La línea de tiempo: qué plano, cuándo y cuánto | Sí, es puro |
| [`lib/recap-render.ts`](src/lib/recap-render.ts) | El dibujo sobre el canvas, fotograma a fotograma | Necesita navegador |
| [`components/admin/RecapStudio.tsx`](src/components/admin/RecapStudio.tsx) | La vista previa, la grabación y la descarga | Necesita navegador |

La línea de tiempo está aparte y sin una sola referencia al DOM porque es donde
se decide lo que no se puede corregir después. **Grabar cuesta lo que dura el
video**, así que un error de ritmo no se descubre en un segundo: se descubre
veintiocho segundos más tarde. En un test, sí.

`drawRecapFrame(ctx, escenario, t)` es una función **del tiempo y de nada más**.
Eso es lo que permite que el mismo código sirva para tres cosas que si no se
irían pareciendo cada vez menos: la vista previa que corre en bucle en el panel,
la grabación de verdad, y la portada suelta en JPEG. Todo se mide en fracciones
del ancho, así que la vista previa a 360 px y el archivo a 1080 px son el mismo
dibujo.

Tres formatos, todos a 1080 de ancho: **Historia 9:16**, **Publicación 4:5** y
**Cuadrado 1:1**. Ninguno apaisado — en una historia saldría con dos franjas
enormes. En vertical se reserva zona segura arriba y abajo, donde Instagram pone
su interfaz.

Decisiones que salieron de medir, no de suponer:

- **4 Mb/s**, porque WhatsApp rechaza los videos de más de **16 MB** y en México
  es por donde viaja esto. A 8 Mb/s un recuerdo de 28 s pesaba 24,5 MB y no se
  podía mandar; a 4 Mb/s ronda los 13 MB.
- **MP4 cuando el navegador puede.** Instagram no acepta `.webm`, así que si el
  navegador solo sabe grabar eso, se dice en pantalla en vez de dejar que lo
  descubra al subirlo.
- **Sin música**, a propósito: cada red pone la suya al publicar, y la que se
  elige ahí es la que no tumba el alcance por derechos de autor.
- El fondo lleva **grano de película** de una loseta de 128 px que se genera una
  vez y se repite desplazada. Un degradado limpio a 1080 px enseña bandas en
  cuanto se comprime el video; generar ruido de dos millones de píxeles por
  fotograma costaría más que todo lo demás junto.
- La paleta de cada tema está en **hexadecimal literal**
  ([`lib/themes.ts`](src/lib/themes.ts), campo `reel`) y no sale de las variables
  CSS: un canvas no entiende `var(--color-gold-400)` ni `color-mix`.
- Las tipografías se resuelven preguntándole a un elemento con el tema puesto y
  fuera de la pantalla, porque el canvas necesita el **nombre real** de la
  familia. Está fuera de la vista pero no oculto: una fuente que no pinta nada
  no se descarga.

Las imágenes se cargan con `crossOrigin="anonymous"` y eso **no es opcional**:
un canvas contaminado no se puede grabar, y el fallo no sería un error visible
sino un video que no existe.

---

### La música del recuerdo

El anfitrión sube un MP3 desde `/admin/recuerdo` y elige **por dónde empieza**
arrastrando sobre la onda. No es un lujo: el video dura menos de medio minuto y
casi ninguna canción arranca por su mejor parte — sin poder mover la ventana, la
música no encaja y se acaba quitando.

La onda se dibuja con el **máximo** de cada tramo, no con la media. La media de
una canción es casi plana y todas se parecen; el máximo deja ver dónde entra la
batería, que es justo lo que alguien busca cuando arrastra.

El mismo código suena al probar y al grabar
([`lib/soundtrack-audio.ts`](src/lib/soundtrack-audio.ts)): con dos
implementaciones, "lo que oigo" y "lo que se descarga" dejarían de coincidir al
primer cambio.

**No se puede tomar el audio de un enlace de YouTube.** Sus términos no lo
permiten y la canción tampoco sería del anfitrión para publicarla. Se dice en la
propia pantalla, porque es lo primero que se intenta. Para Instagram o TikTok lo
mejor es no ponerle música aquí y elegirla allí, donde ya está licenciada.

Antes de mezclar audio se comprueba que **el reloj del audio avance**. Medido en
una pestaña en segundo plano, `AudioContext.currentTime` avanzaba 0,01 s por cada
2 s de reloj; con un reloj así el contenedor MP4 saca su duración de la pista de
audio y el clip sale a varias veces la velocidad — la imagen llega entera, pero
veintiocho segundos se ven en menos de diez. Si el reloj no avanza, el video se
graba mudo y se dice en pantalla. Un video mudo sirve; uno acelerado no.

---

### Fotos de prueba

Para ver cómo se comportan la galería y el recuerdo con material de verdad:

```bash
npm run seed:demo                                   # 42 invitados repartidos por el embudo
npm run seed:demo -- --code a9d658727d --count 60
npm run seed:demo -- --limpiar                      # borra TODAS las del evento

npm run seed:fotos                                  # 30 fotos en el primer evento
npm run seed:fotos -- --code a9d658727d --count 40
npm run seed:fotos -- --limpiar                     # las borra

npm run seed:videos -- --desde /ruta/con/clips      # pares nombre.mp4 + nombre.jpg
npm run seed:videos -- --limpiar
```

`seed:demo` no vuelca una lista plana: reparte a la gente por el embudo real —sin
enviar, enviada, abierta sin contestar, confirmada, declinada— con las
proporciones que se ven de verdad, y con recados de distinta longitud para que se
note qué elige el recuerdo. Un panel donde todo el mundo confirmó no sirve para
saber si las pantallas se entienden.

`seed:videos` **no genera** los clips: un navegador es lo único que sabe grabar
video aquí. Se generan aparte y el script solo los sube, por los mismos tres
pasos que usa un invitado.

**No son fotos: son escenas dibujadas** —luces desenfocadas, confeti, un pastel,
globos, la pista— rasterizadas a JPEG con sharp
([`scripts/party-images.ts`](scripts/party-images.ts)). No se descarga nada ni
hace falta que nadie ceda su cara para que probemos una cuadrícula. Vienen en
vertical y horizontal mezcladas, con autores repetidos para que "quien más
subió" tenga un ganador de verdad, y con las horas repartidas a lo largo de la
noche.

Suben por la **misma puerta que un invitado** —firmar, subir, registrar— en vez
de insertar filas: así el material de prueba prueba también el camino real, y
funciona igual con el almacenamiento local que con Supabase. Necesita la
aplicación levantada.

---

## Seguridad

### El slug de una invitación es un secreto

Todo lo público —ver la invitación, confirmar asistencia, subir fotos firmando
con el nombre del invitado— se apoya en que **hay que conocer el enlace**. No
hay contraseña detrás.

La primera versión generaba `slugify(nombre)` con `-2`, `-3` para repetidos, y
eso lo hacía adivinable: recorriendo una lista de nombres comunes se podía abrir
`/i/maria-garcia`, leer el mensaje personal de esa persona y **sobrescribir su
respuesta**. Ahora el slug lleva un remate de 7 símbolos de un alfabeto de 32
—unas 34 mil millones de combinaciones por nombre— y conserva la parte legible,
que no es secreta: quien recibe el enlace ya sabe cómo se llama.

Las invitaciones creadas antes de este cambio siguen con el slug viejo. Para
cambiarlas:

```bash
npm run rotar:slugs             # solo las que todavía no se han enviado
npm run rotar:slugs -- --forzar # todas; hay que reenviarlas
```

Por defecto **no toca las ya enviadas**: cambiarles el slug rompe el enlace que
el invitado tiene en su WhatsApp, y para un evento a la vuelta de la esquina eso
es peor que el riesgo. El script las lista para que el anfitrión decida.

### Límite de peticiones

Las rutas públicas de escritura tienen tope ([`lib/rate-limit.ts`](src/lib/rate-limit.ts)):
20 RSVP por minuto y por IP, 120 aperturas de invitación, 90 permisos de subida.
Es lo que convierte "se puede adivinar" en "no se puede adivinar en un tiempo
razonable". El contador vive en base y no en memoria por la misma razón que ya
documentaba el modelo `RateLimit`: en un despliegue sin servidor cada instancia
tiene su propia memoria. Si la base falla, **no se bloquea a nadie**: dejar sin
confirmar a los invitados de una fiesta real es peor que no limitar un rato.

### Cambiar la contraseña cierra las demás sesiones

Quien cambia su contraseña casi siempre lo hace porque cree que alguien más
entró. Si la sesión de ese alguien sigue viva, cambiarla no sirve de nada. Better
Auth guarda las sesiones en base justo para poder revocarlas. La sesión desde la
que se hace el cambio se conserva.

### Cifrado de campos en reposo

[`lib/crypto/field-crypto.ts`](src/lib/crypto/field-crypto.ts) cifra con
AES-256-GCM tres campos concretos:

| Campo | Por qué |
| --- | --- |
| `Invitation.phone` | Es el dato de un tercero. El invitado nunca nos lo dio: lo entregó el anfitrión. |
| `Invitation.personalMessage` | Lo que el anfitrión le escribió a esa persona. |
| `Rsvp.comment` | En bloque, miles de "no puedo, ando fuera" son una lista de quién no está en su casa esa noche. |

Y **no** cifra, con razón:

- `guestName` — ya es público por diseño: va en la URL y en la miniatura de
  WhatsApp. Cifrarlo no reduce ningún riesgo real y rompería el orden del CSV.
- El correo del titular — es la llave de acceso; Better Auth lo busca en cada
  intento de entrada.
- La contraseña — ya está protegida con lo correcto, que es un hash de un solo
  sentido. Cifrar un hash no añade nada: el cifrado es reversible y el hash no.

Protege contra **una** cosa: que alguien se lleve el volcado de Postgres. No
protege contra quien ya entró con una sesión válida ni contra quien tiene el
enlace de una invitación. Decirlo importa, porque "está cifrado" suena a más de
lo que hace.

Sin `FIELD_ENCRYPTION_KEY_V1` no cifra nada y todo funciona igual: eso permite
desplegar el código antes de generar la clave. Para activarlo:

```bash
openssl rand -base64 32          # la clave; en Vercel, nunca con NEXT_PUBLIC_
npm run cifrar:datos -- --revisar  # cuánto falta por cifrar
npm run cifrar:datos               # cifra lo viejo, en su sitio
```

El backfill es idempotente y **no** va en una sola transacción: si se corta a la
mitad, la tabla queda con filas cifradas y filas en claro, que es exactamente lo
que `decryptField` sabe manejar. La aplicación no se cae durante la migración.

> ⚠ **Si se pierde la clave, los datos cifrados con ella no se recuperan.** El
> prefijo `v1:` del texto cifrado existe para poder rotar: se añade
> `FIELD_ENCRYPTION_KEY_V2`, se sube `CURRENT_VERSION`, y lo viejo se sigue
> leyendo con la clave vieja sin migrar de golpe.

### Cabeceras

`next.config.ts` manda `X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options` y `frame-ancestors 'self'` —esta última impide meter el panel
en un iframe ajeno para engañar a un anfitrión con la sesión abierta—. No hay
CSP completa a propósito: Next inyecta scripts en línea y una CSP estricta
necesita nonces por petición; ponerla con `unsafe-inline` daría una falsa
sensación de protección.

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
  seed-demo.ts             Lista de invitados repartida por el embudo
  seed-videos.ts           Sube clips de prueba por la puerta pública
  rotar-slugs.ts           Cambia los slugs adivinables del formato viejo
  cifrar-datos.ts          Cifra lo que se guardó antes de activar la clave
  party-images.ts          Escenas de fiesta dibujadas (JPEG con sharp)
  seed-photos.ts           Llena la galería de un evento para probar
prisma/
  schema.prisma            AdminUser · Event · Invitation · Rsvp · Ticket ·
                           Photo (fotos y videos, por `kind`)
  seed.ts                  Datos de ejemplo, idempotente (`--prod` los omite)
src/
  app/
    i/[slug]/              Invitación pública + opengraph-image + /fotos
    f/[code]/              Subida de fotos y videos (el QR de las mesas)
    r/[code]/              El recuerdo, en formato stories
    admin/login/           Acceso
    admin/(panel)/         Resumen · invitaciones · envío · confirmaciones ·
                           entrada · fotos ·
                           recuerdo · evento · soporte · cuenta · clientes y
                           tickets (superadmin)
    api/                   Route Handlers
  components/
    marketing/             Wordmark (sello) · InvitationPreview (portada)
    invitation/            InvitationCard · InvitationInfo · RSVPModal ·
                           OpeningCurtain · Fireflies · botanicals (SVG)
    invitation/scenes/     SceneShell + una escena por tema + Scene (resolver)
    admin/                 AdminSidebar · StatsCard · InvitationTable ·
                           RSVPTable · EventManager · EventFormModal ·
                           ThemePicker · AccountForms · AccountManager ·
                           AccountFormModal · ActivatePlanState ·
                           TicketBoard · TicketModals · SendBoard · DoorBoard ·
                           PhotoManager · PhotoShare · RewindComposer ·
                           RecapStudio
    pricing/               PlanCards (portada y panel)
    photos/                MediaUploader · PhotoGallery · ClipGallery ·
                           EventPhotosScreen · RewindPlayer · RewindCards ·
                           ClipCard · ShareButton
    ui/                    Button · Field · Modal · Badge · States
  lib/
    services/              Lógica de negocio (account · accounts · events ·
                           invitations · rsvp · stats · tickets · photos ·
                           rewind · rewind-curation · recap · soundtrack ·
                           payments)
    pricing.ts             Planes, precios y contacto comercial
    rewind-selection.ts    Qué sale en el recuerdo (curado o automático)
    invite-stage.ts        En qué punto está cada invitación
    invite-message.ts      Plantilla del mensaje de WhatsApp
    phone.ts               Teléfonos y enlaces de WhatsApp
    csv.ts                 Exportación para Excel
    storage.ts             Almacenamiento (supabase | local)
    image.ts               Compresión de fotos en el navegador
    video.ts               Compresión de videos en el navegador
    brand.ts               Nombre y logo (PENDIENTES, en un solo sitio)
    rate-limit.ts          Tope de peticiones de las rutas públicas
    mercadopago.ts         Cliente REST del cobro
    soundtrack-audio.ts    Onda, escucha y pista de audio del recuerdo
    recap-recorder.ts      Grabación del canvas, un fotograma = un fotograma
    crypto/field-crypto.ts Cifrado de campos sensibles en reposo
    recap-film.ts          Línea de tiempo del video para redes (pura)
    recap-render.ts        Dibujo del video para redes sobre un canvas
    public-clip.ts         DTO de un video ya listo para pintarse
    share-code.ts          Código público del evento
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
| `POST` | `/api/public/photos/firmar` | Público | Autoriza una subida y dice a dónde mandarla. Con `kind: "VIDEO"` firma además la portada. |
| `POST` | `/api/public/photos` | Público | Da de alta la foto o el video ya subidos. |
| `PATCH` | `/api/photos/[id]` | Admin | Oculta o vuelve a mostrar una foto o un video. |
| `DELETE` | `/api/photos/[id]` | Admin | Borra el archivo, y la portada si era un video. |
| `PUT` | `/api/rewind` | Admin | Guarda qué fotos, videos y mensajes salen en el recuerdo, y en qué orden. |
| `POST` | `/api/invitations/enviadas` | Admin | Marca o desmarca invitaciones como enviadas. |
| `POST` | `/api/invitations/[id]/entrada` | Admin | Registra la llegada. Con 0 la deshace. |
| `GET` | `/api/invitations/export` | Admin | La lista completa en CSV. |
| `POST` | `/api/public/invitations/[slug]/visto` | Público | El invitado abrió su invitación. |
| `POST` | `/api/pagos/checkout` | Admin | Abre un cobro y devuelve a dónde mandar al cliente. El importe sale del catálogo, no del cuerpo. |
| `POST` | `/api/pagos/mercadopago` | Firmada | Aviso de Mercado Pago. **El único sitio donde se dan créditos.** |
| `POST` | `/api/events/soundtrack/firmar` | Admin | Autoriza subir la canción del recuerdo. |
| `PUT` | `/api/events/soundtrack` | Admin | Guarda la canción ya subida. |
| `PATCH` | `/api/events/soundtrack` | Admin | Mueve el trozo que suena, sin volver a subir nada. |
| `DELETE` | `/api/events/soundtrack` | Admin | Quita la música y borra su archivo. |
| `PUT` | `/api/media/subir` | Firmada | Solo desarrollo: recibe el archivo. |
| `GET` | `/api/media/[...path]` | Público | Solo desarrollo: sirve el archivo. Atiende rangos (206), que es lo que necesita un `<video>` para poder saltar. |

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
| `/f/[code]` | Subida de fotos del evento. Enlace privado, sin indexar. |
| `/i/[slug]/fotos` | Lo mismo, desde la invitación de un invitado. |
| `/r/[code]` | El recuerdo del evento. |

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
catálogo de temas y de los planes, la regla de cambio de fecha —incluidos los
casos que suelen fallar: el cruce de año, febrero bisiesto y guardar el
formulario sin tocar la fecha— el código público del evento con su reparto de
símbolos, la regla de selección del recuerdo, y la línea de tiempo del video
para redes: que los planos encadenen sin huecos, que el cierre nunca se recorte
por mucho que sobren fotos, que el fundido no se coma un plano corto entero y
que ningún formato salga apaisado; y el cifrado de campos —que va y vuelve, que
detecta un dato alterado en la base, que no descifra con la clave equivocada y
que convive con las filas que aún no se han migrado—.

Los slugs tienen su propia prueba de que **nunca** salen sin azar: es el fallo
más grave que ha tenido este sistema y no puede volver por un refactor.

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
