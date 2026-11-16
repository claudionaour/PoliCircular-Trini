# Cómo instalar o generar el archivo `.apk` de PoliCircular para Android

PoliCircular ya está configurado como **PWA instalable (WebAPK)** y como **proyecto nativo Android con Capacitor** (`cl.policircular.castro`).

---

## Opción 1 — Instalación directa en Android (sin PC ni compilación)

1. Abre la URL publicada de PoliCircular en **Google Chrome** desde tu teléfono Android.
2. Toca **Instalar app** (o el menú **⋮** → **Instalar aplicación**).
3. Android generará e instalará automáticamente la app (WebAPK) con el ícono de PoliCircular en tu pantalla de inicio.

---

## Opción 2 — Generar archivo `PoliCircular.apk` en 1 minuto (sin instalar programas)

1. Ve a **[PWABuilder](https://www.pwabuilder.com/)** desde tu navegador.
2. Pega la URL pública de PoliCircular (por ejemplo `https://ais-pre-dj7zeddnfchgopwqeu36fl-839173396062.us-east1.run.app`) y presiona **Start**.
3. Haz clic en **Package for stores** → **Android** → **Download Package**.
4. Obtendrás un archivo `.zip` con el `.apk` listo para compartir e instalar en cualquier teléfono Android.

---

## Opción 3 — Compilar `.apk` nativo desde el proyecto Capacitor (`android/`)

El proyecto nativo ya incluye los íconos oficiales de PoliCircular, pantalla de carga (`#0B1E33`), permisos de red y sincronización con `dist/`.

### Con Android Studio (Windows / Mac / Linux)
1. Descarga el proyecto y ejecuta en la raíz:
   ```bash
   npm install
   npm run cap:sync
   npx cap open android
   ```
2. En Android Studio selecciona **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. El archivo quedará en `android/app/build/outputs/apk/debug/app-debug.apk`.

### Con línea de comandos (Java 21 + Android SDK 36)
```bash
npm install
npm run cap:sync
cd android
./gradlew assembleDebug
```

### Con GitHub Actions (automático en la nube)
Al subir este repositorio a GitHub, el flujo `.github/workflows/android-apk.yml` compila el archivo `.apk` automáticamente y lo deja disponible para descargar en la pestaña **Actions → PoliCircular-Android-APK**.
