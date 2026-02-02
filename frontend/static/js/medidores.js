function setMsg(t, kind){
  const el = document.getElementById('msg');
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
  }catch(_){}
  try{
    const r = await fetch('/app-config.json', {cache:'no-store'});
    if(r.ok){
      const c = await r.json();
      setBrand(c.appTitle, c.appSubtitle);
    }
  }catch(_){}
}

async function loadSignificados(){
  try{
    const r = await fetch('/api/significados', {cache:'no-store'});
    if(r.ok){
      _sigMap = await r.json();
      return;
    }
  }catch(_){}
  _sigMap = {};
}

function meaningFor(code){
  if(!_sigMap) return '';
  if(_sigMap[code]) return _sigMap[code];

  // Fallback simple: confusión I vs l (AIa vs Ala)
  const swap = code.replace(/I/g,'l');
  if(_sigMap[swap]) return _sigMap[swap];
  const swap2 = code.replace(/l/g,'I');
  if(_sigMap[swap2]) return _sigMap[swap2];

  return '';
}

function methodOptions(){
  // Basado en la lista de Postman/imagen. Ajustable.
  return [
    // Órdenes
    {value:"B03", label:"B03  Corte / Reconexión", needsRange:false, isOrder:true},
    {value:"B03M", label:"B03  Masivo (Excel)", needsRange:false, isOrder:true},

    // Pedidos
    {value:"CIR7", label:"CIR7  Detalles", needsRange:false},
    {value:"S01", label:"S01  Valores instantáneos", needsRange:false},
    {value:"S02", label:"S02  Curva horaria", needsRange:true},
    {value:"S2B", label:"S2B  Curva horaria de perfil activo", needsRange:true},
    {value:"S03", label:"S03  Curva diaria", needsRange:true},
    {value:"S04", label:"S04  Cierre mensual", needsRange:true},
    {value:"S4E", label:"S4E  Cierre mensual con excedentes", needsRange:true}
  ];
}



let _lastRows = null;
let _lastRaw = null;
let _sigMap = {};


function renderMethodSelect(){
  const sel = document.getElementById('methodSelect');
  sel.innerHTML = '';

  const opts = methodOptions();
  const orders = opts.filter(o => o.isOrder);
  const pedidos = opts.filter(o => !o.isOrder);

  const ogOrders = document.createElement('optgroup');
  ogOrders.label = 'Órdenes';
  orders.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    ogOrders.appendChild(opt);
  });

  const ogPedidos = document.createElement('optgroup');
  ogPedidos.label = 'Pedidos';
  pedidos.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    ogPedidos.appendChild(opt);
  });

  // Si no hay órdenes (fallback), no usamos grupos.
  if(orders.length){
    sel.appendChild(ogOrders);
    sel.appendChild(ogPedidos);
  }else{
    opts.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      sel.appendChild(opt);
    });
  }

  sel.value = "CIR7";
}


function toggleDateFields(){
  const method = document.getElementById('methodSelect').value;
  const opt = methodOptions().find(x => x.value === method);

  const showDates = !!(opt && opt.needsRange);
  const showOrder = !!(opt && opt.isOrder);
  const isB03 = (method === 'B03' || method === 'B03M');
  const isMass = (method === 'B03M');

  document.getElementById('finiField').style.display = showDates ? 'grid' : 'none';
  document.getElementById('fendField').style.display = showDates ? 'grid' : 'none';

  const of = document.getElementById('orderField');
  if(of) of.style.display = showOrder ? 'grid' : 'none';

  const af = document.getElementById('actField');
  if(af) af.style.display = isB03 ? 'grid' : 'none';

// Mostrar selector de archivo en B03M y ocultar el campo Medidor
const mf = document.getElementById('massFileField');
const mef = document.getElementById('meterField');
if(mf) mf.style.display = isMass ? 'grid' : 'none';
if(mef) mef.style.display = isMass ? 'none' : 'grid';

  // Layout especial B03 (mueve el botón a la fila 2 y hace que Fecha ocupe 3 columnas)
  const grid = document.getElementById('formGrid') || document.querySelector('.form-grid');
  if(grid) grid.classList.toggle('b03', isB03);

  // Texto e icono del botón (Leer / Enviar)
  const txt = document.getElementById('btnLeerText');
  if(txt) txt.textContent = isB03 ? 'Enviar' : 'Leer';

  const icon = document.getElementById('btnLeerIcon');
  if(icon){
    if(!window.__DOC_ICON_HTML){
      window.__DOC_ICON_HTML = icon.innerHTML;
    }
    if(isB03){
      icon.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
          <path d="M22 2L11 13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M22 2l-7 20-4-9-9-4 20-7Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }else{
      icon.innerHTML = window.__DOC_ICON_HTML;
    }
  }
}

function toIsoZ(dtLocalValue){
  // dtLocalValue: "YYYY-MM-DDTHH:MM:SS" (sin zona). Lo enviamos como UTC (sufijo Z) sin convertir.
  if(!dtLocalValue) return null;
  // Normalizar si el navegador devuelve sin segundos
  const v = dtLocalValue.length === 16 ? (dtLocalValue + ":00") : dtLocalValue;
  return v.endsWith("Z") ? v : (v + "Z");
}

function clearTable(){
  const t = document.getElementById('resultTable');
  const rawBox = document.getElementById('rawBox');
  const formBox = document.getElementById('formBox');

  if(t) t.innerHTML = '';

  if(rawBox){
    rawBox.style.display = 'none';
    rawBox.textContent = '';
  }

  if(formBox){
    formBox.innerHTML = '';
    formBox.style.display = 'none';
  }

  // Por defecto dejamos visible el contenedor de tabla (si luego renderizamos formulario se ocultará)
  if(t && t.parentElement) t.parentElement.style.display = '';

  document.getElementById('btnCsv').disabled = true;
  const bx = document.getElementById('btnXml');
  if(bx) bx.disabled = true;

  _lastRows = null;
  _lastRaw = null;
}

function _pick(obj, keys){
  const out = {};
  keys.forEach(k => { if(obj[k] !== undefined) out[k] = obj[k]; });
  return out;
}

function renderDetails(method, rows){
  const wrap = document.getElementById('results');
  wrap.innerHTML = '';

  if(!rows || !rows.length){
    wrap.innerHTML = '<div class="muted">Sin datos.</div>';
    return;
  }

  const row = rows[0];

  // Campos "meta" que no mostramos como parámetros
  const metaKeys = new Set(["IdRpt","IdPet","Version","recordTag","Cnc.Id","Cnt.Id"]);
  const allKeys = Object.keys(row).filter(k => !metaKeys.has(k));

  // Layout por método
  const layout = {
    "CIR7": [
      {title:"Parámetros generales", fields:["Vf","VPrime"]},
      {title:"Tensiones", fields:["L1v","L2v","L3v"]},
      {title:"Corrientes", fields:["L1i","L2i","L3i","L3","I1","I2","I3"]},
      {title:"Potencias", fields:["Pimp","Pexp","Qimp","Qexp","PF"]},
      {title:"Energías", fields:["AIa","Ala","AEa","R1a","R2a","R3a","R4a"]},
      {title:"Fecha", fields:["Fh"]},
      {title:"Umbral de demanda", fields:["ATariff","AThres","Dctcp","DThres1","DThres2","DThres3","DThres4","DThres5","DThres6","Eacti"]},
    ],
    "S01": [
      {title:"Valores instantáneos", fields:["Vf","VPrime","L1v","L2v","L3v","L1i","L2i","L3i","L3","Pimp","Pexp","Qimp","Qexp","PF","AIa","Ala","AEa","Fh"]},
    ]
  };

  const h = document.createElement('div');
  h.className = 'details-header';
  h.innerHTML = `<div class="details-title">${(method || '').toUpperCase()} (${methodLabel(method)})</div>`;
  wrap.appendChild(h);

  const container = document.createElement('div');
  container.className = 'details-view';

  const sections = layout[method] || [{title:"Datos", fields: allKeys}];

  const rendered = new Set();

  sections.forEach(sec => {
    const secEl = document.createElement('section');
    secEl.className = 'details-section';

    const t = document.createElement('div');
    t.className = 'details-section-title';
    t.textContent = sec.title;
    secEl.appendChild(t);

    const grid = document.createElement('div');
    grid.className = 'details-grid';

    sec.fields.forEach(k => {
      if(row[k] === undefined) return;
      rendered.add(k);
      grid.appendChild(_detailField(k, row[k]));
    });

    // Evitar secciones vacías
    if(grid.childElementCount > 0){
      secEl.appendChild(grid);
      container.appendChild(secEl);
    }
  });

  // Agregar el resto que no entró en layout
  const remaining = allKeys.filter(k => !rendered.has(k));
  if(remaining.length){
    const secEl = document.createElement('section');
    secEl.className = 'details-section';
    const t = document.createElement('div');
    t.className = 'details-section-title';
    t.textContent = 'Otros';
    secEl.appendChild(t);

    const grid = document.createElement('div');
    grid.className = 'details-grid';
    remaining.forEach(k => grid.appendChild(_detailField(k, row[k])));
    secEl.appendChild(grid);
    container.appendChild(secEl);
  }

  wrap.appendChild(container);
}

function methodLabel(method){
  const opt = methodOptions().find(o => o.value === method);
  return opt ? opt.label : method;
}

function _detailField(code, value){
  const box = document.createElement('div');
  box.className = 'details-field';

  const meaning = meaningFor(code);
  const label = document.createElement('div');
  label.className = 'details-label';
  label.innerHTML = `<span class="details-code">${code}</span>${meaning ? `<span class="details-meaning">${meaning}</span>` : ''}`;
  box.appendChild(label);

  const input = document.createElement('input');
  input.className = 'details-input';
  input.type = 'text';
  input.readOnly = true;
  input.value = (value === null || value === undefined) ? '' : String(value);
  box.appendChild(input);

  return box;
}


const FORM_METHODS = new Set(["CIR7","S01"]);

function _formatValue(v){
  if(v === null || v === undefined) return "";
  if(typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function _fieldMeaning(key){
  // Para claves con prefijo tipo 'Cnc.Id' usamos solo 'Id' como fallback
  const base = key.includes('.') ? key.split('.').slice(-1)[0] : key;
  const m = meaningFor(key) || meaningFor(base) || '';
  if(m) return m;

  // Algunos básicos que no están en el Excel
  if(key === "Cnc.Id") return "ID del concentrador";
  if(key === "Cnt.Id") return "ID del medidor";
  return "";
}

function _pick(obj, keys){
  const out = [];
  keys.forEach(k => { if(Object.prototype.hasOwnProperty.call(obj,k)) out.push(k); });
  return out;
}

function _remaining(obj, used){
  return Object.keys(obj).filter(k => !used.has(k));
}

function renderFormFromObject(obj, method){
  const formBox = document.getElementById('formBox');
  const table = document.getElementById('resultTable');
  const rawBox = document.getElementById('rawBox');

  formBox.style.display = '';
  table.parentElement.style.display = 'none';
  rawBox.style.display = 'none';
  table.innerHTML = '';
  formBox.innerHTML = '';

  const used = new Set();

  const sections = [];

  // Secciones / orden sugerido
  const general = [
    "Cnc.Id","Cnt.Id","Vf","VPrime","Fh",
    "PF","Ca","PP","Fc","Eacti","Eanti",
    "IdRpt","IdPet","Version","recordTag"
  ];
  const tensiones = ["L1v","L2v","L3v"];
  const corrientes = ["L1i","L2i","L3i","L3","I3"];
  const potencias = ["Pimp","Pexp","Qimp","Qexp"];
  const energias = ["Ala","AEa","R1a","R2a","R3a","R4a"];
  const umbral = ["ATariff","AThres","Dctcp","DThres1","DThres2","DThres3","DThres4","DThres5","DThres6"];

  function addSection(title, keys){
    const present = _pick(obj, keys);
    if(present.length){
      present.forEach(k=>used.add(k));
      sections.push({title, keys: present});
    }
  }

  addSection(method === "CIR7" ? "Parámetros generales" : "Parámetros generales", general);
  addSection("Tensiones", tensiones);
  addSection("Corrientes", corrientes);
  addSection("Potencias", potencias);
  addSection("Energías", energias);
  addSection("Umbral de demanda", umbral);

  const rest = _remaining(obj, used).sort();
  if(rest.length){
    sections.push({title:"Otros", keys: rest});
  }

  sections.forEach(sec => {
    const secEl = document.createElement('div');
    secEl.className = 'kv-section';

    const title = document.createElement('div');
    title.className = 'kv-section-title';
    title.textContent = sec.title;
    secEl.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'kv-grid';

    sec.keys.forEach(k => {
      const item = document.createElement('div');
      item.className = 'kv-item';

      const label = document.createElement('div');
      label.className = 'kv-label';

      const code = document.createElement('span');
      code.textContent = k.includes('.') ? k.split('.').slice(-1)[0] : k;
      label.appendChild(code);

      const mean = _fieldMeaning(k);
      if(mean){
        const tip = document.createElement('span');
        tip.className = 'kv-tip';
        tip.textContent = '?';
        tip.setAttribute('data-tip', mean);
        tip.title = mean;
        label.appendChild(tip);
      }

      const value = document.createElement('div');
      value.className = 'kv-value';
      value.title = _formatValue(obj[k]);
      value.textContent = _formatValue(obj[k]);

      item.appendChild(label);
      item.appendChild(value);
      grid.appendChild(item);
    });

    secEl.appendChild(grid);
    formBox.appendChild(secEl);
  });

  // Habilitar exportación CSV también en vista formulario
  const cols = [];
  sections.forEach(sec => {
    sec.keys.forEach(k => { if(!cols.includes(k)) cols.push(k); });
  });
  // En caso de que queden claves sueltas (por seguridad)
  Object.keys(obj||{}).forEach(k => { if(!cols.includes(k)) cols.push(k); });

  _lastRows = {rows:[obj], cols};
  document.getElementById('btnCsv').disabled = !(cols && cols.length);

}

function renderTableFromObjects(rows){
  const t = document.getElementById('resultTable');
  t.innerHTML = '';
  if(!rows || !rows.length){
    t.innerHTML = '<tbody><tr><td class="muted">Sin datos</td></tr></tbody>';
    return;
  }

  // columns = unión de keys
  const cols = [];
  const seen = new Set();
  rows.forEach(r => {
    Object.keys(r || {}).forEach(k => { if(!seen.has(k)){ seen.add(k); cols.push(k); }});
  });

  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  cols.forEach(c => {
    const th = document.createElement('th');
    th.textContent = c;
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  t.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    cols.forEach(c => {
      const td = document.createElement('td');
      const v = (r && r[c] !== undefined && r[c] !== null) ? r[c] : '';
      if(typeof v === 'object') td.textContent = JSON.stringify(v);
      else td.textContent = String(v);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  t.appendChild(tbody);

  _lastRows = {rows, cols};
  document.getElementById('btnCsv').disabled = false;
}

// Compat helpers: algunas versiones del frontend llamaban a renderTable/renderJson.
// Acá los definimos para evitar errores y soportar diferentes formatos.
function renderTable(rows, cols){
  if(!Array.isArray(rows) || rows.length === 0){
    renderJson({ rows, cols });
    return;
  }

  // Caso ideal: lista de objetos
  if(rows[0] && typeof rows[0] === 'object' && !Array.isArray(rows[0])){
    renderTableFromObjects(rows);
    return;
  }

  // Caso: matriz + columnas
  if(Array.isArray(cols) && cols.length > 0){
    const asObjects = rows.map((r) => {
      const obj = {};
      cols.forEach((c, i) => {
        obj[String(c)] = Array.isArray(r) ? r[i] : (r && typeof r === 'object' ? r[String(c)] : '');
      });
      return obj;
    });
    renderTableFromObjects(asObjects);
    return;
  }

  // Fallback
  renderJson({ rows, cols });
}

function renderJson(obj){
  // Mostrar como JSON en el bloque RAW (sin romper la UI)
  const rawBox = document.getElementById('rawBox');
  const rawHeader = document.getElementById('rawHeader');
  const tableContainer = document.getElementById('tableContainer');

  if(tableContainer) tableContainer.innerHTML = '';
  if(rawHeader) rawHeader.style.display = 'none';

  if(rawBox){
    rawBox.style.display = 'block';
    try{
      rawBox.textContent = JSON.stringify(obj, null, 2);
    }catch{
      rawBox.textContent = String(obj);
    }
  }

  _lastRows = null;
}

function downloadCsv(){
  if(!_lastRows) return;
  const {rows, cols} = _lastRows;
  const lines = [];
  lines.push(cols.map(c => `"${String(c).replaceAll('"','""')}"`).join(','));
  rows.forEach(r => {
    const line = cols.map(c => `"${String((r && r[c] != null) ? r[c] : '').replaceAll('"','""')}"`).join(',');
    lines.push(line);
  });
  const blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'resultado.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function downloadXml(){
  if(!_lastRaw) return;
  const blob = new Blob([_lastRaw], {type:'application/xml;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'resultado.xml';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}



async function onLeer(){
  clearTable();
  setMsg('', '');

  const method = document.getElementById('methodSelect').value;
  const priority = Number(document.getElementById('prioritySelect').value);

  const opt = methodOptions().find(x => x.value === method);
  const needsRange = !!(opt && opt.needsRange);

  // Fechas para reportes por rango
  const fini = needsRange ? toIsoZ(document.getElementById('finiInput').value) : null;
  const fend = needsRange ? toIsoZ(document.getElementById('fendInput').value) : null;

  // Fecha única para B03 / B03M
  const isB03 = (method === 'B03' || method === 'B03M');
  const act = isB03 ? toIsoZ(document.getElementById('actInput').value) : null;

  // --- B03 MASIVO (Excel) ---
  if(method === 'B03M'){
    if(!act){
      setMsg('Debe seleccionar la fecha para la orden B03.', 'err');
      return;
    }
    const fileInput = document.getElementById('massFileInput');
    if(!fileInput || !fileInput.files || !fileInput.files.length){
      setMsg('Debe seleccionar un archivo Excel con medidores.', 'err');
      return;
    }

    const btn = document.getElementById('btnLeer');
    btn.disabled = true;
    setMsg('Enviando…', 'ok');

    try{
      const order = Number(document.getElementById('orderSelect')?.value || 0);

      const fd = new FormData();
      fd.append('file', fileInput.files[0]);
      fd.append('order', String(order));
      fd.append('actdate', act);
      fd.append('priority', String(priority));
      fd.append('id_pet', '0');

      const r = await fetch('/api/meters/order_massive', { method:'POST', body: fd });
      const data = await r.json().catch(() => ({}));

      if(!r.ok){
        const msg = (data && data.detail) ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : ('HTTP ' + r.status);
        setMsg(msg, 'err');
        return;
      }

      const rows = data.results || [];
      renderTableFromObjects(rows);

      // En masivo no hay XML "crudo" para bajar
      const bx = document.getElementById('btnXml');
      if(bx) bx.disabled = true;
      _lastRaw = '';

      const okCount = rows.filter(x => x && x.ok).length;
      const errCount = rows.length - okCount;
      setMsg(`OK. Procesados: ${rows.length}. Éxito: ${okCount}. Errores: ${errCount}.`, 'ok');

    }catch(e){
      setMsg(e?.message || String(e), 'err');
    }finally{
      btn.disabled = false;
    }
    return;
  }

  // --- Resto de métodos ---
  const meter = document.getElementById('meterInput').value.trim();

  if(!meter){
    setMsg('Debe ingresar un medidor.', 'err');
    return;
  }
  if(needsRange && (!fini || !fend)){
    setMsg('Debe seleccionar fecha de inicio y fin.', 'err');
    return;
  }
  if(isB03 && !act){
    setMsg('Debe seleccionar la fecha para la orden B03.', 'err');
    return;
  }

  const btn = document.getElementById('btnLeer');
  btn.disabled = true;
  setMsg(isB03 ? 'Enviando…' : 'Leyendo…', 'ok');

  try{
    let endpoint = '/api/meters/report';
    let bodyObj = { meter, report_name: method, priority, fini, fend };

    if(method === 'B03'){
      endpoint = '/api/meters/order';
      const order = Number(document.getElementById('orderSelect')?.value || 0);
      // Mandamos una sola fecha; el backend completa el Ffin automáticamente
      bodyObj = { meter, order, priority, fini: act, fend: null };
    }

    const r = await fetch(endpoint, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(bodyObj)
    });
    const data = await r.json().catch(()=> ({}));

    if(!r.ok){
      const msg = (data && data.detail) ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : ('HTTP ' + r.status);
      setMsg(msg, 'err');
      return;
    }

    // Guardar raw para descarga XML cuando corresponda
    if(data && data.raw != null) _lastRaw = data.raw;
    else if(data && data.xml != null) _lastRaw = data.xml;
    else _lastRaw = '';

    // Render según respuesta (compat: backend puede devolver "data" con rows/cols)
    const selectedMethod = (methodSelect?.value || '').trim();
    const payload = (data && data.data !== undefined) ? data.data : ((data && data.parsed !== undefined) ? data.parsed : data);

    // Normalizar a "rows" (array de objetos) cuando sea posible
    let rows = null;
    let cols = null;

    if (payload && payload.parsed && Array.isArray(payload.parsed.rows)) {
      rows = payload.parsed.rows;
      cols = payload.parsed.cols || [];
    } else if (payload && Array.isArray(payload.rows)) {
      rows = payload.rows;
      cols = payload.cols || [];
    } else if (Array.isArray(payload)) {
      rows = payload;
    }

    // Reportes tipo formulario: CIR7 / S01 (1 fila => mostrar como formulario)
    const isFormReport = (selectedMethod === 'CIR7' || selectedMethod === 'S01');

    if (rows && Array.isArray(rows)) {
      if (isFormReport && rows.length === 1 && rows[0] && typeof rows[0] === 'object' && !Array.isArray(rows[0])) {
        renderFormFromObject(rows[0]);
      } else {
        // Preferimos tabla basada en objetos; si viene como matriz + cols, lo soportamos igual
        renderTable(rows, cols || []);
      }
      setMsg('OK.', 'ok');
    } else if (payload && payload.form && typeof payload.form === 'object') {
      // compat: algunas versiones devolvían "form" explícito
      renderFormFromObject(payload.form);
      setMsg('OK.', 'ok');
    } else {
      // fallback: mostrar JSON (sin romper)
      renderJson(payload);
      setMsg('OK.', 'ok');
    }

    // botones
    document.getElementById('btnCsv').disabled = !_lastRows;
    const bx = document.getElementById('btnXml');
    if(bx) bx.disabled = !_lastRaw;

  }catch(e){
    setMsg(e?.message || String(e), 'err');
  }finally{
    btn.disabled = false;
  }
}

function requireLogin(){
  const t = localStorage.getItem('app_token');
  if(!t){ window.location.href = '/login.html'; return null; }
  return t;
}

(function init(){
  if(window.__theme && typeof window.__theme.init === 'function') window.__theme.init();

  if(!requireLogin()) return;

  loadBrand();
  loadSignificados();

  renderMethodSelect();
  toggleDateFields();

  document.getElementById('methodSelect').addEventListener('change', () => { toggleDateFields(); clearTable(); setMsg('', ''); });
  document.getElementById('btnLeer').addEventListener('click', onLeer);
  document.getElementById('btnCsv').addEventListener('click', downloadCsv);
  const bx = document.getElementById('btnXml');
  if(bx) bx.addEventListener('click', downloadXml);
})();
