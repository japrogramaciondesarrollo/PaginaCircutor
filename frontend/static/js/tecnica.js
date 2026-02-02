let _sigMap = {};
let _lastRows = null;
let _lastRaw = null;
let _lastTableRows = null;

function setMsg(t, kind){
  const el = document.getElementById('msg');
  if(t && typeof t !== 'string'){
    try{ t = JSON.stringify(t); }catch(e){ t = String(t); }
  }
  el.textContent = t || '';
  el.className = 'msg ' + (kind || '');
}

function setModalMsg(t, kind){
  const el = document.getElementById('modalMsg');
  if(t && typeof t !== 'string'){
    try{ t = JSON.stringify(t); }catch(e){ t = String(t); }
  }
  el.textContent = t || '';
  el.className = 'msg ' + (kind || '');
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
  }catch(_){ }
  try{
    const r = await fetch('/app-config.json', {cache:'no-store'});
    if(r.ok){
      const c = await r.json();
      setBrand(c.appTitle, c.appSubtitle);
    }
  }catch(_){ }
}

async function loadSignificados(){
  try{
    const r = await fetch('/api/significados', {cache:'no-store'});
    if(r.ok){
      _sigMap = await r.json();
      return;
    }
  }catch(_){ }
  _sigMap = {};
}

function meaningFor(code){
  if(!_sigMap) return '';
  if(_sigMap[code]) return _sigMap[code];
  // fallback I<->l
  const swap = code.replace(/I/g,'l');
  if(_sigMap[swap]) return _sigMap[swap];
  const swap2 = code.replace(/l/g,'I');
  if(_sigMap[swap2]) return _sigMap[swap2];
  return '';
}

function requireLogin(){
  const token = localStorage.getItem('app_token');
  if(!token){
    window.location.href = '/login.html';
    return null;
  }
  return token;
}

function methodOptions(){
  // En Técnica se pide mostrar más métodos.
  // Orden: CIR7, B03, S01.., luego el resto.
  return [
    {value:"CIR7", label:"CIR7  Detalles", needsRange:false},
    {value:"B03", label:"B03  Corte / Reconexión", needsRange:false, isOrder:true},
    {value:"S01", label:"S01  Valores instantáneos", needsRange:false},
    {value:"S02", label:"S02  Curva horaria", needsRange:true},
    {value:"S2B", label:"S2B  Curva horaria de perfil activo", needsRange:true},
    {value:"S03", label:"S03  Curva diaria", needsRange:true},
    {value:"S04", label:"S04  Cierre mensual", needsRange:true},
    {value:"S4E", label:"S4E  Cierre mensual con excedentes", needsRange:true},

    {value:"S05", label:"S05  Curva horaria reactiva", needsRange:true},
    {value:"S5B", label:"S5B  Curva horaria reactiva (perfil)", needsRange:true},
    {value:"S06", label:"S06  Curva diaria reactiva", needsRange:true},
    {value:"S07", label:"S07  Cierre mensual reactivo", needsRange:true},
    {value:"S08", label:"S08  Cierre mensual reactivo (excedentes)", needsRange:true},
    {value:"S09", label:"S09  Perfil de carga", needsRange:true},
    {value:"S9B", label:"S9B  Perfil de carga (B)", needsRange:true},
    {value:"S9C", label:"S9C  Perfil de carga (C)", needsRange:true},
    {value:"S14", label:"S14  Eventos", needsRange:true},
    {value:"S14A", label:"S14A  Eventos (A)", needsRange:true},
    {value:"S21", label:"S21  Calidad", needsRange:true},
    {value:"S21A", label:"S21A  Calidad (A)", needsRange:true},
    {value:"S23", label:"S23  Alarmas", needsRange:true},
  ];
}

function renderMethodSelect(){
  const sel = document.getElementById('methodSelect');
  sel.innerHTML = '';
  const opts = methodOptions();

  // Agrupar como en el PDF: primero CIR7..S4E, luego S05..S23
  const g1 = document.createElement('optgroup');
  g1.label = 'Básicos';
  const g2 = document.createElement('optgroup');
  g2.label = 'Técnicos';

  opts.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    if(["CIR7","B03","S01","S02","S2B","S03","S04","S4E"].includes(o.value)) g1.appendChild(opt);
    else g2.appendChild(opt);
  });
  sel.appendChild(g1);
  sel.appendChild(g2);
  sel.value = 'S02';
}

function toggleDateFields(){
  const method = document.getElementById('methodSelect').value;
  const opt = methodOptions().find(x => x.value === method);
  const showDates = !!(opt && opt.needsRange);
  document.getElementById('finiField').style.display = showDates ? 'grid' : 'none';
  document.getElementById('fendField').style.display = showDates ? 'grid' : 'none';
}

function toIsoZ(dtLocalValue){
  if(!dtLocalValue) return null;
  const v = dtLocalValue.length === 16 ? (dtLocalValue + ':00') : dtLocalValue;
  return v.endsWith('Z') ? v : (v + 'Z');
}

function clearResults(){
  const t = document.getElementById('resultTable');
  const rawBox = document.getElementById('rawBox');
  if(t) t.innerHTML = '';
  if(rawBox){ rawBox.style.display = 'none'; rawBox.textContent=''; }
  document.getElementById('btnCsv').disabled = true;
  const btnMax = document.getElementById('btnMax');
  if(btnMax) btnMax.disabled = true;
  document.getElementById('btnXml').disabled = true;
  document.getElementById('legend').innerHTML = '';
  clearPlot();
  _lastRows = null;
  _lastTableRows = null;
  _lastRaw = null;
}

function setInfo(info){
  // info puede venir normalizado (nis/nombre/medidor/...) o crudo desde Excel (NIS/Nombre/Medidor/...)
  const src = info || {};
  const nis = src.nis ?? src.NIS ?? '';
  const nombre = src.nombre ?? src.Nombre ?? '';
  const medidor = src.medidor ?? src.Medidor ?? '';

  // Facturacion.xlsx puede no tener estos campos; quedan vacíos si no existen
  const direccion = src.direccion ?? src.Dirección ?? src.Direccion ?? '';
  const tarifa = src.tarifa ?? src.Tarifa ?? '';
  const ruta = src.ruta ?? src.Ruta ?? '';
  const alim = src.alim ?? src.Alim ?? src.ALIM ?? '';
  const coord = (src.coordenada ?? src['Coordenada'] ?? src['Coordenada '] ?? src['coordenada'] ?? '').toString();

  document.getElementById('nisOut').value = nis;
  document.getElementById('nombreOut').value = nombre;
  document.getElementById('medidorOut').value = medidor;
  document.getElementById('direccionOut').value = direccion;
  document.getElementById('tarifaOut').value = tarifa;
  document.getElementById('rutaOut').value = ruta;
  const alimEl = document.getElementById('alimOut');
  if(alimEl) alimEl.value = alim;

  // Guardamos coordenada para GIS
  const btnGIS = document.getElementById('btnGIS');
  if(btnGIS) btnGIS.dataset.coord = coord.trim();
}

async function lookupUser(q, silent=false){
  if(!q || q.trim().length < 2){
    setInfo(null);
    delete document.getElementById('searchInput').dataset.medidor;
    if(!silent) setMsg('', '');
    return null;
  }
  try{
    const r = await fetch('/api/tecnica/lookup?query=' + encodeURIComponent(q.trim()), {cache:'no-store'});
    const data = await r.json().catch(()=> ({}));

    if(!r.ok){
      const msg = (data && (data.detail || data.error)) ? (data.detail || data.error) : ('HTTP ' + r.status);
      if(!silent) setMsg(msg, 'err');
      setInfo(null);
      delete document.getElementById('searchInput').dataset.medidor;
      return null;
    }

    if(!data.found){
      if(!silent) setMsg('No se encontró en Facturacion.xlsx. (Podés igual consultar por el medidor ingresado).', 'err');
      setInfo(null);
      delete document.getElementById('searchInput').dataset.medidor;
      return null;
    }

    const item = data.match || {};
    setInfo(item);

    const med = item.medidor ?? item.Medidor ?? '';
    if(med){
      document.getElementById('searchInput').dataset.medidor = String(med).trim();
      document.getElementById('medidorOut').value = String(med).trim();
    }

    if(!silent) setMsg('OK. Datos de usuario cargados desde Facturacion.xlsx.', 'ok');
    return item;
  }catch(e){
    if(!silent) setMsg('Error leyendo Facturacion.xlsx: ' + e, 'err');
    setInfo(null);
    delete document.getElementById('searchInput').dataset.medidor;
    return null;
  }
}

function buildTable(rows){
  const table = document.getElementById('resultTable');
  table.innerHTML = '';
  if(!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  const tbody = document.createElement('tbody');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    headers.forEach(h => {
      const td = document.createElement('td');
      td.textContent = (r[h] === null || r[h] === undefined) ? '' : String(r[h]);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(thead);
  table.appendChild(tbody);
}

function toCsv(rows){
  if(!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = (v === null || v === undefined) ? '' : String(v);
    if(/[\n\r",;]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
    return s;
  };
  const lines = [];
  lines.push(headers.join(';'));
  rows.forEach(r => {
    lines.push(headers.map(h => esc(r[h])).join(';'));
  });
  return lines.join('\n');
}

function downloadText(filename, text, mime){
  const blob = new Blob([text], {type: mime || 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- Plot simple (canvas) con doble eje y toggles ---
let _plotState = {series:[], x:[], visible:{}, leftKeys:[], rightKeys:[]};


function clearPlot(){
  const el = document.getElementById('plotlyChart');
  if(!el) return;
  try{
    if(window.Plotly) Plotly.purge(el);
  }catch(e){}
  el.innerHTML = '';
  _plotState = {series:[], x:[], visible:{}, leftKeys:[], rightKeys:[]};
}

function parseX(row){
  // Preferimos Fh (timestamp), sino Date/Fecha
  const cands = ['Fh','fh','Fecha','fecha','ActDate','actdate'];
  for(const k of cands){
    if(row[k]) return String(row[k]);
  }
  return null;
}

function isNumeric(v){
  if(v === null || v === undefined || v === '') return false;
  const n = Number(String(v).replace(',','.'));
  return Number.isFinite(n);
}

function pickSeriesKeys(rows){
  if(!rows || !rows.length) return [];
  const keys = Object.keys(rows[0]);
  // Sacamos llaves de meta
  const meta = new Set(['IdRpt','IdPet','Version','recordTag','Cnc.Id','Cnt.Id','Report.IdRpt','Report.IdPet','Report.Version']);
  return keys.filter(k => !meta.has(k));
}



function buildPlot(rows){
  const el = document.getElementById('plotlyChart');
  if(!el || !window.Plotly){
    return;
  }

  const keys = pickSeriesKeys(rows);
  const xRawStr = rows.map((r, i) => parseX(r) || String(i));

  const hasTime = xRawStr.some(s => /[T\s]\d{2}:\d{2}/.test(String(s))) || xRawStr.some(s => /\d{2}:\d{2}:\d{2}/.test(String(s)));

  function fmtX(s){
    if(!s) return '';
    const str = String(s).trim();
    // ISO / "YYYY-MM-DD" / "YYYY-MM-DD HH:MM:SS"
    const d = new Date(str);
    if(!Number.isNaN(d.getTime())){
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const dd = String(d.getDate()).padStart(2,'0');
      if(hasTime){
        const HH = String(d.getHours()).padStart(2,'0');
        const MM = String(d.getMinutes()).padStart(2,'0');
        const SS = String(d.getSeconds()).padStart(2,'0');
        return `${yy}${mm}${dd} ${HH}:${MM}:${SS}`;
      }
      return `${yy}${mm}${dd}`;
    }
    // fallback: si viene como YYYYMMDDHHMMSS o YYYYMMDD
    const digits = str.replace(/\D/g,'');
    if(digits.length >= 8){
      const yy = digits.slice(2,4);
      const mm = digits.slice(4,6);
      const dd = digits.slice(6,8);
      if(hasTime && digits.length >= 14){
        const HH = digits.slice(8,10);
        const MM = digits.slice(10,12);
        const SS = digits.slice(12,14);
        return `${yy}${mm}${dd} ${HH}:${MM}:${SS}`;
      }
      return `${yy}${mm}${dd}`;
    }
    return str;
  }

  // x para plotly: si parsea como Date, usamos Date para mantener orden; sino string
  const xVals = xRawStr.map(s => {
    const d = new Date(String(s).trim());
    return Number.isNaN(d.getTime()) ? String(s) : d;
  });
  const xDisp = xRawStr.map(fmtX);

  // series numéricas
  const numericKeys = keys.filter(k => rows.some(r => isNumeric(r[k])));

  if(!numericKeys.length){
    renderLegend();
    clearPlot();
    return;
  }

  const usedKeys = numericKeys.slice(0, 6);

  const traces = usedKeys.map(k => {
    const y = rows.map(r => isNumeric(r[k]) ? Number(String(r[k]).replace(',','.')) : null);
    return {
      name: k,
      x: xVals,
      y,
      customdata: xDisp,
      type: 'scatter',
      mode: 'lines',
      connectgaps: true,
      hovertemplate: '<b>%{fullData.name}</b><br>%{customdata}<br>Valor: %{y}<extra></extra>'
    };
  });

  // Guardamos para botón MAX
  window.__tech_plot_last = { xVals, xDisp, traces };

  const dark = document.documentElement.classList.contains('dark');

  const layout = {
    margin: {l: 55, r: 20, t: 10, b: 40},
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: {color: dark ? '#e5e7eb' : '#111827'},
    showlegend: true,
    legend: {orientation: 'h', x: 0, y: -0.25},
    hovermode: 'closest',
    spikedistance: -1,
    hoverdistance: -1,
    xaxis: {
      showspikes: true,
      spikemode: 'across',
      spikesnap: 'cursor',
      spikethickness: 1,
      spikecolor: dark ? '#94a3b8' : '#64748b',
      showline: true,
      zeroline: false
    },
    yaxis: {
      showspikes: true,
      spikemode: 'across',
      spikesnap: 'cursor',
      spikethickness: 1,
      spikecolor: dark ? '#94a3b8' : '#64748b',
      showline: true,
      zeroline: false
    }
  };

  const config = {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d','select2d']
  };

  Plotly.newPlot(el, traces, layout, config);
  renderLegend();

  const btnMax = document.getElementById('btnMax');
  if(btnMax) btnMax.disabled = false;
}

function seriesStats(rows, keys){
  let min = Infinity, max = -Infinity;
  keys.forEach(k => {
    rows.forEach(r => {
      if(!isNumeric(r[k])) return;
      const n = Number(String(r[k]).replace(',','.'));
      if(n < min) min = n;
      if(n > max) max = n;
    });
  });
  if(min === Infinity) return {min:0,max:1};
  if(min === max) return {min:min-1, max:max+1};
  const pad = (max - min) * 0.08;
  return {min:min-pad, max:max+pad};
}


function drawPlot(rows){
  // Compatibilidad: la gráfica ahora usa Plotly
  buildPlot(rows);
}


function renderLegend(){
  const host = document.getElementById('legend');
  if(!host) return;
  host.innerHTML = '<div class="muted" style="padding:10px">Tip: pasá el mouse para ver valores. Podés hacer zoom con la rueda o seleccionando un área.</div>';
}

async function doReport(){
  clearResults();
  setMsg('', '');

  const token = localStorage.getItem('app_token');
  const method = document.getElementById('methodSelect').value;
  const priority = Number(document.getElementById('prioritySelect').value || 2);

  // 1) Si el usuario ya quedó cargado, usamos su medidor
  let medidor = document.getElementById('medidorOut').value
            || document.getElementById('searchInput').dataset.medidor
            || '';

  // 2) Si no está cargado, intentamos resolver con el texto del buscador (NIS/Medidor/Nombre)
  const q = document.getElementById('searchInput').value.trim();
  if(!medidor && q){
    const item = await lookupUser(q, true);
    medidor = document.getElementById('medidorOut').value
           || document.getElementById('searchInput').dataset.medidor
           || (item && (item.medidor || item.Medidor)) || '';
  }

  // 3) Si aun así no hay medidor, usamos lo ingresado como medidor directo (modo "rápido")
  if(!medidor && q){
    medidor = q;
    setMsg('No se encontró usuario en Facturacion.xlsx. Consultando por el medidor ingresado...', '');
  }

  if(!medidor){
    setMsg('Ingresá NIS/Medidor/Nombre en Buscar (o completá el campo Medidor).', 'err');
    return;
  }

  const opt = methodOptions().find(x => x.value === method);
  const fini = opt?.needsRange ? toIsoZ(document.getElementById('finiInput').value) : null;
  const fend = opt?.needsRange ? toIsoZ(document.getElementById('fendInput').value) : null;
  if(opt?.needsRange && (!fini || !fend)){
    setMsg('Para este método es necesario completar Fecha de inicio y Fecha de fin.', 'err');
    return;
  }

  // IMPORTANTE: el backend de /api/meters/report usa claves: meter, report_name, priority, fini, fend
  const body = {
    meter: String(medidor).trim(),
    report_name: method,
    priority,
    fini,
    fend
  };

  setMsg('Consultando...', '');
  try{
    const r = await fetch('/api/meters/report', {
      method:'POST',
      headers:{'Content-Type':'application/json', 'Authorization':'Bearer ' + token},
      body: JSON.stringify(body)
    });

    const data = await r.json().catch(()=> ({}));
    if(!r.ok){
      const msg = (data && (data.detail || data.error)) ? (data.detail || data.error) : ('HTTP ' + r.status);
      setMsg(msg, 'err');
      return;
    }

    _lastRaw = data.raw || '';
    document.getElementById('btnXml').disabled = !_lastRaw;

    // Render
    if(Array.isArray(data.data)){
      _lastRows = data.data;
      _lastTableRows = data.data;
      buildTable(data.data);
      document.getElementById('btnCsv').disabled = !data.data.length;
      buildPlot(data.data);
      setMsg(`OK. IP: ${data.ip} (${data.report_name})`, 'ok');
    }else if(typeof data.data === 'object' && data.data){
      _lastRows = [data.data];
      _lastTableRows = [data.data];
      buildTable([data.data]);
      document.getElementById('btnCsv').disabled = false;
      buildPlot([data.data]);
      setMsg(`OK. IP: ${data.ip} (${data.report_name})`, 'ok');
    }else{
      setMsg('Respuesta sin datos.', 'err');
    }
  }catch(e){
    setMsg('Error de red: ' + e, 'err');
  }
}

// --- Modal Add User ---
function openModal(){
  const m = document.getElementById('userModal');
  m.classList.add('open');
  m.setAttribute('aria-hidden','false');
  setModalMsg('', '');
}

function closeModal(){
  const m = document.getElementById('userModal');
  m.classList.remove('open');
  m.setAttribute('aria-hidden','true');
}

async function saveUser(){
  const payload = {
    nis: document.getElementById('uNis').value.trim(),
    nombre: document.getElementById('uNombre').value.trim(),
    medidor: document.getElementById('uMedidor').value.trim(),
    direccion: document.getElementById('uDireccion').value.trim(),
    tarifa: document.getElementById('uTarifa').value.trim(),
    ruta: document.getElementById('uRuta').value.trim(),
    coordenada: document.getElementById('uCoord').value.trim(),
  };
  if(!payload.nis || !payload.medidor){
    setModalMsg('NIS y Medidor son obligatorios.', 'err');
    return;
  }
  try{
    const r = await fetch('/api/tecnica/users', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await r.json().catch(()=> ({}));
    if(!r.ok){
      setModalMsg((data && (data.detail || data.error)) ? (data.detail || data.error) : ('HTTP ' + r.status), 'err');
      return;
    }
    setModalMsg('Guardado.', 'ok');
    closeModal();
  }catch(e){
    setModalMsg('Error guardando: ' + e, 'err');
  }
}

function initModal(){
  document.getElementById('btnAddUser').addEventListener('click', openModal);
  document.querySelectorAll('[data-close="1"]').forEach(el => el.addEventListener('click', closeModal));
  document.getElementById('btnSaveUser').addEventListener('click', saveUser);
}

function initSearch(){
  const inp = document.getElementById('searchInput');
  let t = null;
  inp.addEventListener('input', () => {
    if(t) clearTimeout(t);
    t = setTimeout(() => lookupUser(inp.value), 350);
  });
  inp.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') lookupUser(inp.value);
  });
}


function initMax(){
  const btn = document.getElementById('btnMax');
  if(!btn) return;

  btn.addEventListener('click', () => {
    const el = document.getElementById('plotlyChart');
    const state = window.__tech_plot_last;
    if(!el || !window.Plotly || !state || !state.traces) return;

    // Borramos MAX previo (si existe)
    try{
      if(window.__tech_max_trace_index !== undefined){
        Plotly.deleteTraces(el, [window.__tech_max_trace_index]);
        window.__tech_max_trace_index = undefined;
      }
      Plotly.relayout(el, {annotations: []});
    }catch(e){}

    // Buscamos máximo global entre traces visibles
    let best = null; // {y, x, xdisp, name}
    for(const tr of state.traces){
      const y = tr.y || [];
      for(let i=0;i<y.length;i++){
        const v = y[i];
        if(v === null || v === undefined) continue;
        if(best === null || v > best.y){
          best = {y: v, x: tr.x[i], xdisp: tr.customdata[i], name: tr.name};
        }
      }
    }
    if(!best) return;

    const maxTrace = {
      name: 'MAX',
      x: [best.x],
      y: [best.y],
      type: 'scatter',
      mode: 'markers+text',
      text: ['MAX'],
      textposition: 'top center',
      hovertemplate: `<b>MAX</b><br>${best.xdisp}<br>Valor: ${best.y}<extra></extra>`
    };

    Plotly.addTraces(el, maxTrace).then(() => {
      // el índice del nuevo trace será el último
      window.__tech_max_trace_index = el.data.length - 1;
      Plotly.relayout(el, {
        annotations: [{
          x: best.x,
          y: best.y,
          xref: 'x',
          yref: 'y',
          text: `${best.name}: ${best.y}`,
          showarrow: true,
          arrowhead: 2,
          ax: 20,
          ay: -30
        }]
      });
    });
  });
}

function initDownloads(){
  document.getElementById('btnXml').addEventListener('click', () => {
    if(!_lastRaw) return;
    downloadText('reporte.xml', _lastRaw, 'application/xml');
  });
  document.getElementById('btnCsv').addEventListener('click', () => {
    if(!_lastTableRows) return;
    downloadText('reporte.csv', toCsv(_lastTableRows), 'text/csv');
  });
}

function initGIS(){
  document.getElementById('btnGIS').addEventListener('click', () => {
    const coord = (document.getElementById('btnGIS').dataset.coord || '').trim();
    if(!coord){
      setMsg('No hay coordenadas para este usuario.', 'err');
      return;
    }
    window.location.href = '/georef.html?coord=' + encodeURIComponent(coord);
  });
}

function init(){
  if (window.__theme && typeof window.__theme.init === 'function') {
    window.__theme.init();
  }

  if(!requireLogin()) return;

  loadBrand();
  loadSignificados();
  renderMethodSelect();
  toggleDateFields();

  document.getElementById('methodSelect').addEventListener('change', () => {
    toggleDateFields();
    clearResults();
  });
  document.getElementById('btnLeer').addEventListener('click', doReport);

  initSearch();
  initModal();
  initDownloads();
  initMax();
  initGIS();
}

document.addEventListener('DOMContentLoaded', init);
