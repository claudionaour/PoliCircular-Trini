# Publicación de PoliCircular en GitHub Pages

Este proyecto está preparado para desplegarse automáticamente en **GitHub Pages** (por ejemplo `https://claudionaour.github.io/PoliCircular/`) sin afectar su funcionamiento en la raíz `/`.

## Qué incluye esta preparación
- **`vite.config.ts`**: soporta ruta base dinámica mediante `VITE_BASE_PATH` (por defecto `/` y automáticamente `/<nombre-del-repo>/` en GitHub Actions o `/PoliCircular/` con `npm run build:gh-pages`).
- **`src/routes/AppRouter.tsx`**: `<BrowserRouter basename={import.meta.env.BASE_URL}>` para que todas las rutas funcionen bajo el subdirectorio de GitHub Pages.
- **`public/404.html` + `index.html`**: redirección SPA para que recargar páginas o abrir enlaces directos (ej. `/PoliCircular/explorar`) no devuelva error 404 en GitHub Pages.
- **`public/.nojekyll`**: evita que Jekyll bloquee o ignore archivos generados por Vite/PWA.
- **`.github/workflows/deploy-pages.yml`**: flujo automático de GitHub Actions que compila `dist/` y lo publica en cada push a `main`.

## Pasos para publicar en GitHub Pages
1. **Sube los archivos al repositorio en GitHub** (rama `main`), asegurándote de incluir:
   - `.github/workflows/deploy-pages.yml`
   - `firebase-applet-config.json` (necesario para conectar con Firebase en producción)
   - `public/404.html` y `public/.nojekyll`
2. **Activa GitHub Pages con GitHub Actions**:
   - En tu repositorio de GitHub ve a **Settings → Pages**.
   - En **Build and deployment → Source**, selecciona **GitHub Actions**.
   - El workflow `Deploy PoliCircular to GitHub Pages` se ejecutará automáticamente (o puedes lanzarlo manualmente desde la pestaña **Actions**).
3. **Autoriza el dominio de GitHub Pages en Firebase Authentication (obligatorio para "Continuar con Google")**:
   - Abre [Firebase Console](https://console.firebase.google.com/) y selecciona el proyecto **`policircular-b59fa`**.
   - Ve a **Authentication → Settings → Authorized domains → Add domain**.
   - Agrega **`claudionaour.github.io`** (o tu dominio personalizado si usas uno).

## Compilación manual local (opcional)
Si deseas generar la carpeta `dist/` manualmente para GitHub Pages:
```bash
npm run build:gh-pages
```
Si tu repositorio tuviera otro nombre distinto a `PoliCircular`, ejecuta:
```bash
VITE_BASE_PATH=/NombreRepo/ npm run build
```
