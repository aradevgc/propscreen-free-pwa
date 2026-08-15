/* ============================================================
   UI — pantallas del MODO PROP (lo que ve el actor)
   ============================================================ */

const PPUI = (function () {

  let activeScreen = 'screen-lock';
  let currentChatContactId = null;
  let clockTimer = null;
  let activeCallTimer = null;
  let activeCallSeconds = 0;
  let activeCallContact = null;
  let photoViewerIndex = 0;
  let toastTimer = null;

  const APP_ICONS = {
    WhatsApp: '💬', Sistema: '⚙️', Teléfono: '📞', Mensajes: '✉️', Batería: '🔋', Recordatorio: '⏰'
  };
  const APP_COLORS = {
    WhatsApp: '#25d366', Sistema: '#8e8e93', Teléfono: '#30d158', Mensajes: '#30d158', Batería: '#ff9f0a', Recordatorio: '#ff453a'
  };

  function $(sel) { return document.querySelector(sel); }
  function $id(id) { return document.getElementById(id); }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    const el = $id(id);
    if (el) el.classList.add('active');
    activeScreen = id;
  }

  function toast(msg) {
    const t = $id('dir-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------------- Clock / status bar ---------------- */
  function currentTimeString(project) {
    if (project.phone.useLiveTime !== false) {
      const now = new Date();
      return PP.pad(now.getHours()) + ':' + PP.pad(now.getMinutes());
    }
    return project.phone.manualTime || '9:41';
  }
  function currentDateString(project) {
    if (project.phone.manualDate) return project.phone.manualDate;
    const now = new Date();
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`;
  }

  function signalBarsHtml(n) {
    const bars = ['▁', '▃', '▅', '▇'];
    let s = '';
    for (let i = 0; i < 4; i++) s += i < n ? bars[Math.min(i, 3)] : '';
    return '📶'.repeat(0) + (n > 0 ? '▂▄▆'.slice(0, Math.max(1, n)) : '');
  }

  function updateStatusBars() {
    const project = PP.currentProject();
    const time = currentTimeString(project);
    ['lock', 'home', 'wa', 'ph', 'ph2', 'gen', 'set'].forEach((k) => {
      const t = $id('sb-time-' + k);
      if (t) t.textContent = time;
      const b = $id('sb-batt-' + k);
      if (b) b.textContent = '🔋 ' + project.phone.battery + '%';
      const s = $id('sb-signal-' + k);
      if (s) s.textContent = signalBarsHtml(project.phone.signalBars);
      const w = $id('sb-wifi-' + k);
      if (w) w.textContent = project.phone.wifiOn ? '📶' : '';
    });
  }

  function startClock() {
    clearInterval(clockTimer);
    clockTimer = setInterval(() => {
      const project = PP.currentProject();
      $id('lock-time').textContent = currentTimeString(project);
      $id('lock-date').textContent = currentDateString(project);
      updateStatusBars();
    }, 1000);
  }

  /* ---------------- Wallpapers ---------------- */
  function applyWallpapers() {
    const p = PP.currentProject().phone;
    const lockBg = $id('lock-bg');
    const homeBg = $id('home-bg');
    const grad = `linear-gradient(160deg, ${p.wallpaperColor1 || '#1a2a3a'}, ${p.wallpaperColor2 || '#0a0f1a'})`;
    if (p.wallpaperLock) {
      lockBg.style.backgroundImage = `url(${p.wallpaperLock})`;
    } else {
      lockBg.style.backgroundImage = grad;
    }
    if (p.wallpaperHome) {
      homeBg.style.backgroundImage = `url(${p.wallpaperHome})`;
    } else {
      homeBg.style.backgroundImage = grad;
    }
  }

  /* ---------------- Lock screen ---------------- */
  function renderLock() {
    const project = PP.currentProject();
    $id('lock-time').textContent = currentTimeString(project);
    $id('lock-date').textContent = currentDateString(project);
    applyWallpapers();
    updateStatusBars();
    const wrap = $id('lock-notifs');
    wrap.innerHTML = '';
    // Show unread whatsapp as a lock notification summary
    let unreadTotal = 0;
    Object.entries(project.chats || {}).forEach(([cid, chat]) => {
      const unread = (chat.messages || []).filter((m) => !m.fromMe && !m._seen).length;
      unreadTotal += unread;
    });
    if (unreadTotal > 0) {
      const lastContact = findLastMessageContact(project);
      wrap.innerHTML += notifCardHtml('WhatsApp', lastContact ? lastContact.name : 'WhatsApp',
        `${unreadTotal} mensaje${unreadTotal > 1 ? 's' : ''} nuevo${unreadTotal > 1 ? 's' : ''}`);
    }
  }

  function findLastMessageContact(project) {
    let best = null, bestTime = -1;
    Object.entries(project.chats || {}).forEach(([cid, chat]) => {
      (chat.messages || []).forEach((m, i) => {
        if (!m.fromMe) { best = project.contacts.find((c) => c.id === cid); bestTime = i; }
      });
    });
    return best;
  }

  function notifCardHtml(app, title, text) {
    const icon = APP_ICONS[app] || '🔔';
    const color = APP_COLORS[app] || '#8e8e93';
    return `<div class="lock-notif">
      <div class="n-icon" style="background:${color}">${icon}</div>
      <div class="n-body">
        <div class="n-top"><span>${escapeHtml(app)}</span><span>ahora</span></div>
        <div class="n-title">${escapeHtml(title)}</div>
        <div class="n-text">${escapeHtml(text)}</div>
      </div>
    </div>`;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function unlockPhone() {
    showScreen('screen-home');
    renderHome();
  }

  /* ---------------- Home screen ---------------- */
  function renderHome() {
    const project = PP.currentProject();
    updateStatusBars();
    applyWallpapers();
    let unread = 0;
    Object.values(project.chats || {}).forEach((chat) => {
      unread += (chat.messages || []).filter((m) => !m.fromMe && !m._seen).length;
    });
    const badge = $id('badge-whatsapp');
    if (unread > 0) { badge.textContent = unread; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');

    const missedCalls = (project.callLog || []).filter((c) => c.missed && !c._seen).length;
    const pbadge = $id('badge-phone');
    if (missedCalls > 0) { pbadge.textContent = missedCalls; pbadge.classList.remove('hidden'); }
    else pbadge.classList.add('hidden');
  }

  function openApp(name) {
    const project = PP.currentProject();
    if (name === 'whatsapp') { showScreen('app-whatsapp'); renderWaList(); }
    else if (name === 'phone') { showScreen('app-phone'); renderPhoneRecents(); renderContacts(); }
    else if (name === 'photos') { showScreen('app-photos'); renderPhotos(); }
    else if (name === 'settings') { showScreen('app-settings'); }
    else if (name === 'director-entry') { window.PPMain.enterDirectorMode(); }
    else { $id('generic-title').textContent = name; showScreen('app-generic'); }
  }

  /* ---------------- WhatsApp list ---------------- */
  function renderWaList() {
    const project = PP.currentProject();
    const list = $id('wa-chat-list');
    const entries = Object.entries(project.chats || {}).map(([cid, chat]) => {
      const contact = project.contacts.find((c) => c.id === cid);
      const msgs = chat.messages || [];
      const last = msgs[msgs.length - 1];
      const unread = msgs.filter((m) => !m.fromMe && !m._seen).length;
      return { cid, contact, chat, last, unread };
    }).filter((e) => e.contact);

    entries.sort((a, b) => (b.chat.pinned ? 1 : 0) - (a.chat.pinned ? 1 : 0));

    if (entries.length === 0) {
      list.innerHTML = `<div class="ph-empty" style="margin-top:60px;color:var(--wa-text-dim)">No hay conversaciones.<br>Créalas desde Modo Director.</div>`;
      return;
    }

    list.innerHTML = entries.map((e) => {
      const initials = (e.contact.name || '?').slice(0, 1).toUpperCase();
      const avatarStyle = e.contact.photo ? `background-image:url(${e.contact.photo})` : '';
      const lastText = e.last ? (e.last.type === 'image' ? '📷 Foto' : e.last.type === 'video' ? '🎥 Vídeo' : e.last.text) : '';
      const lastTicks = e.last && e.last.fromMe ? ticksSpan(e.last.ticks) : '';
      return `<div class="wa-chat-row" data-chat="${e.cid}">
        <div class="avatar" style="${avatarStyle}">${e.contact.photo ? '' : initials}</div>
        <div class="wa-chat-main">
          <div class="wa-chat-top">
            <div class="wa-chat-name">${e.chat.pinned ? '📌 ' : ''}${escapeHtml(e.contact.name)}</div>
            <div class="wa-chat-time ${e.unread ? 'unread' : ''}">${e.last ? e.last.time : ''}</div>
          </div>
          <div class="wa-chat-bottom">
            <div class="wa-chat-last">${lastTicks}${escapeHtml(lastText || '')}</div>
            ${e.unread ? `<div class="wa-badge">${e.unread}</div>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('.wa-chat-row').forEach((row) => {
      row.addEventListener('click', () => openChat(row.dataset.chat));
    });
  }

  function ticksSpan(ticks) {
    if (ticks === 2) return '<span style="color:var(--wa-tick-blue)">✓✓</span> ';
    if (ticks === 1) return '<span>✓✓</span> ';
    return '<span>✓</span> ';
  }

  function openChat(contactId) {
    currentChatContactId = contactId;
    const project = PP.currentProject();
    const contact = project.contacts.find((c) => c.id === contactId);
    if (!contact) return;
    $id('wa-chat-name').textContent = contact.name;
    $id('wa-chat-status').textContent = contact.status || 'en línea';
    const av = $id('wa-chat-avatar');
    av.textContent = contact.photo ? '' : (contact.name || '?').slice(0, 1).toUpperCase();
    av.style.backgroundImage = contact.photo ? `url(${contact.photo})` : '';

    // mark as seen
    const chat = project.chats[contactId];
    if (chat) { chat.messages.forEach((m) => { m._seen = true; }); PP.save(); }

    renderChatMessages();
    showScreen('app-wa-chat');
  }

  function renderChatMessages() {
    if (!currentChatContactId) return;
    const project = PP.currentProject();
    const chat = project.chats[currentChatContactId];
    const wrap = $id('wa-messages');
    if (!chat || !chat.messages || chat.messages.length === 0) {
      wrap.innerHTML = `<div class="ph-empty" style="color:var(--wa-text-dim)">Sin mensajes todavía.</div>`;
      return;
    }
    let html = '';
    let lastDate = null;
    chat.messages.forEach((m) => {
      const dateLabel = m.date || 'Hoy';
      if (dateLabel !== lastDate) {
        html += `<div class="wa-date-sep">${escapeHtml(dateLabel)}</div>`;
        lastDate = dateLabel;
      }
      let mediaHtml = '';
      if (m.type === 'image' && m.mediaUrl) mediaHtml = `<img src="${m.mediaUrl}">`;
      if (m.type === 'video' && m.mediaUrl) mediaHtml = `<video src="${m.mediaUrl}" controls playsinline></video>`;
      html += `<div class="wa-msg-row ${m.fromMe ? 'out' : 'in'}">
        <div class="wa-bubble ${m.fromMe ? 'out' : 'in'}">
          ${mediaHtml}
          ${m.text ? escapeHtml(m.text) : ''}
          <span class="wa-meta"><span class="wa-time">${m.time || ''}</span>${m.fromMe ? `<span class="wa-ticks ${m.ticks === 2 ? 'read' : ''}">${m.ticks === 0 ? '✓' : '✓✓'}</span>` : ''}</span>
        </div>
      </div>`;
    });
    wrap.innerHTML = html;
    wrap.scrollTop = wrap.scrollHeight;
  }

  function sendManualMessage() {
    const input = $id('wa-input');
    const text = input.value.trim();
    if (!text || !currentChatContactId) return;
    const project = PP.currentProject();
    const chat = project.chats[currentChatContactId];
    if (!chat) return;
    const now = new Date();
    chat.messages.push({
      id: PP.uid('m'), text, time: PP.pad(now.getHours()) + ':' + PP.pad(now.getMinutes()),
      fromMe: true, ticks: 1, date: 'Hoy'
    });
    input.value = '';
    PP.save();
    renderChatMessages();
    renderWaList();
  }

  /* ---------------- Phone app ---------------- */
  function renderPhoneRecents() {
    const project = PP.currentProject();
    const list = $id('ph-recents-list');
    const log = project.callLog || [];
    if (log.length === 0) {
      list.innerHTML = `<div class="ph-empty">No hay llamadas recientes.</div>`;
      return;
    }
    list.innerHTML = log.slice().reverse().map((c) => {
      const contact = project.contacts.find((ct) => ct.id === c.contactId);
      const name = contact ? contact.name : 'Desconocido';
      const icon = c.direction === 'outgoing' ? '↗' : (c.missed ? '↙' : '↙');
      return `<div class="ph-call-row">
        <div class="avatar">${(name || '?').slice(0, 1).toUpperCase()}</div>
        <div class="ph-call-info">
          <div class="ph-call-name ${c.missed ? 'missed' : ''}">${escapeHtml(name)}</div>
          <div class="ph-call-meta">${icon} ${c.direction === 'outgoing' ? 'saliente' : (c.missed ? 'perdida' : 'entrante')}</div>
        </div>
        <div class="ph-call-time">${escapeHtml(c.time || '')}</div>
      </div>`;
    }).join('');
  }

  function renderContacts() {
    const project = PP.currentProject();
    const list = $id('ph-contacts-list');
    if (!project.contacts || project.contacts.length === 0) {
      list.innerHTML = `<div class="ph-empty">No hay contactos.</div>`;
      return;
    }
    list.innerHTML = project.contacts.map((c) => `
      <div class="contact-row">
        <div class="avatar">${(c.name || '?').slice(0, 1).toUpperCase()}</div>
        <div class="contact-name">${escapeHtml(c.name)} ${escapeHtml(c.lastName || '')}</div>
      </div>`).join('');
  }

  function setupPhoneTabs() {
    document.querySelectorAll('.ph-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.ph-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const which = tab.dataset.phtab;
        $id('ph-recents-list').classList.toggle('hidden', which !== 'recents');
        $id('ph-contacts-list').classList.toggle('hidden', which !== 'contacts');
        $id('ph-title').textContent = which === 'recents' ? 'Recientes' : which === 'contacts' ? 'Contactos' : 'Teclado';
      });
    });
  }

  /* ---------------- Photos ---------------- */
  function renderPhotos() {
    const project = PP.currentProject();
    const grid = $id('photos-grid');
    const media = project.media || [];
    if (media.length === 0) {
      grid.innerHTML = `<div class="ph-empty" style="grid-column:1/4">No hay fotos ni vídeos cargados.<br>Añádelos desde Modo Director.</div>`;
      return;
    }
    grid.innerHTML = media.map((m, i) => `
      <div class="photo-thumb" data-i="${i}" style="background-image:url(${m.type === 'video' ? (m.thumb || '') : m.url})">
        ${m.type === 'video' ? '<span class="vid-badge">▶ vídeo</span>' : ''}
      </div>`).join('');
    grid.querySelectorAll('.photo-thumb').forEach((el) => {
      el.addEventListener('click', () => openPhotoViewer(parseInt(el.dataset.i, 10)));
    });
  }

  function openPhotoViewer(index) {
    const project = PP.currentProject();
    const media = project.media || [];
    if (!media[index]) return;
    photoViewerIndex = index;
    showMediaAt(index);
    showScreen('screen-photo-viewer');
  }

  function showMediaAt(index) {
    const project = PP.currentProject();
    const m = project.media[index];
    if (!m) return;
    const img = $id('viewer-img'), vid = $id('viewer-video');
    if (m.type === 'video') {
      vid.src = m.url; vid.classList.remove('hidden'); img.classList.add('hidden');
    } else {
      img.src = m.url; img.classList.remove('hidden'); vid.classList.add('hidden'); vid.pause();
    }
  }

  /* ---------------- Notification banner ---------------- */
  function showBanner({ app, title, text, onTap }) {
    const layer = $id('notif-banner-layer');
    const icon = APP_ICONS[app] || '🔔';
    const color = APP_COLORS[app] || '#8e8e93';
    const el = document.createElement('div');
    el.className = 'notif-banner';
    el.innerHTML = `<div class="n-icon" style="background:${color}">${icon}</div>
      <div class="n-body">
        <div class="n-top"><span>${escapeHtml(app)}</span><span>ahora</span></div>
        <div class="n-title">${escapeHtml(title)}</div>
        <div class="n-text">${escapeHtml(text)}</div>
      </div>`;
    if (onTap) el.addEventListener('click', onTap);
    layer.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s, transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-30%)';
      setTimeout(() => el.remove(), 320);
    }, 3600);
  }

  /* ---------------- Calls ---------------- */
  function triggerIncomingCall(contactId) {
    const project = PP.currentProject();
    const contact = project.contacts.find((c) => c.id === contactId);
    if (!contact) return;
    activeCallContact = contact;
    $id('call-in-name').textContent = contact.name;
    const av = $id('call-in-avatar');
    av.textContent = contact.photo ? '' : (contact.name || '?').slice(0, 1).toUpperCase();
    av.style.backgroundImage = contact.photo ? `url(${contact.photo})` : '';
    showScreen('screen-incoming-call');
    if (navigator.vibrate) { try { navigator.vibrate([400, 200, 400, 200, 400]); } catch (e) {} }
  }

  function acceptCall() {
    if (!activeCallContact) return;
    $id('call-active-name').textContent = activeCallContact.name;
    const av = $id('call-active-avatar');
    av.textContent = activeCallContact.photo ? '' : (activeCallContact.name || '?').slice(0, 1).toUpperCase();
    av.style.backgroundImage = activeCallContact.photo ? `url(${activeCallContact.photo})` : '';
    activeCallSeconds = 0;
    updateCallTimer();
    clearInterval(activeCallTimer);
    activeCallTimer = setInterval(() => { activeCallSeconds++; updateCallTimer(); }, 1000);
    showScreen('screen-active-call');
    logCall(activeCallContact.id, 'incoming', false);
  }

  function updateCallTimer() {
    const m = Math.floor(activeCallSeconds / 60), s = activeCallSeconds % 60;
    $id('call-timer').textContent = PP.pad(m) + ':' + PP.pad(s);
  }

  function declineCall() {
    if (activeCallContact) logCall(activeCallContact.id, 'incoming', true);
    endCallUI();
  }

  function hangupCall() {
    endCallUI();
  }

  function endCallUI() {
    clearInterval(activeCallTimer);
    activeCallTimer = null;
    activeCallContact = null;
    const goHome = activeScreen === 'screen-incoming-call' || activeScreen === 'screen-active-call';
    if (goHome) showScreen('screen-home');
    renderHome();
  }

  function logCall(contactId, direction, missed) {
    const project = PP.currentProject();
    const now = new Date();
    project.callLog = project.callLog || [];
    project.callLog.push({
      id: PP.uid('call'), contactId, direction, missed: !!missed,
      time: PP.pad(now.getHours()) + ':' + PP.pad(now.getMinutes())
    });
    PP.save();
  }

  /* ---------------- Event wiring ---------------- */
  function bindNav() {
    $id('screen-lock').addEventListener('click', unlockPhone);

    document.querySelectorAll('[data-open]').forEach((el) => {
      el.addEventListener('click', () => openApp(el.dataset.open));
    });

    document.querySelectorAll('[data-back]').forEach((el) => {
      el.addEventListener('click', () => {
        const target = el.dataset.back;
        if (target === 'home') { showScreen('screen-home'); renderHome(); }
        else if (target === 'whatsapp') { showScreen('app-whatsapp'); renderWaList(); }
      });
    });

    $id('wa-send-btn').addEventListener('click', sendManualMessage);
    $id('wa-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendManualMessage(); });

    $id('call-accept-btn').addEventListener('click', acceptCall);
    $id('call-decline-btn').addEventListener('click', declineCall);
    $id('call-hangup-btn').addEventListener('click', hangupCall);
    $id('btn-mute').addEventListener('click', (e) => e.currentTarget.classList.toggle('on'));
    $id('btn-speaker').addEventListener('click', (e) => e.currentTarget.classList.toggle('on'));

    $id('open-director-from-settings').addEventListener('click', () => window.PPMain.enterDirectorMode());

    $id('viewer-close').addEventListener('click', () => { showScreen('app-photos'); renderPhotos(); });
    $id('viewer-prev').addEventListener('click', () => {
      const project = PP.currentProject();
      photoViewerIndex = (photoViewerIndex - 1 + project.media.length) % project.media.length;
      showMediaAt(photoViewerIndex);
    });
    $id('viewer-next').addEventListener('click', () => {
      const project = PP.currentProject();
      photoViewerIndex = (photoViewerIndex + 1) % project.media.length;
      showMediaAt(photoViewerIndex);
    });

    setupPhoneTabs();
  }

  function init() {
    bindNav();
    renderLock();
    startClock();
  }

  return {
    init, showScreen, renderLock, renderHome, renderWaList, openChat, renderChatMessages,
    renderPhoneRecents, renderContacts, renderPhotos, showBanner, triggerIncomingCall,
    acceptCall, declineCall, hangupCall, toast, applyWallpapers, updateStatusBars,
    get activeScreen() { return activeScreen; }
  };
})();
