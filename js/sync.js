/* ============================================================
   SYNC — comunicación entre el MODO DIRECTOR y el MODO PROP.

   LIMITACIÓN IMPORTANTE (léase):
   Una PWA estática sin servidor no puede comunicar dos dispositivos
   físicos distintos por sí sola (Safari no expone WebRTC/Bonjour sin
   señalización, y no hay backend). Por eso esta app usa dos estrategias
   complementarias, pensadas para uso real en rodaje:

   1) MISMO DISPOSITIVO (recomendado y 100% offline):
      El propio MODO PROP incorpora el reproductor de la secuencia de
      eventos. El director configura la secuencia y pulsa "Iniciar" y
      el propio teléfono ejecuta los eventos programados sin depender
      de ningún otro dispositivo. Esto es lo único que garantiza
      funcionamiento offline real en el set.

      Si además el director abre esta misma PWA en OTRA pestaña/ventana
      del MISMO navegador (por ejemplo, un iPad al lado en Split View,
      o dos ventanas en un Mac), BroadcastChannel + el evento 'storage'
      sincronizan ambas vistas al instante, ya que comparten el mismo
      origen y el mismo localStorage no es posible entre dispositivos,
      pero si usas el mismo navegador en pestañas SÍ se sincroniza así.

   2) DOS DISPOSITIVOS DISTINTOS EN LA MISMA WIFI:
      Esto requiere sí o sí algún tipo de servidor de señalización.
      Se deja preparado un "adaptador" (PPSync.remote) con un contrato
      sencillo (WebSocket) para que, si el equipo dispone de un pequeño
      relay en la misma red (por ejemplo un script Node de una sola
      página ejecutado en el portátil del director), la app lo use
      automáticamente. Sin ese relay, la app sigue funcionando entera
      en modo "mismo dispositivo" sin ningún error.
   ============================================================ */

const PPSync = (function () {
  let channel = null;
  let listeners = [];
  let remoteSocket = null;
  let remoteUrl = null;

  function init() {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('propphone-sync');
      channel.onmessage = (ev) => {
        handleMessage(ev.data);
      };
    }
    window.addEventListener('storage', (ev) => {
      if (ev.key === STORAGE_KEY) {
        handleMessage({ type: 'data-changed' });
      }
    });
  }

  function handleMessage(msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'data-changed') {
      PP.reloadFromDisk();
    }
    listeners.forEach((fn) => {
      try { fn(msg); } catch (e) { console.error(e); }
    });
  }

  function on(fn) { listeners.push(fn); }

  function broadcastDataChanged() {
    const msg = { type: 'data-changed', ts: Date.now() };
    if (channel) channel.postMessage(msg);
    sendRemote(msg);
  }

  // Fired by director for live actions independent of persisted data,
  // e.g. "trigger event NOW" so the prop reacts even mid-sequence.
  function broadcastEvent(eventType, payload) {
    const msg = { type: 'live-event', eventType, payload, ts: Date.now() };
    if (channel) channel.postMessage(msg);
    sendRemote(msg);
    // Also handle locally in case director & prop are the same tab
    handleMessage(msg);
  }

  /* ---------------- Optional remote relay (WebSocket) ----------------
     Not required. If you run a small relay on the local network (same
     Wi-Fi as the set) you can call PPSync.connectRemote('ws://IP:PORT')
     from Ajustes → Director → Sincronización, and both the director
     device and the prop device connect to the same relay, which just
     rebroadcasts JSON messages to every connected client. No message
     content is sent anywhere outside the local network. ---------------- */

  function connectRemote(url) {
    try {
      if (remoteSocket) { remoteSocket.close(); }
      remoteSocket = new WebSocket(url);
      remoteUrl = url;
      remoteSocket.onmessage = (ev) => {
        try { handleMessage(JSON.parse(ev.data)); } catch (e) {}
      };
      remoteSocket.onopen = () => { if (window.PPUI) PPUI.toast('🔗 Conectado a la red del director'); };
      remoteSocket.onerror = () => { if (window.PPUI) PPUI.toast('⚠️ No se pudo conectar al relay'); };
      remoteSocket.onclose = () => { remoteSocket = null; };
      localStorage.setItem('propphone_remote_url', url);
    } catch (e) {
      console.error(e);
    }
  }

  function disconnectRemote() {
    if (remoteSocket) remoteSocket.close();
    remoteSocket = null;
    remoteUrl = null;
    localStorage.removeItem('propphone_remote_url');
  }

  function sendRemote(msg) {
    if (remoteSocket && remoteSocket.readyState === 1) {
      try { remoteSocket.send(JSON.stringify(msg)); } catch (e) {}
    }
  }

  function autoReconnect() {
    const saved = localStorage.getItem('propphone_remote_url');
    if (saved) connectRemote(saved);
  }

  function remoteStatus() {
    if (!remoteSocket) return 'disconnected';
    return remoteSocket.readyState === 1 ? 'connected' : 'connecting';
  }

  return { init, on, broadcastDataChanged, broadcastEvent, connectRemote, disconnectRemote, autoReconnect, remoteStatus };
})();
