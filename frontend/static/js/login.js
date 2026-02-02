async function loadBrand(){
  // 1) desde backend (.env)
  try{
    const r = await fetch('/api/config', {cache:'no-store'});
    if(r.ok){
      const c = await r.json();
      if(c.appTitle) document.getElementById('appTitle').textContent = c.appTitle;
      if(c.appSubtitle) document.getElementById('appSubtitle').textContent = c.appSubtitle;
      return;
    }
  }catch(_){}

  // 2) fallback a archivo editable
  try{
    const r = await fetch('/app-config.json', {cache:'no-store'});
    if(!r.ok) return;
    const c = await r.json();
    if(c.appTitle) document.getElementById('appTitle').textContent = c.appTitle;
    if(c.appSubtitle) document.getElementById('appSubtitle').textContent = c.appSubtitle;
  }catch(_){}
}

function setMsg(t, kind){
  const el = document.getElementById('msg');
  el.textContent = t || '';
  el.className = 'msg ' + (kind || '');
}

function initEye(){
  const btn = document.getElementById('btnEye');
  const input = document.getElementById('password');
  if(!btn || !input) return;

  btn.addEventListener('click', () => {
    input.type = (input.type === 'password') ? 'text' : 'password';
  });
}

function initLang(){
  // Placeholder: si más adelante querés i18n real, lo montamos acá.
  const btn = document.getElementById('btnLang');
  if(btn) btn.addEventListener('click', () => {
    setMsg('Idioma: ES (pendiente de implementar selector real).', 'ok');
    setTimeout(()=> setMsg('', ''), 1800);
  });
}

document.getElementById('loginForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  setMsg('', '');

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('btnLogin');
  btn.disabled = true;

  try{
    const payload = { username, password };
    const r = await fetch('/api/auth/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });

    const data = await r.json().catch(()=> ({}));
    if(!r.ok){
      setMsg(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail || data), 'err');
      return;
    }

    localStorage.setItem('app_token', data.token);
    localStorage.setItem('app_user', data.username);

    setMsg('Login OK. Redirigiendo…', 'ok');
    // Próximo paso: redirigir a la página principal real
    window.location.replace("/home.html");
  }catch(e){
    setMsg('Error de red: ' + e, 'err');
  }finally{
    btn.disabled = false;
  }
});

if (window.__theme && typeof window.__theme.init === "function") {
  window.__theme.init();
}
loadBrand();
initEye();
initLang();
