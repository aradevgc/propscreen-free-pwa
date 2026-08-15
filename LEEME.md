# Prop Phone — Teléfono ficticio para rodajes

PWA 100% funcional (HTML + CSS + JS vanilla, sin frameworks ni Node.js en el
iPhone) para convertir un iPhone en un teléfono ficticio ("prop phone")
controlado por el equipo de rodaje.

## 1. Cómo alojarla (necesitas HTTPS para instalar como PWA)

Un PWA para iPhone debe servirse por **HTTPS** (o `http://localhost`) — Safari
no permite instalar una PWA con Service Worker desde `file://`. Opciones
gratuitas (0 € de coste):

- **GitHub Pages**: sube esta carpeta a un repositorio y activa Pages.
- **Netlify / Vercel / Cloudflare Pages**: arrastra la carpeta al panel (plan gratuito).
- **Red local de rodaje**: sirve la carpeta con cualquier servidor estático
  (por ejemplo `npx serve .` o `python3 -m http.server`) y usa un túnel HTTPS
  gratuito si necesitas acceso desde el iPhone sin desplegar nada.

Una vez tengas la URL:

1. Ábrela en Safari en el iPhone.
2. Toca **Compartir** → **Añadir a pantalla de inicio**.
3. Ábrela desde el icono de la pantalla de inicio (se abre a pantalla
   completa, sin barra de Safari).
4. A partir de ese momento funciona **offline**: el Service Worker
   (`sw.js`) cachea toda la app la primera vez que se carga.

## 2. Flujo de uso en rodaje

1. Abre la app → pantalla de bloqueo → toca para entrar a la pantalla de
   inicio.
2. Pulsa el icono 🎬 del dock (o Ajustes → "Modo Director") para entrar en
   el **Modo Director**.
3. Configura:
   - **Teléfono**: hora, batería, wifi, señal, fondo de pantalla.
   - **Contactos**: crea los contactos que aparecerán en WhatsApp/Llamadas.
   - **WhatsApp**: crea conversaciones completas, mensaje a mensaje, con
     hora y ticks.
   - **Llamadas**: registro de llamadas.
   - **Notificaciones**: banners que pueden lanzarse al instante.
   - **Secuencia**: la línea de tiempo de eventos (mensaje, llamada,
     notificación) con el retraso en segundos entre cada uno.
   - **Fotos/Vídeos**: multimedia que el actor podrá abrir desde Fotos.
   - **Proyectos**: guarda una configuración distinta por escena
     ("ESCENA 24", "ESCENA 36"...).
4. Pulsa "Ver Prop" para volver a la vista del actor, o directamente pulsa
   **▶ INICIAR** en la pestaña Control para lanzar la secuencia — se
   ejecuta dentro del propio teléfono, sin depender de otro dispositivo.
5. Entrega el teléfono al actor. Puede desbloquearlo y usar WhatsApp y
   Teléfono con normalidad; los eventos programados aparecerán solos.

## 3. Sobre la sincronización remota (dos dispositivos)

Por diseño de seguridad de iOS/Safari, **una PWA estática sin servidor no
puede controlar directamente otro iPhone físico**. Esta app resuelve el caso
de uso real de dos maneras:

- **Recomendada**: la secuencia de eventos vive y se reproduce *dentro* del
  propio teléfono prop. El director configura todo y pulsa "Iniciar" antes
  de la toma — funciona 100% offline, sin ningún otro dispositivo.
- **Opcional**: la pestaña "Sincronización" del Modo Director permite
  conectar a un pequeño relay WebSocket en la misma red Wi-Fi (por ejemplo,
  un script Node de una sola página ejecutado en el portátil del director)
  para lanzar llamadas/mensajes/notificaciones en tiempo real desde un
  segundo dispositivo. Sin ese relay, todo lo demás sigue funcionando con
  normalidad.
- Si el Modo Director y el Modo Prop se abren en dos pestañas/ventanas del
  **mismo navegador** (mismo dispositivo, por ejemplo iPad en Split View),
  se sincronizan automáticamente en tiempo real.

## 4. Seguridad

Todo es simulado y local: no se realizan llamadas reales, no se envían
mensajes reales, no se accede a contactos reales del dispositivo y no se
envían datos a ningún servidor externo. Todos los datos (contactos, chats,
fotos) se guardan en `localStorage`, en el propio dispositivo.

## 5. Estructura del proyecto

```
index.html          → estructura de todas las pantallas
manifest.json        → configuración de instalación PWA
sw.js                 → Service Worker (caché offline)
css/style.css         → estética iOS / WhatsApp
js/storage.js         → modelo de datos y persistencia
js/sync.js            → sincronización entre pestañas/dispositivos
js/ui.js              → pantallas del actor (Modo Prop)
js/sequencer.js        → motor de la línea de tiempo de eventos
js/director.js         → panel de control (Modo Director)
js/main.js             → arranque, instalación PWA
icons/                 → iconos de la app
```
