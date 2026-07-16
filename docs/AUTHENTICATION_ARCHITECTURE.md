# Autenticación y Persistencia de Sesión en ElectNextStart

Este documento desglosa todos los elementos que participan en la autenticación, autorización y persistencia de la sesión de usuario en la aplicación. Sirve como guía para comprender el flujo completo y replicarlo en otro proyecto.

## 1. Overview general
- **Framework central**: `next-auth` en modo `CredentialsProvider`. Usamos un `session.strategy = "jwt"`, por lo que no se consulta ningún almacén de sesión dedicado: el JWT viaja en una cookie HTTP-only y el cliente lo rehidrata con el hook `useSession`.
- **Persistance**: NextAuth genera un token firmado con `NEXTAUTH_SECRET`, lo almacena como cookie segura y lo renueva cada vez que se accede a `/api/auth/session`. El backend reconstruye la sesión a partir del JWT en cada request. El middleware `withAuth` valida que exista un token antes de servir páginas protegidas.
- **Stack complementario**: TypeORM gestiona las entidades `User`, `Person`, `Permission` y `Audit`. Además del login, se registra auditoría de intentos con `logLoginAudit`.

---

## 2. Configuración de NextAuth
### Archivos clave
- `app/api/auth/authOptions.ts`: define proveedores, callbacks, JWT y eventos.
- `app/api/auth/[...nextauth]/route.ts`: expone el handler de NextAuth (`GET`/`POST`).
- `app/Providers.tsx`: inyecta `SessionProvider` y múltiples contextos (`PermissionsProvider`, `AlertProvider`).

### Proveedor de credenciales
- `CredentialsProvider` comprueba que lleguen `username`/`password`.
- Obtiene la base de datos mediante `getDb()` y consulta `User` con relación `person`.
- Usa `bcrypt.compare` para verificar el hash `pass`. Si falla, registra un evento en la tabla `audits` mediante `logLoginAudit`.
- Si la contraseña es válida, recupera las `permissions` del usuario (`AbilityValue`) y devuelve un objeto con `id`, `name`, `email`, `role` y `permissions`.

### Callbacks JWT/Sesion
- **`jwt`**: almacena `userId`, `role` y `permissions` en el token. También re-carga el rol y permisos desde la base de datos si faltan, garantizando que la sesión se actualice cuando cambian los permisos en BD.
- **`session`**: copia los datos del token (`userId`, `role`, `permissions`, `name`, `email`) a `session.user` para que `useSession` los consuma directamente.
- **`redirect`**: envía a `/home` si no hay `callbackUrl` o si la URL solicitada está dentro de la app.

### Eventos relevantes
- **`signOut`**: se registra el logout en `Audit` a través de `logLoginAudit`. El evento recibe el token y busca el usuario para anotar el cierre de sesión.

### Auditoría y zona horaria
- `logLoginAudit` usa `moment-timezone` para fijar `America/Santiago` y registra la acción (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`) en la tabla `audits`.

---

## 3. Entidades de base de datos involucradas
### `User` (`data/entities/User.ts`)
- Campos obligatorios: `userName`, `pass`, `mail`, `rol` (enum `ADMIN`/`OPERATOR`), relación con `Person`.
- `pass` almacena el hash bcrypt.

### `Person` (`data/entities/Person.ts`)
- Metadata opcional (mail, teléfono, cuentas bancarias). Sirve para mostrar nombre y `dni` en la UI.

### `Permission` (`data/entities/Permission.ts`)
- Define una habilidad (`Ability`) única por usuario.
- Se consulta durante `authorize` y en el callback `jwt`/`session` para poblar el `permissions` array.

### `Audit` (`data/entities/Audit.ts` + `audit.types.ts`)
- Guarda eventos importantes: login exitoso, fallido, logout. Se usa en `logLoginAudit`.

---

## 4. UI y flows de autenticación
### Login (`app/page.tsx`)
- Usa `signIn('credentials', { redirect: false })` para manejar errores en la UI.
- Al login exitoso redirige a `/home`.
- Si el usuario ya está autenticado (`status === 'authenticated'`), `useEffect` lo envía a `/home` automáticamente.
- Hay un dialog (`UpdateDataBaseDialog`) para editar BD, vinculado a un `IconButton` de la esquina.

### Persistencia cliente
- `SessionProvider` (desde `next-auth/react`) envuelve toda la app en `app/Providers.tsx`; así cualquier component en la jerarquía puede llamar a `useSession` o `getSession`.
- Si el token expira o el hook detecta `status === 'unauthenticated'`, se puede redirigir al login.

### Contexto de permisos (`PermissionsContext.tsx`)
- Consume `session.user.permissions` y `role` para construir un set de `AbilityValue` validos.
- Si el rol es `ADMIN`, se agregan todas las habilidades (superusuario).
- Expone helpers `has`/`hasAny` para gating en UI.

---

## 5. Middleware y protección de rutas
- `app/middleware.ts` usa `withAuth` para proteger `/home/**` y `/api/protected/**`.
- El callback `authorized` verifica que exista el `token` de NextAuth; si no hay token, se redirige a `/` (home/login).
- Se define page `signIn: '/'` para redirección automática cuando se requiere autenticación.

---

## 6. Variables de entorno y entorno de ejecución
- `NEXTAUTH_SECRET`: clave para firmar el JWT (32+ chars obligatorio). Se configura en `.env`.
- `NEXTAUTH_URL`: dominio base de la app (http://localhost:3000). Se configura en `.env`.
- La conexión a la base de datos se determina a partir de variables de entorno `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, etc.

---

## 7. Cómo replicar este flujo en otra app
1. **Instalar NextAuth** (`npm install next-auth bcryptjs moment-timezone`) y configurar `app/api/auth/[...nextauth]/route.ts` para exportar `NextAuth(authOptions)`.
2. **Diseñar entidades**: crea `User`, `Person`, `Permission`, `Audit` (con migraciones) similares a las existentes. Asegúrate de que `User.pass` sea un hash bcrypt.
3. **Implementar `authOptions`**:
   - Usa un `CredentialsProvider` donde `authorize` valide credenciales contra la BD y devuelva datos (`id`, `name`, `email`, `role`, `permissions`).
   - Registra auditoría con `logLoginAudit` en cada intento.
   - Configura `session.strategy = 'jwt'` y `jwt.maxAge` / `session.maxAge` a 24h o lo que necesites.
   - En los callbacks `jwt`/`session`, copia los campos del token al session para que el cliente los consuma.
   - Usa eventos `signOut` para limpiar auditoría si necesitas.
4. **Capa de sesión en cliente**:
   - En `app/Providers.tsx`, envuelve con `SessionProvider`.
   - Crea un contexto de permisos que consulte `session.user.permissions` y `role` para exponer `has`/`hasAny`.
5. **Login UI**:
   - Usa `signIn('credentials', { redirect: false })` para controlar errores y `router.push` para navegar.
   - Mantén el formulario dentro de `app/page.tsx` o una ruta `/auth/login`.
6. **Middleware para rutas protegidas**:
   - Usa `withAuth` y configura el matcher para las rutas que deben exigir autenticación.
   - Define `pages.signIn` para la ruta de login.
7. **Env y build**:
   - Asegúrate de definir `NEXTAUTH_SECRET` y `NEXTAUTH_URL` en `.env` y/o `src/main.*` si ejecutas en Electron o entornos especiales.
   - Si prefieres, usa `next.config.js` para exponer variables necesarias.
8. **Auditoría y permisos**:
   - Registra login/logout en una tabla `audits` si necesitas trazabilidad. Puedes reutilizar `logLoginAudit` para centralizar la lógica de timestamps.
   - Guarda permisos en una tabla `permissions` con `ability` (string) y relación con `User`. A nivel UI, filtra `validAbilities` antes de usar el contexto.
9. **Persistencia de sesión**:
   - NextAuth/Gateway se encarga automáticamente. Lo único que necesitas es llamar a `useSession` desde componentes y proteger rutas con `withAuth`.
   - Si deseas sesiones más largas, ajusta `session.maxAge` y `jwt.maxAge`.

---

## 8. Referencias y links clave
- `app/page.tsx` → Login + `signIn`.
- `app/api/auth/authOptions.ts` → lógica completa de `CredentialsProvider`, callbacks y auditoría.
- `app/api/auth/[...nextauth]/route.ts` → endpoint de NextAuth.
- `app/Providers.tsx` + `state/contexts/PermissionsContext.tsx` → session/perm contexts.
- `app/middleware.ts` → protección de rutas.
- `data/entities/*.ts` → esquema de `User`, `Permission`, `Person`, `Audit`.
- `src/main.dev.ts` y `src/main.prod.ts` → inicialización de `NEXTAUTH_URL`/`NEXTAUTH_SECRET` para Electron.
- `.env.example` y `README.md` → recordatorio de qué variables exponer.

Con esta base puedes extraer el patrón y replicarlo en cualquier proyecto Next.js: define tu proveedor NextAuth, asegúrate de devolver los campos necesarios en `authorize`, usa `SessionProvider` y `withAuth`, y mantén la auditoría/permisos sincronizados con tus entidades.