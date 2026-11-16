# PoliCircular

> **"Lo que ya no necesitas puede ser lo que alguien está buscando"**

Plataforma web y PWA comunitaria y educativa de economía circular nacida en **Castro, Archipiélago de Chiloé, Región de Los Lagos, Chile**. Permite regalar, intercambiar, reutilizar y recuperar productos **sin utilizar dinero**.

---

## Principios fundamentales

- **Cero operaciones monetarias:** sin precios, sin pagos, sin billeteras ni compraventa. Solo **Regalo gratuito** e **Intercambio directo**.
- **Moderación previa obligatoria:** ninguna publicación aparece en el catálogo público hasta ser aprobada por un moderador y auditada en `moderation_logs`.
- **Privacidad y protección territorial:** los datos privados de contacto y tokens FCM se aíslan bajo `users/{uid}/private/contact`; los mapas OpenStreetMap muestran sectores aproximados.
- **Protección de menores:** cuentas supervisadas con autorización registrada y restricción de comunicación irrestricta.
- **Confirmación bilateral:** ninguna entrega se finaliza ni suma al **Árbol Circular** o **Impacto Circular** hasta que ambas partes confirmen.
- **Transparencia ambiental:** diferencia estrictamente entre **PESO MEDIDO** (pesaje real) y **PESO ESTIMADO** (peso de referencia por categoría).

---

## Estructura del proyecto

- `public/` — Iconos PWA (`192x192`, `512x512`, `maskable`, `apple-touch-icon`) e `icon.svg`.
- `src/modules/` — Módulos independientes: `auth`, `profile`, `products`, `explore`, `matching`, `exchanges`, `reviews`, `circular-tree`, `impact`, `education`, `notifications`, `administration`.
- `src/services/` — Servicios tipados contra Firebase Authentication, Cloud Firestore, Firebase Storage, Firebase Cloud Messaging (FCM) y Firebase Cloud Functions.
- `src/layouts/` — `PublicLayout`, `AppLayout` (con barra inferior móvil de 5 accesos sin administración) y `AdminLayout`.
- `firestore.rules` y `storage.rules` — Reglas de seguridad para Firestore y Storage con control de acceso por roles (`user`, `moderator`, `admin`, `super_admin`).
- `firestore.indexes.json` — Índices compuestos de Cloud Firestore.
- `functions/` — Cloud Functions v2 en TypeScript para operaciones críticas (`assignUserRole`, `moderateProduct`, `acceptMatchRequest`, `confirmExchangeDelivery`, `cancelExchangeAgreement`, `deleteOwnAccount`).
- `tests/` y `firestore.rules.test.ts` — Pruebas de reglas comunitarias, umbrales del Árbol Circular e invariantes de seguridad.

---

## Configuración e inicio con Firebase

### 1. Configuración y variables de entorno

La configuración del proyecto Firebase se carga desde `firebase-applet-config.json`.  
Opcionalmente, copia `.env.example` a `.env` si deseas configurar:

```bash
# Clave Web Push (VAPID) para Firebase Cloud Messaging (opcional)
VITE_FIREBASE_VAPID_KEY=""

# Activar invocación directa a Cloud Functions desplegadas (opcional: "true" | "false")
VITE_ENABLE_CLOUD_FUNCTIONS="false"
```

### 2. Proveedores de autenticación

En Firebase Console → **Authentication → Sign-in method**:
- Habilita **Correo electrónico/contraseña** para registro, verificación de correo y recuperación de contraseña.
- Mantén habilitado **Google** para inicio de sesión con un clic.

### 3. Reglas de seguridad, índices y Cloud Functions

El proyecto incluye:
- `firestore.rules` (validable con `npm run lint:rules` y `npx tsx firestore.rules.test.ts`).
- `storage.rules` (desplegable vía Firebase CLI: `firebase deploy --only storage`).
- `firestore.indexes.json` (desplegable vía `firebase deploy --only firestore:indexes`).
- `functions/src/index.ts` (desplegable en plan Blaze con `firebase deploy --only functions`; al desplegarlas, activa `VITE_ENABLE_CLOUD_FUNCTIONS="true"`).

### 4. Roles administrativos y datos territoriales iniciales

Por seguridad, ningún usuario puede asignarse roles administrativos desde el cliente.  
El superadministrador inicial configurado en reglas (`naourclaudio@gmail.com`) o un superadministrador autorizado en `user_roles` puede gestionar roles (`user`, `moderator`, `admin`, `super_admin`) desde **Administración → Usuarios y roles** y sincronizar los datos iniciales de Castro/Chiloé desde **Administración → Territorio**.

### 5. Desarrollo local y compilación

```bash
npm install
npm run dev
npm run lint
npm run lint:rules
npm run build
```
