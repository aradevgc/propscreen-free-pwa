/* ============================================================
   STORAGE — modelo de datos y persistencia (localStorage)
   Todo el proyecto (contactos, chats, llamadas, secuencia...) vive
   en localStorage para que la PWA funcione 100% offline.
   ============================================================ */

const STORAGE_KEY = 'propphone_data_v1';
const MODE_KEY = 'propphone_mode';

const PP = (function () {

  function uid(prefix) {
    return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9);
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function demoProject() {
    const now = new Date();
    const t = (h, m) => `${pad(h)}:${pad(m)}`;
    const contactMarta = uid('c');
    return {
      id: uid('proj'),
      name: 'ESCENA DEMO',
      createdAt: Date.now(),
      phone: {
        wallpaperLock: '',
        wallpaperHome: '',
        wallpaperColor1: '#1a2a3a',
        wallpaperColor2: '#0a0f1a',
        useLiveTime: true,
        manualTime: t(9, 41),
        manualDate: '',
        battery: 87,
        wifiOn: true,
        wifiName: 'iPhone',
        signalBars: 3,
        operatorName: 'movistar',
        phoneName: 'iPhone de Actor',
        lockNotifCount: 0
      },
      contacts: [
        { id: contactMarta, name: 'Marta', lastName: '', photo: '', number: '+34 611 22 33 44', status: 'en línea' },
        { id: uid('c'), name: 'Trabajo', lastName: '', photo: '', number: '+34 900 111 222', status: 'última vez hoy a las 08:12' }
      ],
      chats: {
        [contactMarta]: {
          pinned: true,
          messages: [
            { id: uid('m'), text: '¿Dónde estás?', time: t(10, 31), fromMe: false, ticks: 0, date: 'Hoy' },
            { id: uid('m'), text: 'Estoy llegando.', time: t(10, 32), fromMe: true, ticks: 2, date: 'Hoy' },
            { id: uid('m'), text: 'Vale.', time: t(10, 33), fromMe: false, ticks: 0, date: 'Hoy' },
            { id: uid('m'), text: 'Date prisa.', time: t(10, 34), fromMe: false, ticks: 0, date: 'Hoy' }
          ]
        }
      },
      callLog: [
        { id: uid('call'), contactId: contactMarta, direction: 'incoming', duration: 0, missed: true, time: 'ayer' }
      ],
      media: [],
      sequence: {
        events: [
          { id: uid('ev'), delay: 2, type: 'message', payload: { contactId: contactMarta, text: '¿Sigues ahí?' } },
          { id: uid('ev'), delay: 5, type: 'notification', payload: { app: 'Sistema', title: 'Batería baja', text: '20% de batería restante' } },
          { id: uid('ev'), delay: 4, type: 'call', payload: { contactId: contactMarta } }
        ]
      }
    };
  }

  function defaultData() {
    const demo = demoProject();
    return {
      currentProjectId: demo.id,
      projects: { [demo.id]: demo }
    };
  }

  let _data = null;

  function load() {
    if (_data) return _data;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        _data = JSON.parse(raw);
      } else {
        _data = defaultData();
        save();
      }
    } catch (e) {
      console.error('Error cargando datos, restaurando por defecto', e);
      _data = defaultData();
      save();
    }
    return _data;
  }

  function save(broadcast) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_data));
    } catch (e) {
      console.error('Error guardando (¿localStorage lleno?)', e);
      if (window.PPUI) PPUI.toast('⚠️ Almacenamiento lleno. Elimina algunas fotos/vídeos.');
    }
    if (broadcast !== false && window.PPSync) PPSync.broadcastDataChanged();
  }

  function reloadFromDisk() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) _data = JSON.parse(raw);
    } catch (e) { console.error(e); }
    return _data;
  }

  function currentProject() {
    const d = load();
    return d.projects[d.currentProjectId];
  }

  function allProjects() {
    const d = load();
    return Object.values(d.projects).sort((a, b) => b.createdAt - a.createdAt);
  }

  function createProject(name) {
    const d = load();
    const p = demoProject();
    p.id = uid('proj');
    p.name = name || 'Nueva escena';
    p.createdAt = Date.now();
    // start empty-ish rather than full demo content for new projects
    p.contacts = [];
    p.chats = {};
    p.callLog = [];
    p.media = [];
    p.sequence = { events: [] };
    d.projects[p.id] = p;
    d.currentProjectId = p.id;
    save();
    return p;
  }

  function duplicateProject(id) {
    const d = load();
    const src = d.projects[id];
    if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = uid('proj');
    copy.name = src.name + ' (copia)';
    copy.createdAt = Date.now();
    d.projects[copy.id] = copy;
    save();
    return copy;
  }

  function deleteProject(id) {
    const d = load();
    delete d.projects[id];
    if (d.currentProjectId === id) {
      const remaining = Object.keys(d.projects);
      if (remaining.length === 0) {
        const demo = demoProject();
        d.projects[demo.id] = demo;
        d.currentProjectId = demo.id;
      } else {
        d.currentProjectId = remaining[0];
      }
    }
    save();
  }

  function setCurrentProject(id) {
    const d = load();
    if (d.projects[id]) {
      d.currentProjectId = id;
      save();
    }
  }

  function getMode() {
    return localStorage.getItem(MODE_KEY) || 'prop';
  }

  function setMode(mode) {
    localStorage.setItem(MODE_KEY, mode);
  }

  return {
    uid, pad, load, save, reloadFromDisk, currentProject, allProjects,
    createProject, duplicateProject, deleteProject, setCurrentProject,
    getMode, setMode, demoProject
  };
})();
