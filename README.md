# VibeCheck - Seguridad Personal 🛡️

VibeCheck es una PWA (Progressive Web App) diseñada para Bottle Code, enfocada en la seguridad personal mediante el monitoreo de audio en tiempo real.

## Características

- 🎨 **Diseño Material You (M3)**: Interfaz 100% Google con colores dinámicos y superficies con profundidad.
- 🎤 **Monitoreo de Audio**: Visualización de ondas en Canvas reacciona al sonido ambiente.
- 📈 **Detección de Picos**: Identifica sonidos fuertes (gritos o golpes) usando Web Audio API.
- 📳 **Alertas Hápticas**: El teléfono vibra al detectar una emergencia.
- ⏱️ **Cuenta Regresiva SOS**: Sistema de seguridad de 10 segundos similar a Android 14.
- 📍 **Compartir Ubicación**: Prepara un mensaje con tu ubicación GPS (Web Share API + Geolocation) listo para enviar si la cuenta llega a cero.

## Instalación

1. Abre la app en un navegador compatible (Chrome/Edge en Android).
2. Haz clic en "Instalar VibeCheck" o selecciona "Añadir a la pantalla de inicio".
3. Disfruta de una experiencia Full Screen sin marcos.

## Despliegue en GitHub Pages

Para publicar esta app en GitHub Pages:

1. Crea un repositorio en GitHub llamado `VibeCheck`.
2. Sube estos archivos:
   ```bash
   git add .
   git commit -m "Initial VibeCheck release"
   git push origin main
   ```
3. En GitHub, ve a **Settings > Pages** y activa el despliegue desde la rama `main`.

---
*Desarrollado con ❤️ para Bottle Code por Antigravity (Software Engineer).*
