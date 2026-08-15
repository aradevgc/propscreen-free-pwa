/* ============================================================
   DIRECTOR — Modo Director / Control del rodaje
   ============================================================ */

const PPDirector = (function () {

  const TABS = [
    { id: 'control', label: '🎬 Control' },
    { id: 'phone', label: '📱 Teléfono' },
    { id: 'contacts', label: '👤 Contactos' },
    { id: 'whatsapp', label: '💬 WhatsApp' },
    { id: 'calls', label: '📞 Llamadas' },
    { id: 'notifications', label: '🔔 Notificaciones' },
    { id: 'sequence', label: '⏱ Secuencia' },
    { id: 'media', label: '🖼 Fotos/Vídeos' },
    { id: 'projects', label: '🎞 Proyectos' },
    { id: 'sync', label: '📡 Sincronización' }
  ];

  let activeTab = 'control';
  let seqTickTimer = null;

  function $id(id) { return document.getElementById(id); }
  function esc(s) { return s == null ? '' : String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function init() {
    renderTabs();
    renderPanel();
    $id('dir-to-prop').addEventListener('click', () => window.PPMain.exitDirectorMode());
    PPSequencer.onChange(() => { if (activeTab === 'control' || activeTab === 'sequence') renderPanel(); });
  }

  function renderTabs() {
    const bar = $id('dir-tabs');
    bar.innerHTML = TABS.map((t) => `<button class="dir-tab ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('');
    bar.querySelectorAll('.dir-tab').forEach((b) => {
      b.addEventListener('click', () => { activeTab = b.dataset.tab; renderTabs(); renderPanel(); });
    });
  }

  function renderPanel() {
    const body = $id('dir-body');
    if (activeTab === 'control') body.innerHTML = controlHtml();
    else if (activeTab === 'phone') body.innerHTML = phoneHtml();
    else if (activeTab === 'contacts') body.innerHTML = contactsHtml();
    else if (activeTab === 'whatsapp') body.innerHTML = whatsappHtml();
    else if (activeTab === 'calls') body.innerHTML = callsHtml();
    else if (activeTab === 'notifications') body.innerHTML = notificationsHtml();
    else if (activeTab === 'sequence') body.innerHTML = sequenceHtml();
    else if (activeTab === 'media') body.innerHTML = mediaHtml();
    else if (activeTab === 'projects') body.innerHTML = projectsHtml();
    else if (activeTab === 'sync') body.innerHTML = syncHtml();
    bindPanelEvents();
  }

  function save() { PP.save(); }

  /* ============ CONTROL TAB (botones grandes) ============ */
  function controlHtml() {
    const status = PPSequencer.getStatus();
    const evs = (PP.currentProject().sequence.events) || [];
    const stateLabel = { idle: 'Detenida', running: 'Reproduciendo…', paused: 'Pausada', finished: 'Finalizada' }[status.state];
    return `
      <div class="dir-seq-status">
        <div class="lbl">Estado de la secuencia</div>
        <div class="val">${stateLabel} — evento ${Math.min(status.currentIndex + 1, status.total)}/${status.total}</div>
      </div>
      <div class="dir-big-controls">
        <div class="dir-big-btn primary" id="cbtn-start"><div class="bi">▶</div>INICIAR</div>
        <div class="dir-big-btn" id="cbtn-pause"><div class="bi">⏸</div>PAUSAR</div>
        <div class="dir-big-btn" id="cbtn-next"><div class="bi">⏭</div>SIGUIENTE EVENTO</div>
        <div class="dir-big-btn" id="cbtn-reset"><div class="bi">↻</div>REINICIAR</div>
        <div class="dir-big-btn alert wide" id="cbtn-call"><div class="bi">📞</div>LLAMADA AHORA</div>
        <div class="dir-big-btn" id="cbtn-msg"><div class="bi">💬</div>MENSAJE AHORA</div>
        <div class="dir-big-btn" id="cbtn-notif"><div class="bi">🔔</div>NOTIFICACIÓN AHORA</div>
      </div>
      <div class="dir-section-title">Próximos eventos</div>
      <div style="padding:0 16px 24px 16px">
        ${evs.length === 0 ? '<div class="dir-empty">No hay eventos programados. Ve a la pestaña Secuencia.</div>' :
        evs.map((ev, i) => eventRowHtml(ev, i, status)).join('')}
      </div>
    `;
  }

  function eventRowHtml(ev, i, status) {
    const done = i < status.currentIndex;
    const current = i === status.currentIndex && status.state !== 'idle';
    const icon = ev.type === 'message' ? '💬' : ev.type === 'call' ? '📞' : ev.type === 'notification' ? '🔔' : '📱';
    const project = PP.currentProject();
    let sub = '';
    if (ev.type === 'message') { const c = project.contacts.find((x) => x.id === ev.payload.contactId); sub = `${c ? c.name : '?'}: "${ev.payload.text}"`; }
    else if (ev.type === 'call') { const c = project.contacts.find((x) => x.id === ev.payload.contactId); sub = `Llamada de ${c ? c.name : '?'}`; }
    else if (ev.type === 'notification') { sub = `${ev.payload.app}: ${ev.payload.title}`; }
    return `<div class="dir-event-row ${current ? 'current' : ''} ${done ? 'done' : ''}">
      <div class="dir-event-badge">${icon}</div>
      <div class="dir-event-main">
        <div class="dir-event-title">+${ev.delay}s — ${sub}</div>
        <div class="dir-event-sub">${done ? 'Ejecutado' : current ? 'En curso' : 'Pendiente'}</div>
      </div>
      <button class="dir-icon-btn" data-run-event="${i}">▶</button>
    </div>`;
  }

  /* ============ PHONE TAB ============ */
  function phoneHtml() {
    const p = PP.currentProject().phone;
    return `
      <div class="dir-panel active">
        <div class="dir-section-title">Reloj y estado</div>
        <div class="dir-card">
          <div class="dir-field"><label>Usar hora real del dispositivo</label><div class="dir-switch ${p.useLiveTime !== false ? 'on' : ''}" data-toggle="phone.useLiveTime"></div></div>
          <div class="dir-field"><label>Hora manual</label><input type="text" data-field="phone.manualTime" value="${esc(p.manualTime || '')}" placeholder="09:41"></div>
          <div class="dir-field"><label>Fecha manual (vacío = hoy)</label><input type="text" data-field="phone.manualDate" value="${esc(p.manualDate || '')}" placeholder="lunes, 1 de enero"></div>
          <div class="dir-field"><label>Batería (%)</label><input type="number" min="0" max="100" data-field="phone.battery" value="${p.battery}"></div>
          <div class="dir-field"><label>Wi-Fi activado</label><div class="dir-switch ${p.wifiOn ? 'on' : ''}" data-toggle="phone.wifiOn"></div></div>
          <div class="dir-field"><label>Barras de señal (0-4)</label><input type="number" min="0" max="4" data-field="phone.signalBars" value="${p.signalBars}"></div>
          <div class="dir-field"><label>Operador</label><input type="text" data-field="phone.operatorName" value="${esc(p.operatorName || '')}"></div>
          <div class="dir-field"><label>Nombre del teléfono</label><input type="text" data-field="phone.phoneName" value="${esc(p.phoneName || '')}"></div>
        </div>
        <div class="dir-section-title">Fondos de pantalla</div>
        <div class="dir-card">
          <div class="dir-field"><label>Color 1 (degradado)</label><input type="color" data-field="phone.wallpaperColor1" value="${p.wallpaperColor1 || '#1a2a3a'}"></div>
          <div class="dir-field"><label>Color 2 (degradado)</label><input type="color" data-field="phone.wallpaperColor2" value="${p.wallpaperColor2 || '#0a0f1a'}"></div>
          <div class="dir-field"><label>Foto pantalla bloqueo</label><input type="file" accept="image/*" id="wallpaper-lock-file"></div>
          <div class="dir-field"><label>Foto pantalla inicio</label><input type="file" accept="image/*" id="wallpaper-home-file"></div>
        </div>
        <div class="dir-mini-note">Estos valores controlan lo que ve el actor en la pantalla de bloqueo e inicio: hora, batería, wifi, señal y fondo.</div>
      </div>`;
  }

  /* ============ CONTACTS TAB ============ */
  function contactsHtml() {
    const contacts = PP.currentProject().contacts;
    return `<div class="dir-panel active">
      <div class="dir-section-title">Contactos (${contacts.length})</div>
      <div class="dir-card">
        ${contacts.length === 0 ? '<div class="dir-empty">Sin contactos todavía.</div>' :
        contacts.map((c) => `<div class="dir-list-item">
          <div class="avatar" style="${c.photo ? `background-image:url(${c.photo})` : ''}">${c.photo ? '' : (c.name || '?').slice(0, 1).toUpperCase()}</div>
          <div class="dir-list-main"><div class="dir-list-title">${esc(c.name)} ${esc(c.lastName || '')}</div><div class="dir-list-sub">${esc(c.number || '')}</div></div>
          <div class="dir-list-actions">
            <button class="dir-icon-btn" data-edit-contact="${c.id}">✏️</button>
            <button class="dir-icon-btn danger" data-del-contact="${c.id}">🗑</button>
          </div>
        </div>`).join('')}
      </div>
      <button class="dir-btn block" id="add-contact-btn">➕ Nuevo contacto</button>
    </div>`;
  }

  function contactModal(contactId) {
    const project = PP.currentProject();
    const c = contactId ? project.contacts.find((x) => x.id === contactId) : { name: '', lastName: '', number: '', status: '', photo: '' };
    openModal(`
      <h3>${contactId ? 'Editar contacto' : 'Nuevo contacto'}</h3>
      <div class="dir-card">
        <div class="dir-field"><label>Nombre</label><input type="text" id="m-name" value="${esc(c.name)}"></div>
        <div class="dir-field"><label>Apellido</label><input type="text" id="m-lastname" value="${esc(c.lastName || '')}"></div>
        <div class="dir-field"><label>Número</label><input type="text" id="m-number" value="${esc(c.number || '')}"></div>
        <div class="dir-field"><label>Estado (WhatsApp)</label><input type="text" id="m-status" value="${esc(c.status || '')}" placeholder="en línea"></div>
        <div class="dir-field"><label>Foto</label><input type="file" accept="image/*" id="m-photo-file"></div>
      </div>
      <div class="dir-modal-actions">
        <button class="dir-btn secondary" id="modal-cancel">Cancelar</button>
        <button class="dir-btn" id="modal-save">Guardar</button>
      </div>
    `);
    let photoData = c.photo || '';
    $id('m-photo-file').addEventListener('change', (e) => readFileAsDataUrl(e.target.files[0], (url) => { photoData = url; }));
    $id('modal-cancel').addEventListener('click', closeModal);
    $id('modal-save').addEventListener('click', () => {
      const name = $id('m-name').value.trim();
      if (!name) { PPUI.toast('El nombre es obligatorio'); return; }
      const data = { name, lastName: $id('m-lastname').value.trim(), number: $id('m-number').value.trim(), status: $id('m-status').value.trim(), photo: photoData };
      if (contactId) { Object.assign(c, data); }
      else { project.contacts.push({ id: PP.uid('c'), ...data }); }
      save(); closeModal(); renderPanel();
    });
  }

  /* ============ WHATSAPP TAB ============ */
  function whatsappHtml() {
    const project = PP.currentProject();
    const entries = Object.entries(project.chats || {});
    return `<div class="dir-panel active">
      <div class="dir-section-title">Conversaciones</div>
      <div class="dir-card">
        ${entries.length === 0 ? '<div class="dir-empty">No hay conversaciones.</div>' :
        entries.map(([cid, chat]) => {
          const contact = project.contacts.find((c) => c.id === cid);
          return `<div class="dir-list-item">
            <div class="avatar" style="${contact && contact.photo ? `background-image:url(${contact.photo})` : ''}">${contact && !contact.photo ? (contact.name || '?').slice(0, 1).toUpperCase() : ''}</div>
            <div class="dir-list-main"><div class="dir-list-title">${esc(contact ? contact.name : '(contacto eliminado)')}</div><div class="dir-list-sub">${chat.messages.length} mensajes ${chat.pinned ? '· 📌 fijado' : ''}</div></div>
            <div class="dir-list-actions">
              <button class="dir-icon-btn" data-edit-chat="${cid}">✏️</button>
              <button class="dir-icon-btn danger" data-del-chat="${cid}">🗑</button>
            </div>
          </div>`;
        }).join('')}
      </div>
      <button class="dir-btn block" id="add-chat-btn">➕ Nueva conversación</button>
      ${project.contacts.length === 0 ? '<div class="dir-mini-note">Primero crea un contacto en la pestaña Contactos.</div>' : ''}
    </div>`;
  }

  function chatModal(contactId) {
    const project = PP.currentProject();
    if (project.contacts.length === 0) { PPUI.toast('Crea primero un contacto'); return; }
    const chat = project.chats[contactId] || { pinned: false, messages: [] };
    const options = project.contacts.map((c) => `<option value="${c.id}" ${c.id === contactId ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
    openModal(`
      <h3>${contactId ? 'Editar conversación' : 'Nueva conversación'}</h3>
      <div class="dir-card">
        <div class="dir-field"><label>Contacto</label><select id="m-contact" ${contactId ? 'disabled' : ''}>${options}</select></div>
        <div class="dir-field"><label>Fijar conversación</label><div class="dir-switch ${chat.pinned ? 'on' : ''}" id="m-pinned"></div></div>
      </div>
      <div class="dir-section-title">Mensajes</div>
      <div class="dir-card" id="m-messages-list"></div>
      <div class="dir-card">
        <div class="dir-field"><label>Texto</label><input type="text" id="m-msg-text" placeholder="Escribe el mensaje..."></div>
        <div class="dir-field"><label>Hora</label><input type="text" id="m-msg-time" value="${nowTime()}" placeholder="10:32"></div>
        <div class="dir-field"><label>Enviado por el contacto (recibido)</label><div class="dir-switch on" id="m-msg-fromthem"></div></div>
        <div class="dir-field"><label>Ticks (si es mío)</label>
          <select id="m-msg-ticks"><option value="0">✓ enviado</option><option value="1">✓✓ entregado</option><option value="2">✓✓ leído (azul)</option></select>
        </div>
        <button class="dir-btn block" id="m-add-msg">➕ Añadir mensaje</button>
      </div>
      <div class="dir-modal-actions">
        <button class="dir-btn secondary" id="modal-cancel">Cerrar</button>
        <button class="dir-btn" id="modal-save">Guardar conversación</button>
      </div>
    `);

    let workingMessages = JSON.parse(JSON.stringify(chat.messages));
    function renderMsgList() {
      $id('m-messages-list').innerHTML = workingMessages.length === 0 ? '<div class="dir-empty">Sin mensajes.</div>' :
        workingMessages.map((m, i) => `<div class="dir-list-item">
          <div class="dir-list-main"><div class="dir-list-title">${m.fromMe ? '➡️' : '⬅️'} ${esc(m.text || '(media)')}</div><div class="dir-list-sub">${esc(m.time)} ${m.fromMe ? '· ticks ' + m.ticks : ''}</div></div>
          <button class="dir-icon-btn danger" data-del-msg="${i}">🗑</button>
        </div>`).join('');
      $id('m-messages-list').querySelectorAll('[data-del-msg]').forEach((b) => {
        b.addEventListener('click', () => { workingMessages.splice(parseInt(b.dataset.delMsg, 10), 1); renderMsgList(); });
      });
    }
    renderMsgList();

    $id('m-pinned').addEventListener('click', (e) => e.currentTarget.classList.toggle('on'));
    $id('m-msg-fromthem').addEventListener('click', (e) => e.currentTarget.classList.toggle('on'));

    $id('m-add-msg').addEventListener('click', () => {
      const text = $id('m-msg-text').value.trim();
      if (!text) return;
      const fromThem = $id('m-msg-fromthem').classList.contains('on');
      workingMessages.push({
        id: PP.uid('m'), text, time: $id('m-msg-time').value.trim() || nowTime(),
        fromMe: !fromThem, ticks: parseInt($id('m-msg-ticks').value, 10), date: 'Hoy'
      });
      $id('m-msg-text').value = '';
      renderMsgList();
    });

    $id('modal-cancel').addEventListener('click', closeModal);
    $id('modal-save').addEventListener('click', () => {
      const cid = contactId || $id('m-contact').value;
      project.chats[cid] = { pinned: $id('m-pinned').classList.contains('on'), messages: workingMessages };
      save(); closeModal(); renderPanel();
    });
  }

  function nowTime() { const d = new Date(); return PP.pad(d.getHours()) + ':' + PP.pad(d.getMinutes()); }

  /* ============ CALLS TAB ============ */
  function callsHtml() {
    const project = PP.currentProject();
    return `<div class="dir-panel active">
      <div class="dir-section-title">Lanzar llamada entrante ahora</div>
      <div class="dir-card">
        <div class="dir-field"><label>Contacto</label>
          <select id="call-now-contact">${project.contacts.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
        </div>
        <button class="dir-btn block" id="call-now-btn" ${project.contacts.length === 0 ? 'disabled' : ''}>📞 Iniciar llamada entrante</button>
      </div>
      <div class="dir-section-title">Registro de llamadas</div>
      <div class="dir-card">
        ${(project.callLog || []).length === 0 ? '<div class="dir-empty">Sin llamadas registradas.</div>' :
        project.callLog.slice().reverse().map((c) => {
          const contact = project.contacts.find((x) => x.id === c.contactId);
          return `<div class="dir-list-item"><div class="dir-list-main"><div class="dir-list-title">${esc(contact ? contact.name : '?')}</div><div class="dir-list-sub">${c.direction} ${c.missed ? '· perdida' : ''} · ${esc(c.time)}</div></div></div>`;
        }).join('')}
      </div>
      <button class="dir-btn secondary block" id="clear-call-log">Vaciar registro</button>
    </div>`;
  }

  /* ============ NOTIFICATIONS TAB ============ */
  function notificationsHtml() {
    return `<div class="dir-panel active">
      <div class="dir-section-title">Enviar notificación ahora</div>
      <div class="dir-card">
        <div class="dir-field"><label>App</label>
          <select id="notif-app"><option>WhatsApp</option><option>Sistema</option><option>Mensajes</option><option>Batería</option><option>Recordatorio</option></select>
        </div>
        <div class="dir-field"><label>Título</label><input type="text" id="notif-title" placeholder="Marta"></div>
        <div class="dir-field"><label>Texto</label><input type="text" id="notif-text" placeholder="¿Dónde estás?"></div>
        <button class="dir-btn block" id="notif-send-btn">🔔 Enviar ahora</button>
      </div>
      <div class="dir-mini-note">Esta notificación aparece de inmediato en el teléfono prop, tanto si está en pantalla de bloqueo como dentro de una app.</div>
    </div>`;
  }

  /* ============ SEQUENCE TAB ============ */
  function sequenceHtml() {
    const project = PP.currentProject();
    const evs = project.sequence.events || [];
    return `<div class="dir-panel active">
      <div class="dir-section-title">Línea temporal de eventos</div>
      <div class="dir-mini-note">Cada evento se ejecuta a los "+X segundos" del evento anterior (o del inicio, para el primero).</div>
      <div class="dir-card">
        ${evs.length === 0 ? '<div class="dir-empty">Sin eventos. Añade el primero abajo.</div>' :
        evs.map((ev, i) => {
          const c = project.contacts.find((x) => x.id === (ev.payload && ev.payload.contactId));
          let sub = ev.type === 'notification' ? `${ev.payload.app}: ${ev.payload.title}` : (c ? c.name : '');
          return `<div class="dir-list-item">
            <div class="dir-event-badge">${ev.type === 'message' ? '💬' : ev.type === 'call' ? '📞' : '🔔'}</div>
            <div class="dir-list-main"><div class="dir-list-title">+${ev.delay}s · ${ev.type}</div><div class="dir-list-sub">${esc(sub)}${ev.payload.text ? ': ' + esc(ev.payload.text) : ''}</div></div>
            <div class="dir-list-actions">
              <button class="dir-icon-btn" data-move-up="${i}">↑</button>
              <button class="dir-icon-btn" data-move-down="${i}">↓</button>
              <button class="dir-icon-btn danger" data-del-event="${i}">🗑</button>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="dir-section-title">Añadir evento</div>
      <div class="dir-card">
        <div class="dir-field"><label>Tipo</label>
          <select id="ev-type">
            <option value="message">Mensaje WhatsApp</option>
            <option value="call">Llamada entrante</option>
            <option value="notification">Notificación</option>
          </select>
        </div>
        <div class="dir-field"><label>Retraso (segundos)</label><input type="number" min="0" id="ev-delay" value="5"></div>
        <div id="ev-extra-fields"></div>
        <button class="dir-btn block" id="ev-add-btn">➕ Añadir a la secuencia</button>
      </div>
    </div>`;
  }

  function renderEventExtraFields() {
    const type = $id('ev-type').value;
    const project = PP.currentProject();
    const contactOptions = project.contacts.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    const box = $id('ev-extra-fields');
    if (type === 'message') {
      box.innerHTML = `
        <div class="dir-field"><label>Contacto</label><select id="ev-contact">${contactOptions || '<option value="">(sin contactos)</option>'}</select></div>
        <div class="dir-field"><label>Texto</label><input type="text" id="ev-text" placeholder="¿Dónde estás?"></div>`;
    } else if (type === 'call') {
      box.innerHTML = `<div class="dir-field"><label>Contacto</label><select id="ev-contact">${contactOptions || '<option value="">(sin contactos)</option>'}</select></div>`;
    } else if (type === 'notification') {
      box.innerHTML = `
        <div class="dir-field"><label>App</label><select id="ev-app"><option>WhatsApp</option><option>Sistema</option><option>Mensajes</option><option>Batería</option><option>Recordatorio</option></select></div>
        <div class="dir-field"><label>Título</label><input type="text" id="ev-title"></div>
        <div class="dir-field"><label>Texto</label><input type="text" id="ev-text"></div>`;
    }
  }

  /* ============ MEDIA TAB ============ */
  function mediaHtml() {
    const media = PP.currentProject().media || [];
    return `<div class="dir-panel active">
      <div class="dir-section-title">Fotos y vídeos disponibles en el prop</div>
      <div class="dir-mini-note">Se guardan localmente en el dispositivo (localStorage). Evita vídeos muy pesados: el almacenamiento del navegador tiene límite (unos 5-10 MB en total).</div>
      <div class="dir-card">
        <div class="dir-field"><label>Añadir foto</label><input type="file" accept="image/*" id="add-photo-file"></div>
        <div class="dir-field"><label>Añadir vídeo</label><input type="file" accept="video/*" id="add-video-file"></div>
      </div>
      <div class="thumb-picker" style="flex-wrap:wrap;padding:8px 0;">
        ${media.map((m, i) => `<div style="position:relative"><img src="${m.type === 'video' ? (m.thumb || '') : m.url}" style="${m.type === 'video' && !m.thumb ? 'background:#333' : ''}"><button data-del-media="${i}" style="position:absolute;top:-6px;right:-6px;background:#ff453a;color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:11px;">✕</button></div>`).join('')}
      </div>
    </div>`;
  }

  /* ============ PROJECTS TAB ============ */
  function projectsHtml() {
    const projects = PP.allProjects();
    const current = PP.currentProject();
    return `<div class="dir-panel active">
      <div class="dir-section-title">Proyectos guardados</div>
      ${projects.map((p) => `<div class="dir-project-row ${p.id === current.id ? 'current' : ''}">
        <div class="dir-list-main">
          <div class="dir-list-title">${p.id === current.id ? '✅ ' : ''}${esc(p.name)}</div>
          <div class="dir-list-sub">${(p.contacts || []).length} contactos · ${Object.keys(p.chats || {}).length} chats · ${(p.sequence.events || []).length} eventos</div>
        </div>
        <div class="dir-list-actions">
          <button class="dir-icon-btn" data-select-project="${p.id}">📂</button>
          <button class="dir-icon-btn" data-rename-project="${p.id}">✏️</button>
          <button class="dir-icon-btn" data-dup-project="${p.id}">⧉</button>
          <button class="dir-icon-btn danger" data-del-project="${p.id}">🗑</button>
        </div>
      </div>`).join('')}
      <button class="dir-btn block" id="new-project-btn">➕ Nuevo proyecto (escena)</button>
      <div class="dir-mini-note">Cada proyecto guarda su propia configuración de teléfono, contactos, conversaciones, llamadas y secuencia. Ideal para tener un proyecto por escena: "ESCENA 24", "ESCENA 36"…</div>
    </div>`;
  }

  /* ============ SYNC TAB ============ */
  function syncHtml() {
    const status = PPSync.remoteStatus();
    const savedUrl = localStorage.getItem('propphone_remote_url') || '';
    return `<div class="dir-panel active">
      <div class="dir-section-title">Mismo dispositivo</div>
      <div class="dir-mini-note">
        La secuencia de eventos se reproduce dentro del propio teléfono prop, así que <b>funciona offline sin ningún otro dispositivo</b>: configura todo aquí, pulsa Control → Iniciar, y entrega el teléfono al actor.
      </div>
      <div class="dir-section-title">Dos pestañas del mismo navegador</div>
      <div class="dir-mini-note">Si abres esta misma app en otra pestaña o ventana (por ejemplo un iPad en Split View), ambas se sincronizan automáticamente en tiempo real vía BroadcastChannel — no necesitas configurar nada.</div>
      <div class="dir-section-title">Dos dispositivos distintos en la misma Wi-Fi (opcional)</div>
      <div class="dir-mini-note">Esto requiere un pequeño servidor "relay" en la misma red local (por ejemplo, ejecutado en el portátil del director). Introduce su dirección WebSocket para conectar ambos dispositivos:</div>
      <div class="dir-card">
        <div class="dir-field"><label>Estado</label><span>${status === 'connected' ? '🟢 Conectado' : status === 'connecting' ? '🟡 Conectando…' : '⚪ Sin conectar'}</span></div>
        <div class="dir-field"><label>URL (ws://IP:PUERTO)</label><input type="text" id="sync-url" value="${esc(savedUrl)}" placeholder="ws://192.168.1.20:8787"></div>
        <div class="dir-row-actions">
          <button class="dir-btn" id="sync-connect-btn">Conectar</button>
          <button class="dir-btn secondary" id="sync-disconnect-btn">Desconectar</button>
        </div>
      </div>
      <div class="dir-mini-note">Sin este relay, la app sigue funcionando entera en modo autónomo: es sólo un extra para control remoto real entre dos iPhones distintos.</div>
    </div>`;
  }

  /* ============ Modal helper ============ */
  function openModal(html) {
    let bg = $id('generic-modal-bg');
    if (!bg) {
      bg = document.createElement('div');
      bg.id = 'generic-modal-bg';
      bg.className = 'dir-modal-bg';
      document.body.appendChild(bg);
    }
    bg.innerHTML = `<div class="dir-modal">${html}</div>`;
    bg.classList.remove('hidden');
    bg.style.display = 'flex';
  }
  function closeModal() {
    const bg = $id('generic-modal-bg');
    if (bg) { bg.style.display = 'none'; bg.innerHTML = ''; }
  }

  function readFileAsDataUrl(file, cb) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => cb(reader.result);
    reader.readAsDataURL(file);
  }

  /* ============ Event binding per render ============ */
  function bindPanelEvents() {
    const project = PP.currentProject();

    // generic field binding
    document.querySelectorAll('[data-field]').forEach((el) => {
      el.addEventListener('input', () => {
        const path = el.dataset.field.split('.');
        let obj = project;
        for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
        let val = el.value;
        if (el.type === 'number') val = Number(val);
        obj[path[path.length - 1]] = val;
        save();
        PPUI.applyWallpapers(); PPUI.updateStatusBars();
      });
    });
    document.querySelectorAll('[data-toggle]').forEach((el) => {
      el.addEventListener('click', () => {
        const path = el.dataset.toggle.split('.');
        let obj = project;
        for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
        const key = path[path.length - 1];
        obj[key] = !obj[key];
        el.classList.toggle('on', !!obj[key]);
        save();
      });
    });

    // wallpapers
    const lockFile = $id('wallpaper-lock-file');
    if (lockFile) lockFile.addEventListener('change', (e) => readFileAsDataUrl(e.target.files[0], (url) => { project.phone.wallpaperLock = url; save(); PPUI.applyWallpapers(); }));
    const homeFile = $id('wallpaper-home-file');
    if (homeFile) homeFile.addEventListener('change', (e) => readFileAsDataUrl(e.target.files[0], (url) => { project.phone.wallpaperHome = url; save(); PPUI.applyWallpapers(); }));

    // contacts
    const addContactBtn = $id('add-contact-btn');
    if (addContactBtn) addContactBtn.addEventListener('click', () => contactModal(null));
    document.querySelectorAll('[data-edit-contact]').forEach((b) => b.addEventListener('click', () => contactModal(b.dataset.editContact)));
    document.querySelectorAll('[data-del-contact]').forEach((b) => b.addEventListener('click', () => {
      project.contacts = project.contacts.filter((c) => c.id !== b.dataset.delContact);
      delete project.chats[b.dataset.delContact];
      save(); renderPanel();
    }));

    // whatsapp
    const addChatBtn = $id('add-chat-btn');
    if (addChatBtn) addChatBtn.addEventListener('click', () => chatModal(null));
    document.querySelectorAll('[data-edit-chat]').forEach((b) => b.addEventListener('click', () => chatModal(b.dataset.editChat)));
    document.querySelectorAll('[data-del-chat]').forEach((b) => b.addEventListener('click', () => { delete project.chats[b.dataset.delChat]; save(); renderPanel(); }));

    // calls
    const callNowBtn = $id('call-now-btn');
    if (callNowBtn) callNowBtn.addEventListener('click', () => {
      const cid = $id('call-now-contact').value;
      PPUI.triggerIncomingCall(cid);
      PPSync.broadcastEvent('call', { contactId: cid });
      PPUI.toast('📞 Llamada lanzada');
    });
    const clearLog = $id('clear-call-log');
    if (clearLog) clearLog.addEventListener('click', () => { project.callLog = []; save(); renderPanel(); });

    // notifications
    const notifBtn = $id('notif-send-btn');
    if (notifBtn) notifBtn.addEventListener('click', () => {
      const payload = { app: $id('notif-app').value, title: $id('notif-title').value.trim(), text: $id('notif-text').value.trim() };
      if (!payload.title && !payload.text) { PPUI.toast('Escribe título o texto'); return; }
      PPUI.showBanner(payload);
      PPSync.broadcastEvent('notification', payload);
      PPUI.toast('🔔 Notificación enviada');
    });

    // sequence
    const evType = $id('ev-type');
    if (evType) { renderEventExtraFields(); evType.addEventListener('change', renderEventExtraFields); }
    const evAddBtn = $id('ev-add-btn');
    if (evAddBtn) evAddBtn.addEventListener('click', () => {
      const type = $id('ev-type').value;
      const delay = parseInt($id('ev-delay').value, 10) || 0;
      let payload = {};
      if (type === 'message') { payload = { contactId: $id('ev-contact').value, text: $id('ev-text').value.trim() }; if (!payload.contactId || !payload.text) { PPUI.toast('Faltan datos'); return; } }
      else if (type === 'call') { payload = { contactId: $id('ev-contact').value }; if (!payload.contactId) { PPUI.toast('Elige un contacto'); return; } }
      else if (type === 'notification') { payload = { app: $id('ev-app').value, title: $id('ev-title').value.trim(), text: $id('ev-text').value.trim() }; }
      project.sequence.events.push({ id: PP.uid('ev'), type, delay, payload });
      save(); renderPanel();
    });
    document.querySelectorAll('[data-del-event]').forEach((b) => b.addEventListener('click', () => {
      project.sequence.events.splice(parseInt(b.dataset.delEvent, 10), 1); save(); renderPanel();
    }));
    document.querySelectorAll('[data-move-up]').forEach((b) => b.addEventListener('click', () => {
      const i = parseInt(b.dataset.moveUp, 10); if (i > 0) { const arr = project.sequence.events; [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; save(); renderPanel(); }
    }));
    document.querySelectorAll('[data-move-down]').forEach((b) => b.addEventListener('click', () => {
      const i = parseInt(b.dataset.moveDown, 10); const arr = project.sequence.events; if (i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; save(); renderPanel(); }
    }));
    document.querySelectorAll('[data-run-event]').forEach((b) => b.addEventListener('click', () => {
      const i = parseInt(b.dataset.runEvent, 10);
      PPSequencer.runManually(i);
      const ev = project.sequence.events[i];
      PPSync.broadcastEvent(ev.type, ev.payload);
      PPUI.toast('Evento ejecutado');
    }));

    // media
    const addPhoto = $id('add-photo-file');
    if (addPhoto) addPhoto.addEventListener('change', (e) => readFileAsDataUrl(e.target.files[0], (url) => {
      project.media.push({ id: PP.uid('media'), type: 'image', url }); save(); renderPanel();
    }));
    const addVideo = $id('add-video-file');
    if (addVideo) addVideo.addEventListener('change', (e) => readFileAsDataUrl(e.target.files[0], (url) => {
      project.media.push({ id: PP.uid('media'), type: 'video', url }); save(); renderPanel();
    }));
    document.querySelectorAll('[data-del-media]').forEach((b) => b.addEventListener('click', () => {
      project.media.splice(parseInt(b.dataset.delMedia, 10), 1); save(); renderPanel();
    }));

    // projects
    const newProjBtn = $id('new-project-btn');
    if (newProjBtn) newProjBtn.addEventListener('click', () => {
      const name = prompt('Nombre del nuevo proyecto (ej. "ESCENA 24")', 'Nueva escena');
      if (name) { PP.createProject(name); renderPanel(); PPUI.renderLock(); }
    });
    document.querySelectorAll('[data-select-project]').forEach((b) => b.addEventListener('click', () => {
      PP.setCurrentProject(b.dataset.selectProject); renderPanel(); PPUI.renderLock(); PPUI.toast('Proyecto cargado');
    }));
    document.querySelectorAll('[data-rename-project]').forEach((b) => b.addEventListener('click', () => {
      const p = PP.load().projects[b.dataset.renameProject];
      const name = prompt('Nuevo nombre', p.name);
      if (name) { p.name = name; save(); renderPanel(); }
    }));
    document.querySelectorAll('[data-dup-project]').forEach((b) => b.addEventListener('click', () => { PP.duplicateProject(b.dataset.dupProject); renderPanel(); }));
    document.querySelectorAll('[data-del-project]').forEach((b) => b.addEventListener('click', () => {
      if (confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) { PP.deleteProject(b.dataset.delProject); renderPanel(); PPUI.renderLock(); }
    }));

    // sync
    const connectBtn = $id('sync-connect-btn');
    if (connectBtn) connectBtn.addEventListener('click', () => {
      const url = $id('sync-url').value.trim();
      if (url) PPSync.connectRemote(url);
    });
    const disconnectBtn = $id('sync-disconnect-btn');
    if (disconnectBtn) disconnectBtn.addEventListener('click', () => { PPSync.disconnectRemote(); renderPanel(); });

    // control buttons
    const cStart = $id('cbtn-start');
    if (cStart) cStart.addEventListener('click', () => { PPSequencer.start(); PPSync.broadcastEvent('seq-start', {}); });
    const cPause = $id('cbtn-pause');
    if (cPause) cPause.addEventListener('click', () => { PPSequencer.pause(); PPSync.broadcastEvent('seq-pause', {}); });
    const cNext = $id('cbtn-next');
    if (cNext) cNext.addEventListener('click', () => { PPSequencer.skipToNext(); PPSync.broadcastEvent('seq-next', {}); });
    const cReset = $id('cbtn-reset');
    if (cReset) cReset.addEventListener('click', () => { PPSequencer.reset(); PPSync.broadcastEvent('seq-reset', {}); });
    const cCall = $id('cbtn-call');
    if (cCall) cCall.addEventListener('click', () => {
      if (project.contacts.length === 0) { PPUI.toast('Crea un contacto primero'); return; }
      const cid = project.contacts[0].id;
      PPUI.triggerIncomingCall(cid);
      PPSync.broadcastEvent('call', { contactId: cid });
    });
    const cMsg = $id('cbtn-msg');
    if (cMsg) cMsg.addEventListener('click', () => { activeTab = 'whatsapp'; renderTabs(); renderPanel(); });
    const cNotif = $id('cbtn-notif');
    if (cNotif) cNotif.addEventListener('click', () => { activeTab = 'notifications'; renderTabs(); renderPanel(); });
    document.querySelectorAll('[data-run-event]').forEach((b) => { /* already bound above */ });
  }

  return { init, renderPanel };
})();
