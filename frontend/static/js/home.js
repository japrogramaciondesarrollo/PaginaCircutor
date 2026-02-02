function iconSvg(name){
  const icons = {
    wrench: `
      <svg viewBox="0 0 24 24" width="42" height="42" fill="none" aria-hidden="true">
        <path d="M21 7a6 6 0 0 1-7.7 5.7l-6.6 6.6a2 2 0 0 1-2.8 0l-.6-.6a2 2 0 0 1 0-2.8l6.6-6.6A6 6 0 0 1 17 3l-3 3 4 4 3-3Z"
          stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
      </svg>`,
    receipt: `
      <svg viewBox="0 0 24 24" width="42" height="42" fill="none" aria-hidden="true">
        <path d="M7 2h10v20l-2-1-2 1-2-1-2 1-2-1-2 1V2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
        <path d="M9 6h6M9 10h6M9 14h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>`,
    gauge: `
      <svg viewBox="0 0 24 24" width="42" height="42" fill="none" aria-hidden="true">
        <path d="M20 13a8 8 0 1 1-16 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M12 13l4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M6 13h.01M18 13h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
      </svg>`,
    map: `
      <svg viewBox="0 0 24 24" width="42" height="42" fill="none" aria-hidden="true">
        <path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
        <path d="M9 3v15M15 6v15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>`,
    barChart: `
      <svg viewBox="0 0 24 24" width="42" height="42" fill="none" aria-hidden="true">
        <path d="M4 20V4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M4 20h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M8 20v-7M12 20v-11M16 20v-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>`,
    edit: `
      <svg viewBox="0 0 24 24" width="42" height="42" fill="none" aria-hidden="true">
        <path d="M12 20h9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"
          stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
      </svg>`
  };
  return icons[name] || icons.barChart;
}

function setBrand(title, subtitle){
  const t = document.getElementById('appTitle');
  const s = document.getElementById('appSubtitle');
  if(t && title) t.textContent = title;
  if(s && subtitle) s.textContent = subtitle;
}

async function loadBrand(){
  try{
    const r = await fetch('/api/config', {cache:'no-store'});
    if(r.ok){
      const c = await r.json();
      setBrand(c.appTitle, c.appSubtitle);
      return;
    }
  }catch(_){}
  try{
    const r = await fetch('/app-config.json', {cache:'no-store'});
    if(!r.ok) return;
    const c = await r.json();
    setBrand(c.appTitle, c.appSubtitle);
  }catch(_){}
}

function requireLogin(){
  const token = localStorage.getItem('app_token');
  if(!token){
    window.location.href = "/login.html";
    return null;
  }
  return token;
}

async function loadModules(){
  const r = await fetch('/modules-config.json', {cache:'no-store'});
  if(!r.ok) throw new Error('No se pudo leer modules-config.json');
  const data = await r.json();
  return data.modules || [];
}

function renderModules(modules){
  const host = document.getElementById('modulesGrid');
  host.innerHTML = '';

  modules.forEach(m => {
    const a = document.createElement('a');
    a.className = 'module-tile';
    a.href = m.href || '#';
    a.setAttribute('data-module', m.id || '');
    a.innerHTML = `
      <div class="module-ico">${iconSvg(m.icon || 'barChart')}</div>
      <div class="module-label">${m.label || m.id || 'Módulo'}</div>
    `;
    host.appendChild(a);
  });
}

function initLogout(){
  const btn = document.getElementById('btnLogout');
  if(!btn) return;
  btn.addEventListener('click', () => {
    localStorage.removeItem('app_token');
    localStorage.removeItem('app_user');
    window.location.href = "/login.html";
  });
}

function initUserPill(){
  const user = localStorage.getItem('app_user');
  const pill = document.getElementById('userPill');
  if(pill && user){
    pill.textContent = `Usuario: ${user}`;
  } else if(pill){
    pill.textContent = '';
  }
}

(async function init(){
  if (window.__theme && typeof window.__theme.init === "function") {
    window.__theme.init();
  }

  const token = requireLogin();
  if(!token) return;

  initUserPill();
  initLogout();
  await loadBrand();

  const modules = await loadModules();
  renderModules(modules);
})();
