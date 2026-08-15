/* ============================================================
   MAIN — arranque de la aplicación
   ============================================================ */

const PPMain = (function () {

  let deferredInstallPrompt = null;

  function enterDirectorMode() {
    PP.setMode('director');
    PPUI.showScreen('app-director');
    PPDirector.renderPanel();
  }

  function exitDirectorMode() {
    PP.setMode('prop');
    PPUI.showScreen('screen-lock');
    PPUI.renderLock();
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch((e) => console.error('SW error', e));
      });
    }
  }

  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (!localStorage.getItem('propphone_install_dismissed')) {
        document.getElementById('install-banner').classList.remove('hidden');
      }
    });
    document.getElementById('install-btn').addEventListener('click', async () => {
      document.getElementById('install-banner').classList.add('hidden');
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
      }
    });
    document.getElementById('install-close').addEventListener('click', () => {
      document.getElementById('install-banner').classList.add('hidden');
      localStorage.setItem('propphone_install_dismissed', '1');
    });

    // iOS Safari doesn't support beforeinstallprompt: show a manual hint once
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone && !localStorage.getItem('propphone_install_dismissed')) {
      setTimeout(() => {
        PPUI.toast('📲 En Safari: Compartir → Añadir a pantalla de inicio');
      }, 1500);
    }
  }

  function preventPullToRefresh() {
    document.body.addEventListener('touchmove', (e) => {
      if (e.scale && e.scale !== 1) e.preventDefault();
    }, { passive: false });
  }

  function init() {
    PP.load();
    PPSync.init();
    PPSync.autoReconnect();
    PPUI.init();
    preventPullToRefresh();
    registerServiceWorker();
    setupInstallPrompt();

    const mode = PP.getMode();
    if (mode === 'director') {
      PPUI.showScreen('app-director');
      PPDirector.init();
    } else {
      PPDirector.init(); // pre-bind so it's ready if user enters later
      PPUI.showScreen('screen-lock');
    }

    PPSync.on((msg) => {
      if (msg.type === 'data-changed') {
        // A change came from another tab (e.g. Director tab). Re-render whatever is visible.
        const s = PPUI.activeScreen;
        if (s === 'screen-lock') PPUI.renderLock();
        else if (s === 'screen-home') PPUI.renderHome();
        else if (s === 'app-whatsapp') PPUI.renderWaList();
        else if (s === 'app-wa-chat') PPUI.renderChatMessages();
        else if (s === 'app-phone') { PPUI.renderPhoneRecents(); PPUI.renderContacts(); }
        else if (s === 'app-photos') PPUI.renderPhotos();
        if (PP.getMode() === 'director') PPDirector.renderPanel();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { enterDirectorMode, exitDirectorMode };
})();
