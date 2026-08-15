/* ============================================================
   SEQUENCER — motor de reproducción de la secuencia de eventos
   Corre DENTRO del propio dispositivo prop (100% offline). El
   Modo Director, si está en el mismo dispositivo/pestaña, comparte
   este mismo motor; si está en otra pestaña del mismo navegador,
   se sincroniza vía PPSync (BroadcastChannel).
   ============================================================ */

const PPSequencer = (function () {
  let state = 'idle'; // idle | running | paused | finished
  let currentIndex = 0;
  let timer = null;
  let remainingMs = 0;
  let stepStartedAt = 0;
  let listeners = [];

  function events() {
    const project = PP.currentProject();
    return (project.sequence && project.sequence.events) || [];
  }

  function notify() {
    listeners.forEach((fn) => { try { fn(getStatus()); } catch (e) { console.error(e); } });
  }
  function onChange(fn) { listeners.push(fn); }

  function getStatus() {
    return { state, currentIndex, total: events().length };
  }

  function reset() {
    clearTimeout(timer);
    state = 'idle';
    currentIndex = 0;
    remainingMs = 0;
    notify();
  }

  function start() {
    const evs = events();
    if (evs.length === 0) { if (window.PPUI) PPUI.toast('No hay eventos en la secuencia'); return; }
    if (state === 'finished') { currentIndex = 0; }
    state = 'running';
    scheduleNext();
    notify();
  }

  function pause() {
    if (state !== 'running') return;
    clearTimeout(timer);
    const elapsed = Date.now() - stepStartedAt;
    remainingMs = Math.max(0, remainingMs - elapsed);
    state = 'paused';
    notify();
  }

  function resume() {
    if (state !== 'paused') return;
    state = 'running';
    stepStartedAt = Date.now();
    timer = setTimeout(runCurrentStep, remainingMs);
    notify();
  }

  function scheduleNext() {
    const evs = events();
    if (currentIndex >= evs.length) {
      state = 'finished';
      notify();
      return;
    }
    const ev = evs[currentIndex];
    remainingMs = (ev.delay || 0) * 1000;
    stepStartedAt = Date.now();
    clearTimeout(timer);
    timer = setTimeout(runCurrentStep, remainingMs);
    notify();
  }

  function runCurrentStep() {
    const evs = events();
    const ev = evs[currentIndex];
    if (ev) executeEvent(ev);
    currentIndex++;
    notify();
    if (state === 'running') scheduleNext();
  }

  function skipToNext() {
    clearTimeout(timer);
    const evs = events();
    if (currentIndex < evs.length) {
      const ev = evs[currentIndex];
      executeEvent(ev);
      currentIndex++;
    }
    if (state === 'running') scheduleNext();
    else notify();
  }

  function runManually(index) {
    const evs = events();
    const ev = evs[index];
    if (ev) executeEvent(ev);
  }

  function executeEvent(ev) {
    if (!ev) return;
    const project = PP.currentProject();
    if (ev.type === 'message') {
      const chat = project.chats[ev.payload.contactId];
      if (chat) {
        const now = new Date();
        chat.messages.push({
          id: PP.uid('m'), text: ev.payload.text, time: PP.pad(now.getHours()) + ':' + PP.pad(now.getMinutes()),
          fromMe: false, ticks: 0, date: 'Hoy'
        });
        PP.save();
        const contact = project.contacts.find((c) => c.id === ev.payload.contactId);
        if (window.PPUI) {
          PPUI.showBanner({ app: 'WhatsApp', title: contact ? contact.name : 'WhatsApp', text: ev.payload.text, onTap: () => { PPUI.showScreen('screen-home'); PPUI.openChat ? PPUI.openChat(ev.payload.contactId) : null; } });
          if (PPUI.activeScreen === 'screen-lock') PPUI.renderLock();
          if (PPUI.activeScreen === 'app-whatsapp') PPUI.renderWaList();
          if (PPUI.activeScreen === 'app-wa-chat') PPUI.renderChatMessages();
          PPUI.renderHome();
        }
      }
    } else if (ev.type === 'notification') {
      if (window.PPUI) PPUI.showBanner({ app: ev.payload.app || 'Sistema', title: ev.payload.title, text: ev.payload.text });
    } else if (ev.type === 'call') {
      if (window.PPUI) PPUI.triggerIncomingCall(ev.payload.contactId);
    } else if (ev.type === 'openApp') {
      if (window.PPUI) PPUI.showScreen(ev.payload.screen || 'screen-home');
    }
  }

  // Listen for live "run now" events dispatched from director (same or other tab)
  if (window.PPSync) {
    PPSync.on((msg) => {
      if (msg.type === 'live-event') {
        if (msg.eventType === 'message') executeEvent({ type: 'message', payload: msg.payload });
        else if (msg.eventType === 'notification') executeEvent({ type: 'notification', payload: msg.payload });
        else if (msg.eventType === 'call') executeEvent({ type: 'call', payload: msg.payload });
        else if (msg.eventType === 'seq-start') start();
        else if (msg.eventType === 'seq-pause') pause();
        else if (msg.eventType === 'seq-resume') resume();
        else if (msg.eventType === 'seq-reset') reset();
        else if (msg.eventType === 'seq-next') skipToNext();
      }
    });
  }

  return { start, pause, resume, reset, skipToNext, runManually, getStatus, onChange, executeEvent };
})();
