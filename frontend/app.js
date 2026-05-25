/* ── CaliDocs SPA — app.js ── */

const API = '/api';
let usuario = null;
let arbolData = [];
let docIdGenerado = null;
let centroModificado = false;
let centroSeleccionadoAdmin = null;   // id del centro seleccionado en panel admin

// ── Utilidades ────────────────────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const isFormData = opts.body instanceof FormData;
  const res = await fetch(API + path, {
    credentials: 'include',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body
      ? (isFormData ? opts.body : JSON.stringify(opts.body))
      : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Error'), { status: res.status });
  return data;
}

function showMsg(id, texto, tipo = 'err') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = texto;
  el.className = `msg ${tipo} show`;
  setTimeout(() => el.classList.remove('show'), 4500);
}

function fmtFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES');
}

// ── Cierre de modales con ESC y clic en el fondo ──────────────────────────────

const MODALES = ['modal-carpeta', 'modal-renombrar', 'modal-upload', 'modal-centro', 'modal-usuario', 'modal-preview', 'modal-codificar', 'modal-crear'];

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  MODALES.forEach(id => {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
  });
});

MODALES.forEach(id => {
  const m = document.getElementById(id);
  if (!m) return;
  m.addEventListener('click', e => {
    if (e.target.id === id) m.style.display = 'none';
  });
});

// ── Navegación ────────────────────────────────────────────────────────────────

function showSec(id) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sec-' + id)?.classList.add('active');
  document.querySelector(`.nav-item[data-sec="${id}"]`)?.classList.add('active');
  if (id === 'dashboard')   cargarDashboard();
  if (id === 'centro')      cargarCentro();
  if (id === 'carpetas')    cargarArbol();
  if (id === 'repositorio') { cargarDocumentos(); poblarFiltrosCarpeta(); }
  if (id === 'generador')   cargarCarpetasSelect('gen-carpeta');
  if (id === 'admin')       cargarAdmin();
}

document.querySelectorAll('.nav-item[data-sec]').forEach(btn => {
  btn.addEventListener('click', () => {
    const destino = btn.dataset.sec;
    if (centroModificado && document.getElementById('sec-centro')?.classList.contains('active') && destino !== 'centro') {
      if (!confirm('Tienes cambios sin guardar en la configuración. ¿Salir sin guardar?')) return;
      centroModificado = false;
    }
    showSec(destino);
  });
});

// ── Auth ──────────────────────────────────────────────────────────────────────

async function checkSession() {
  try {
    usuario = await apiFetch('/auth/me');
    onLogin();
  } catch {
    document.getElementById('sec-login').style.display = 'flex';
  }
}

const NIVEL = { superadmin: 5, admin_centro: 4, coordinador_calidad: 3, docente: 2, invitado: 1 };
function tieneRol(minimo) { return (NIVEL[usuario?.rol] || 0) >= (NIVEL[minimo] || 99); }

function onLogin() {
  document.getElementById('sec-login').style.display = 'none';
  document.getElementById('app-header').style.display = 'flex';
  document.getElementById('app-body').style.display = 'flex';
  document.getElementById('nav-usuario').textContent = `${usuario.nombre} · ${usuario.rol}`;

  if (usuario.rol === 'superadmin') {
    document.getElementById('nav-admin').style.display = 'flex';
    document.getElementById('nav-admin-section').style.display = 'block';
  }

  // Muestra/oculta controles según el rol
  const esCoord  = tieneRol('coordinador_calidad');
  const esAdmin  = tieneRol('admin_centro');
  const tieneCentro = !!usuario.id_centro;

  // Árbol SGC: botones de escritura solo para coordinador+
  document.getElementById('btn-nueva-carpeta').style.display  = esCoord && tieneCentro ? '' : 'none';
  document.getElementById('btn-codificar').style.display      = tieneCentro ? '' : 'none';
  document.getElementById('btn-reset-arbol').style.display    = esAdmin  && tieneCentro ? '' : 'none';
  document.getElementById('btn-script-bash').style.display    = tieneCentro ? '' : 'none';
  document.getElementById('btn-script-ps').style.display      = tieneCentro ? '' : 'none';
  document.getElementById('btn-expandir-todo').style.display  = tieneCentro ? '' : 'none';
  document.getElementById('btn-plegar-todo').style.display    = tieneCentro ? '' : 'none';

  // Repositorio: botones de acción según rol
  document.getElementById('btn-subir-doc').style.display  = esCoord && tieneCentro ? '' : 'none';
  document.getElementById('btn-crear-doc').style.display  = tieneCentro ? '' : 'none';

  showSec('dashboard');
}

document.getElementById('btn-login').addEventListener('click', async () => {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pass').value;
  if (!email || !password) return showMsg('login-msg', 'Introduce email y contraseña');
  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  try {
    usuario = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    onLogin();
  } catch (err) { showMsg('login-msg', err.message); }
  finally { btn.disabled = false; }
});

document.getElementById('login-pass').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-login').click();
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
  usuario = null; arbolData = []; docIdGenerado = null; centroModificado = false; centroSeleccionadoAdmin = null;
  location.reload();
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

async function cargarDashboard() {
  const statsEl = document.getElementById('dash-stats');
  const subEl   = document.getElementById('dash-sub');
  try {
    if (usuario.rol === 'superadmin') {
      const data = await apiFetch('/admin/stats');
      subEl.textContent = 'Vista global del sistema';
      statsEl.innerHTML = stat(data.centros, 'Centros') + stat(data.usuarios, 'Usuarios activos')
        + stat(data.documentos, 'Documentos') + stat(data.generadosIA, 'Generados con IA');
    } else if (usuario.id_centro) {
      const docs = await apiFetch('/documentos').catch(() => []);
      const vig  = docs.filter(d => d.estado === 'vigente').length;
      const bor  = docs.filter(d => d.estado === 'borrador').length;
      subEl.textContent = `Bienvenido, ${usuario.nombre}`;
      statsEl.innerHTML = stat(docs.length, 'Documentos') + stat(vig, 'Vigentes') + stat(bor, 'Borradores');
      const rec = docs.slice(0, 5);
      document.getElementById('dash-recientes').innerHTML = rec.length
        ? rec.map(d => `<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:.88rem;">
            <strong>${d.nombre}</strong>
            <span class="badge badge-${d.estado}" style="margin-left:8px;">${d.estado}</span>
            <span style="color:var(--mid);float:right;">${fmtFecha(d.updated_at)}</span>
          </div>`).join('')
        : '<p style="color:var(--mid);font-size:.88rem;">Sin documentos aún.</p>';
    }
  } catch {}
}

function stat(n, label) {
  return `<div class="stat-card"><div class="stat-num">${n}</div><div class="stat-label">${label}</div></div>`;
}

// ── Centro ────────────────────────────────────────────────────────────────────

let logoBase64 = null;

async function cargarCentro() {
  if (!usuario?.id_centro) return;
  try {
    const c = await apiFetch('/centro');
    document.getElementById('c-nombre').value = c.nombre || '';
    document.getElementById('c-codigo').value = c.codigo || '';
    document.getElementById('c-anio').value   = c.año_academico || '';
    document.getElementById('c-dir').value    = c.direccion || '';
    document.getElementById('c-tel').value    = c.telefono || '';
    document.getElementById('c-email').value  = c.email || '';
    if (c.logo_base64) mostrarLogo(c.logo_base64);
    centroModificado = false;
  } catch {}
}

['c-nombre', 'c-codigo', 'c-anio', 'c-dir', 'c-tel', 'c-email'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => { centroModificado = true; });
});

document.getElementById('logo-preview').addEventListener('click', () => document.getElementById('logo-input').click());

document.getElementById('logo-input').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => { logoBase64 = ev.target.result; mostrarLogo(logoBase64); };
  reader.readAsDataURL(f);
});

function mostrarLogo(src) {
  document.getElementById('logo-preview').innerHTML = `<img src="${src}" alt="Logo">`;
}

document.getElementById('btn-guardar-centro').addEventListener('click', async () => {
  const btn = document.getElementById('btn-guardar-centro');
  btn.disabled = true;
  try {
    await apiFetch('/centro', { method: 'PUT', body: {
      nombre:        document.getElementById('c-nombre').value,
      codigo:        document.getElementById('c-codigo').value,
      año_academico: document.getElementById('c-anio').value,
      direccion:     document.getElementById('c-dir').value,
      telefono:      document.getElementById('c-tel').value,
      email:         document.getElementById('c-email').value,
      logo_base64:   logoBase64 || undefined,
    }});
    centroModificado = false;
    showMsg('centro-msg', 'Guardado correctamente', 'ok');
  } catch (err) { showMsg('centro-msg', err.message); }
  finally { btn.disabled = false; }
});

// ── Árbol SGC (F2) ────────────────────────────────────────────────────────────

const nodosExpandidos = new Set();

async function cargarArbol() {
  if (!usuario?.id_centro) return;
  try {
    arbolData = await apiFetch('/carpetas');
    renderArbol();
  } catch {}
}

function renderArbol() {
  const root = document.getElementById('arbol-root');
  const mapa = {};
  arbolData.forEach(n => { mapa[n.id] = { ...n, hijos: [] }; });
  const raices = [];
  arbolData.forEach(n => {
    if (n.parent_id && mapa[n.parent_id]) mapa[n.parent_id].hijos.push(mapa[n.id]);
    else raices.push(mapa[n.id]);
  });
  if (nodosExpandidos.size === 0) raices.forEach(n => expandirRecursivo(n));
  root.innerHTML = '';
  raices.forEach(n => root.appendChild(crearNodo(n)));
  initDropRootZone();
}

function expandirRecursivo(n) {
  nodosExpandidos.add(n.id);
  n.hijos?.forEach(h => expandirRecursivo(h));
}

function crearNodo(n) {
  const li  = document.createElement('li');
  li.className = 'tree-node';
  li.dataset.id = n.id;

  const expandido  = nodosExpandidos.has(n.id);
  const tieneHijos = n.hijos.length > 0;

  const row = document.createElement('div');
  row.className = 'tree-row';
  if (tieneRol('coordinador_calidad')) row.draggable = true;
  row.innerHTML = `
    <span class="tree-toggle" style="width:16px;text-align:center;font-size:.7rem;color:var(--mid);cursor:pointer;">
      ${tieneHijos ? (expandido ? '▾' : '▸') : ' '}
    </span>
    <span class="tree-icon">${tieneHijos ? '📂' : '📄'}</span>
    <span class="tree-name">${n.nombre}${n.codigo ? ` <span style="color:var(--mid);font-size:.72rem;">(${n.codigo})</span>` : ''}</span>
    ${tieneRol('coordinador_calidad') ? `<span class="tree-actions">
      <button class="tree-btn" onclick="abrirModalRenombrar(${n.id},'${n.nombre.replace(/'/g, "\\'")}')">✏</button>
      <button class="tree-btn" onclick="nuevaSubcarpeta(${n.id})">+</button>
      <button class="tree-btn" style="color:var(--error);" onclick="borrarCarpeta(${n.id})">✕</button>
    </span>` : ''}`;

  // Drag & drop para reordenar / mover carpetas
  if (tieneRol('coordinador_calidad')) {
    row.addEventListener('dragstart', e => {
      draggedCarpetaId = n.id;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => row.style.opacity = '.4', 0);
    });
    row.addEventListener('dragend', () => { row.style.opacity = ''; });
    row.addEventListener('dragover', e => {
      e.preventDefault();
      if (draggedCarpetaId !== n.id) row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', async e => {
      e.preventDefault();
      row.classList.remove('drag-over');
      if (draggedCarpetaId === null || draggedCarpetaId === n.id) return;
      await apiFetch(`/carpetas/${draggedCarpetaId}`, { method: 'PUT', body: { parent_id: n.id } }).catch(() => {});
      draggedCarpetaId = null;
      nodosExpandidos.add(n.id);
      cargarArbol();
    });
  }

  row.querySelector('.tree-toggle').addEventListener('click', e => {
    e.stopPropagation();
    if (!tieneHijos) return;
    if (nodosExpandidos.has(n.id)) nodosExpandidos.delete(n.id);
    else nodosExpandidos.add(n.id);
    renderArbol();
  });
  row.querySelector('.tree-name').addEventListener('click', () => {
    if (!tieneHijos) return;
    if (nodosExpandidos.has(n.id)) nodosExpandidos.delete(n.id);
    else nodosExpandidos.add(n.id);
    renderArbol();
  });

  li.appendChild(row);

  if (tieneHijos && expandido) {
    const ul = document.createElement('ul');
    ul.style.cssText = 'list-style:none;padding-left:20px;border-left:1px dashed var(--border);';
    n.hijos.forEach(h => ul.appendChild(crearNodo(h)));
    li.appendChild(ul);
  }
  return li;
}

// ── Drag & drop árbol ─────────────────────────────────────────────────────────

let draggedCarpetaId = null;

function initDropRootZone() {
  const zone = document.getElementById('drop-root-zone');
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', async e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (draggedCarpetaId === null) return;
    await apiFetch(`/carpetas/${draggedCarpetaId}`, { method: 'PUT', body: { parent_id: null } }).catch(() => {});
    draggedCarpetaId = null;
    cargarArbol();
  });
}

let carpetaPadreSeleccionada = null;

document.getElementById('btn-nueva-carpeta').addEventListener('click', () => {
  carpetaPadreSeleccionada = null;
  abrirModalCarpeta();
});
document.getElementById('btn-cancel-carpeta').addEventListener('click', cerrarModalCarpeta);
document.getElementById('btn-ok-carpeta').addEventListener('click', crearCarpeta);

function nuevaSubcarpeta(parentId) { carpetaPadreSeleccionada = parentId; abrirModalCarpeta(); }

function abrirModalCarpeta() {
  document.getElementById('nc-nombre').value = '';
  document.getElementById('nc-codigo').value = '';
  document.getElementById('modal-carpeta').style.display = 'flex';
  document.getElementById('nc-nombre').focus();
}
function cerrarModalCarpeta() {
  document.getElementById('modal-carpeta').style.display = 'none';
}

async function crearCarpeta() {
  const nombre = document.getElementById('nc-nombre').value.trim();
  const codigo = document.getElementById('nc-codigo').value.trim();
  if (!nombre) { document.getElementById('nc-nombre').focus(); return; }
  try {
    await apiFetch('/carpetas', { method: 'POST', body: { nombre, codigo, parent_id: carpetaPadreSeleccionada } });
    cerrarModalCarpeta();
    cargarArbol();
  } catch (err) { alert(err.message); }
}

document.getElementById('nc-nombre')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') crearCarpeta();
});

// Modal renombrar carpeta (reemplaza prompt nativo)
let renombrarId = null;

function abrirModalRenombrar(id, nombreActual) {
  renombrarId = id;
  document.getElementById('rn-nombre').value = nombreActual;
  document.getElementById('modal-renombrar').style.display = 'flex';
  document.getElementById('rn-nombre').focus();
}

document.getElementById('btn-cancel-renombrar').addEventListener('click', () => {
  document.getElementById('modal-renombrar').style.display = 'none';
});

document.getElementById('btn-ok-renombrar').addEventListener('click', async () => {
  const nuevo = document.getElementById('rn-nombre').value.trim();
  if (!nuevo) return;
  document.getElementById('modal-renombrar').style.display = 'none';
  await apiFetch(`/carpetas/${renombrarId}`, { method: 'PUT', body: { nombre: nuevo } });
  cargarArbol();
});

document.getElementById('rn-nombre')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-ok-renombrar').click();
});

async function borrarCarpeta(id) {
  if (!confirm('¿Eliminar esta carpeta y todas sus subcarpetas?')) return;
  await apiFetch(`/carpetas/${id}`, { method: 'DELETE' });
  nodosExpandidos.delete(id);
  cargarArbol();
}

document.getElementById('btn-reset-arbol').addEventListener('click', async () => {
  if (!confirm('¿Cargar el árbol SGC estándar? Se eliminará el árbol actual.')) return;
  const btn = document.getElementById('btn-reset-arbol');
  btn.disabled = true;
  btn.textContent = '⏳ Cargando…';
  try {
    await apiFetch('/carpetas/reset', { method: 'POST' });
    nodosExpandidos.clear();
    await cargarArbol();
  } catch (err) {
    alert(`Error al cargar la plantilla: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '↺ Cargar plantilla SGC';
  }
});

document.getElementById('btn-script-bash').addEventListener('click', () => window.open('/api/carpetas/script?tipo=bash', '_blank'));
document.getElementById('btn-script-ps').addEventListener('click',   () => window.open('/api/carpetas/script?tipo=ps',   '_blank'));

// ── Repositorio (F3) ──────────────────────────────────────────────────────────

// ── Ordenación de tabla de documentos ────────────────────────────────────────

let sortCol = 'updated_at';
let sortDir = -1;   // -1 = desc, 1 = asc
let docsCache = []; // última lista cargada, para re-ordenar sin petición

function ordenarDocs(docs) {
  return [...docs].sort((a, b) => {
    const va = a[sortCol] ?? '';
    const vb = b[sortCol] ?? '';
    return va < vb ? -sortDir : va > vb ? sortDir : 0;
  });
}

function actualizarCabeceras() {
  document.querySelectorAll('.doc-table th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.col === sortCol) th.classList.add(sortDir === 1 ? 'sort-asc' : 'sort-desc');
  });
}

document.querySelectorAll('.doc-table th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    if (sortCol === th.dataset.col) sortDir *= -1;
    else { sortCol = th.dataset.col; sortDir = 1; }
    actualizarCabeceras();
    renderDocs(ordenarDocs(docsCache));
  });
});

function renderDocs(docs) {
  const tbody = document.getElementById('doc-tbody');
  tbody.innerHTML = docs.length
    ? docs.map(d => `<tr>
        <td>
          <strong>${d.nombre}</strong>
          ${d.codigo ? `<br><span style="font-size:.74rem;color:var(--mid);font-family:'DM Mono',monospace;">${d.codigo}</span>` : ''}
        </td>
        <td>${d.tipo || '—'}</td>
        <td>
          <select class="estado-select" data-id="${d.id}" style="font-size:.78rem;padding:3px 6px;border-radius:6px;border:1px solid var(--border);background:var(--paper);cursor:pointer;">
            <option value="borrador"  ${d.estado==='borrador'  ? 'selected':''}>Borrador</option>
            <option value="vigente"   ${d.estado==='vigente'   ? 'selected':''}>Vigente</option>
            <option value="obsoleto"  ${d.estado==='obsoleto'  ? 'selected':''}>Obsoleto</option>
          </select>
        </td>
        <td>${d.version}</td>
        <td>${fmtFecha(d.updated_at)}</td>
        <td><div class="actions">
          <button class="btn btn-outline" style="padding:4px 10px;font-size:.78rem;" onclick="abrirPreview(${d.id},'${(d.nombre||'').replace(/'/g,"\\'")}','${d.extension||''}')">👁</button>
          <button class="btn btn-outline" style="padding:4px 10px;font-size:.78rem;" onclick="descargarDoc(${d.id})">⬇</button>
          <button class="btn btn-danger"  style="padding:4px 10px;font-size:.78rem;" onclick="eliminarDoc(${d.id})">✕</button>
        </div></td>
      </tr>`).join('')
    : '<tr><td colspan="6" style="color:var(--mid);text-align:center;padding:20px;">Sin documentos</td></tr>';

  tbody.querySelectorAll('.estado-select').forEach(sel => {
    sel.addEventListener('change', async e => {
      const id = e.target.dataset.id;
      try {
        await apiFetch(`/documentos/${id}`, { method: 'PUT', body: { estado: e.target.value } });
        docsCache = docsCache.map(d => d.id == id ? { ...d, estado: e.target.value } : d);
      } catch (err) { cargarDocumentos(); }
    });
  });
}

// ── Preview de documentos (PDF.js + mammoth + SheetJS) ───────────────────────

const EXT_IMG  = new Set(['jpg','jpeg','png','gif','webp','svg','bmp','ico']);
const EXT_PDF  = new Set(['pdf']);
const EXT_DOC  = new Set(['docx','doc']);
const EXT_XLS  = new Set(['xlsx','xls','ods']);
const EXT_TXT  = new Set(['txt','log','md','json','xml','html','htm','csv']);

let _pdfJsReady    = false;
let _mammothReady  = false;
let _xlsxReady     = false;
let _currentPdfDoc = null;
let _pdfScale      = 1.5;
let _pdfPage       = 1;

function _loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = url; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
async function _ensurePdfJs() {
  if (_pdfJsReady) return;
  await _loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  _pdfJsReady = true;
}
async function _ensureMammoth() {
  if (_mammothReady) return;
  await _loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
  _mammothReady = true;
}
async function _ensureXlsx() {
  if (_xlsxReady) return;
  await _loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  _xlsxReady = true;
}

async function abrirPreview(id, nombre, extension) {
  const ext  = (extension || '').toLowerCase();
  const url  = `/api/documentos/${id}/ver`;
  const wrap = document.getElementById('preview-frame-wrap');

  document.getElementById('preview-titulo').textContent = nombre + (ext ? `.${ext}` : '');
  document.getElementById('btn-preview-descargar').onclick = () =>
    window.open(`/api/documentos/${id}/descargar`, '_blank');
  document.getElementById('modal-preview').style.display = 'flex';
  wrap.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--mid);">Cargando…</div>`;

  try {
    if (EXT_PDF.has(ext)) {
      await _ensurePdfJs();
      _pdfScale = 1.5; _pdfPage = 1; _currentPdfDoc = null;
      wrap.innerHTML = `
        <div id="pdf-viewer" style="width:100%;height:100%;overflow-y:auto;background:#525659;padding:12px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;">
          <div id="pdf-pages" style="display:flex;flex-direction:column;align-items:center;gap:8px;width:100%;"></div>
          <div style="position:sticky;bottom:8px;display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.75);border-radius:20px;padding:6px 16px;margin-top:8px;">
            <button onclick="pdfPrevPage()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px;">◀</button>
            <span id="pdf-pageinfo" style="font-size:12px;color:#fff;white-space:nowrap">— / —</span>
            <button onclick="pdfNextPage()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px;">▶</button>
            <span style="color:#555;margin:0 4px;">|</span>
            <button onclick="pdfZoomOut()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:14px;">－</button>
            <span id="pdf-zoom-label" style="font-size:12px;color:#fff;min-width:40px;text-align:center;">100%</span>
            <button onclick="pdfZoomIn()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:14px;">＋</button>
          </div>
        </div>`;
      const res = await fetch(url, { credentials: 'include' });
      const buf = await res.arrayBuffer();
      _currentPdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
      await _renderPdfPages();

    } else if (EXT_IMG.has(ext)) {
      wrap.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:20px;background:#f5f5f5;">
        <img src="${url}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:4px;box-shadow:0 2px 16px rgba(0,0,0,.15);" onerror="this.parentElement.textContent='Error al cargar imagen'">
      </div>`;

    } else if (EXT_DOC.has(ext)) {
      await _ensureMammoth();
      const res = await fetch(url, { credentials: 'include' });
      const buf = await res.arrayBuffer();
      const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
      wrap.innerHTML = `<div style="width:100%;height:100%;overflow-y:auto;padding:28px 36px;background:#fff;color:#111;font-family:Georgia,serif;font-size:14px;line-height:1.75;box-sizing:border-box;">${value || '<p style="color:#999;">Documento vacío</p>'}</div>`;

    } else if (EXT_XLS.has(ext)) {
      await _ensureXlsx();
      const res = await fetch(url, { credentials: 'include' });
      const buf = await res.arrayBuffer();
      const wb  = XLSX.read(buf, { type: 'array' });
      wrap.style.overflow = 'hidden';
      wrap.style.display  = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.innerHTML = '';
      const tabs = document.createElement('div');
      tabs.style.cssText = 'display:flex;gap:4px;padding:8px 12px;background:var(--cream);border-bottom:1px solid var(--border);flex-wrap:wrap;flex-shrink:0;';
      const tableWrap = document.createElement('div');
      tableWrap.style.cssText = 'flex:1;overflow:auto;padding:12px;background:#fff;';
      wrap.appendChild(tabs);
      wrap.appendChild(tableWrap);
      wb.SheetNames.forEach((name, idx) => {
        const btn = document.createElement('button');
        btn.textContent = name;
        btn.style.cssText = `padding:4px 12px;border-radius:4px;border:1px solid var(--border);background:${idx===0?'var(--accent)':'var(--paper)'};color:${idx===0?'#fff':'var(--ink)'};font-size:11px;cursor:pointer;`;
        btn.onclick = () => {
          tabs.querySelectorAll('button').forEach(b => { b.style.background='var(--paper)'; b.style.color='var(--ink)'; });
          btn.style.background='var(--accent)'; btn.style.color='#fff';
          const html = XLSX.utils.sheet_to_html(wb.Sheets[name]);
          tableWrap.innerHTML = html.replace('<table>', '<table class="xlsx-table">');
        };
        tabs.appendChild(btn);
        if (idx === 0) {
          const html = XLSX.utils.sheet_to_html(wb.Sheets[name]);
          tableWrap.innerHTML = html.replace('<table>', '<table class="xlsx-table">');
        }
      });

    } else if (EXT_TXT.has(ext)) {
      wrap.innerHTML = `<iframe src="${url}" style="width:100%;height:100%;border:none;background:#fff;"></iframe>`;

    } else {
      _previewInfoCard(wrap, nombre, ext, url);
    }
  } catch (err) {
    _previewInfoCard(wrap, nombre, ext, url, err.message);
  }
}

function _previewInfoCard(wrap, nombre, ext, url, error) {
  const icons = { doc:'📘',docx:'📘',xls:'📗',xlsx:'📗',ppt:'📙',pptx:'📙',zip:'🗜',odt:'📄',ods:'📊',odp:'📊' };
  const types = { docx:'Word',doc:'Word',xlsx:'Excel',xls:'Excel',pptx:'PowerPoint',ppt:'PowerPoint',odt:'LibreOffice Writer',ods:'LibreOffice Calc' };
  wrap.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;padding:40px;text-align:center;color:var(--mid);">
    <div style="font-size:4rem;">${icons[ext] || '📄'}</div>
    <div style="font-size:.95rem;color:var(--ink);font-weight:600;">${nombre}.${ext}</div>
    <div style="font-size:.83rem;">${types[ext] || ext.toUpperCase()} — Vista previa no disponible</div>
    ${error ? `<div style="font-size:.78rem;color:var(--error);">${error}</div>` : ''}
    <button class="btn btn-outline" onclick="window.open('${url}','_blank')" style="font-size:.82rem;">↗ Abrir en nueva pestaña</button>
  </div>`;
}

async function _renderPdfPages() {
  const pagesDiv = document.getElementById('pdf-pages');
  if (!pagesDiv || !_currentPdfDoc) return;
  pagesDiv.innerHTML = '';
  const total = _currentPdfDoc.numPages;
  const w = (document.getElementById('pdf-viewer')?.clientWidth || 600) - 24;
  for (let i = 1; i <= total; i++) {
    const page = await _currentPdfDoc.getPage(i);
    const vp0  = page.getViewport({ scale: 1 });
    const sc   = Math.min(_pdfScale, (w / vp0.width) * _pdfScale);
    const vp   = page.getViewport({ scale: sc });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width; canvas.height = vp.height;
    canvas.id = `pdf-p${i}`;
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:10px;color:#aaa;margin-bottom:4px;text-align:center;';
    lbl.textContent = `Página ${i} / ${total}`;
    const wrap = document.createElement('div');
    wrap.appendChild(lbl); wrap.appendChild(canvas);
    pagesDiv.appendChild(wrap);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  }
  const pi = document.getElementById('pdf-pageinfo');
  const pz = document.getElementById('pdf-zoom-label');
  if (pi) pi.textContent = `${_pdfPage} / ${total}`;
  if (pz) pz.textContent = Math.round(_pdfScale / 1.5 * 100) + '%';
}

function pdfPrevPage() {
  if (_pdfPage <= 1) return;
  _pdfPage--;
  document.getElementById(`pdf-p${_pdfPage}`)?.scrollIntoView({ behavior:'smooth', block:'start' });
  const pi = document.getElementById('pdf-pageinfo');
  if (pi) pi.textContent = `${_pdfPage} / ${_currentPdfDoc?.numPages || '—'}`;
}
function pdfNextPage() {
  const total = _currentPdfDoc?.numPages || 0;
  if (_pdfPage >= total) return;
  _pdfPage++;
  document.getElementById(`pdf-p${_pdfPage}`)?.scrollIntoView({ behavior:'smooth', block:'start' });
  const pi = document.getElementById('pdf-pageinfo');
  if (pi) pi.textContent = `${_pdfPage} / ${total}`;
}
async function pdfZoomIn()  { _pdfScale = Math.min(_pdfScale + 0.5, 5);   await _renderPdfPages(); }
async function pdfZoomOut() { _pdfScale = Math.max(_pdfScale - 0.5, 0.5); await _renderPdfPages(); }

document.getElementById('btn-close-preview').addEventListener('click', () => {
  document.getElementById('modal-preview').style.display = 'none';
  const wrap = document.getElementById('preview-frame-wrap');
  wrap.innerHTML = '';
  wrap.style.display = '';
  wrap.style.flexDirection = '';
  wrap.style.overflow = '';
  _currentPdfDoc = null;
});

// Puebla el select de filtro por carpeta reutilizando arbolData en caché
function poblarFiltrosCarpeta() {
  const sel = document.getElementById('repo-filtro-carpeta');
  if (!sel) return;
  const nodos  = arbolData;
  const mapa   = {};
  nodos.forEach(n => { mapa[n.id] = { ...n, hijos: [] }; });
  const raices = [];
  nodos.forEach(n => {
    if (n.parent_id && mapa[n.parent_id]) mapa[n.parent_id].hijos.push(mapa[n.id]);
    else raices.push(mapa[n.id]);
  });
  const opciones = ['<option value="">— Todas las carpetas —</option>'];
  function addOpts(lista, nivel) {
    lista.forEach(n => {
      opciones.push(`<option value="${n.id}">${'  '.repeat(nivel)}${n.nombre}</option>`);
      addOpts(n.hijos, nivel + 1);
    });
  }
  addOpts(raices, 0);
  sel.innerHTML = opciones.join('');
}

async function cargarDocumentos(query = '') {
  const carpeta = document.getElementById('repo-filtro-carpeta')?.value;
  try {
    let docs;
    if (query) {
      docs = await apiFetch(`/documentos/buscar?q=${encodeURIComponent(query)}`);
    } else if (carpeta) {
      docs = await apiFetch(`/documentos?carpeta=${encodeURIComponent(carpeta)}`);
    } else {
      docs = await apiFetch('/documentos');
    }
    docsCache = docs;
    actualizarCabeceras();
    renderDocs(ordenarDocs(docsCache));
  } catch {}
}

document.getElementById('btn-buscar').addEventListener('click', () => {
  cargarDocumentos(document.getElementById('repo-buscar').value.trim());
});
document.getElementById('repo-buscar').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-buscar').click();
});

document.getElementById('btn-limpiar-buscar').addEventListener('click', () => {
  document.getElementById('repo-buscar').value = '';
  document.getElementById('repo-filtro-carpeta').value = '';
  cargarDocumentos();
});

document.getElementById('repo-filtro-carpeta')?.addEventListener('change', () => {
  document.getElementById('repo-buscar').value = '';
  cargarDocumentos();
});

function descargarDoc(id) { window.open(`/api/documentos/${id}/descargar`, '_blank'); }

async function eliminarDoc(id) {
  if (!confirm('¿Eliminar este documento? Esta acción no se puede deshacer.')) return;
  await apiFetch(`/documentos/${id}`, { method: 'DELETE' });
  cargarDocumentos();
}

// Upload modal
document.getElementById('btn-subir-doc').addEventListener('click', () => {
  uploadFile = null;
  document.getElementById('upload-fname').textContent = '';
  document.getElementById('up-nombre').value = '';
  document.getElementById('upload-msg').classList.remove('show');
  document.getElementById('modal-upload').style.display = 'flex';
  cargarCarpetasSelect('up-carpeta');
});
document.getElementById('btn-cancel-upload').addEventListener('click', () => {
  document.getElementById('modal-upload').style.display = 'none';
});

const uploadZone = document.getElementById('upload-zone');
uploadZone.addEventListener('click',     () => document.getElementById('upload-file').click());
uploadZone.addEventListener('dragover',  e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.classList.remove('dragover');
  const f = e.dataTransfer.files[0]; if (f) setUploadFile(f);
});
document.getElementById('upload-file').addEventListener('change', e => {
  if (e.target.files[0]) setUploadFile(e.target.files[0]);
});

let uploadFile = null;
function setUploadFile(f) {
  uploadFile = f;
  document.getElementById('upload-fname').textContent = `📎 ${f.name}`;
  if (!document.getElementById('up-nombre').value) {
    document.getElementById('up-nombre').value = f.name.replace(/\.[^.]+$/, '');
  }
}

document.getElementById('btn-ok-upload').addEventListener('click', async () => {
  if (!uploadFile) return showMsg('upload-msg', 'Selecciona un archivo primero');
  const btn = document.getElementById('btn-ok-upload');
  btn.disabled = true;
  btn.textContent = 'Subiendo…';
  try {
    const fd = new FormData();
    fd.append('archivo',  uploadFile);
    fd.append('nombre',   document.getElementById('up-nombre').value  || uploadFile.name);
    fd.append('codigo',   document.getElementById('up-codigo').value);
    fd.append('estado',   document.getElementById('up-estado').value);
    fd.append('tipo',     document.getElementById('up-tipo').value);
    const carpeta = document.getElementById('up-carpeta').value;
    if (carpeta) fd.append('id_carpeta', carpeta);
    await apiFetch('/documentos', { method: 'POST', body: fd });
    document.getElementById('modal-upload').style.display = 'none';
    uploadFile = null;
    cargarDocumentos();
  } catch (err) { showMsg('upload-msg', err.message); }
  finally { btn.disabled = false; btn.textContent = 'Subir'; }
});

// ── Generador IA (F4) ─────────────────────────────────────────────────────────

let analizarTimer = null;
let analizarAbort = null;

document.getElementById('gen-nombre').addEventListener('input', () => {
  clearTimeout(analizarTimer);
  if (analizarAbort) { analizarAbort.abort(); analizarAbort = null; }
  const nombre = document.getElementById('gen-nombre').value.trim();
  if (nombre.length < 3) {
    document.getElementById('gen-analisis').style.display = 'none';
    return;
  }
  analizarTimer = setTimeout(async () => {
    analizarAbort = new AbortController();
    try {
      const a = await fetch(`${API}/generador/analizar?nombre=${encodeURIComponent(nombre)}`, {
        credentials: 'include',
        signal: analizarAbort.signal,
      }).then(r => r.json());
      if (document.getElementById('gen-nombre').value.trim() === nombre) {
        document.getElementById('gen-analisis').style.display = 'block';
        document.getElementById('gen-chips').innerHTML =
          `<span class="gen-chip">Tipo: ${a.tipo}</span>` +
          (a.seccion ? `<span class="gen-chip">Sección: ${a.seccion}</span>` : '') +
          (a.descripcion ? `<span class="gen-chip">${a.descripcion}</span>` : '');
      }
    } catch (e) { if (e.name !== 'AbortError') console.warn('analizar error', e); }
  }, 400);
});

document.getElementById('btn-generar').addEventListener('click', async () => {
  const nombre = document.getElementById('gen-nombre').value.trim();
  if (!nombre) return showMsg('gen-msg', 'Introduce el nombre del documento');
  const btn = document.getElementById('btn-generar');
  btn.disabled = true;
  btn.textContent = '⏳ Generando…';
  document.getElementById('gen-result-panel').style.display = 'none';

  const abort   = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 90_000);

  try {
    const res = await fetch(`${API}/generador`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal: abort.signal,
      body: JSON.stringify({
        nombre,
        id_carpeta: document.getElementById('gen-carpeta').value || undefined,
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || 'Error al generar');
    }
    const r = await res.json();
    docIdGenerado = r.documento.id;
    document.getElementById('gen-result-meta').innerHTML =
      `<span class="gen-chip">Tipo: ${r.tipo}</span>` +
      (r.seccion ? `<span class="gen-chip">Sección ISO: ${r.seccion}</span>` : '') +
      `<span class="gen-chip">~${r.tokens_usados} tokens</span>` +
      `<span class="gen-chip badge badge-borrador">Guardado como borrador</span>`;
    document.getElementById('gen-result-text').textContent = r.preview;
    document.getElementById('gen-result-panel').style.display = 'block';
    showMsg('gen-msg', '✓ Documento generado y guardado como borrador', 'ok');
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') showMsg('gen-msg', 'Tiempo de espera agotado (90 s). Inténtalo de nuevo.');
    else showMsg('gen-msg', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '✦ Generar con IA';
  }
});

document.getElementById('btn-gen-descargar').addEventListener('click', () => {
  if (docIdGenerado) window.open(`/api/documentos/${docIdGenerado}/descargar`, '_blank');
});
document.getElementById('btn-gen-nuevo').addEventListener('click', () => {
  document.getElementById('gen-nombre').value = '';
  document.getElementById('gen-result-panel').style.display = 'none';
  document.getElementById('gen-analisis').style.display = 'none';
  docIdGenerado = null;
});

// ── Admin F5 ──────────────────────────────────────────────────────────────────

async function cargarAdmin() {
  try {
    cargarAlmacenamiento();
    const data = await apiFetch('/admin/stats');
    document.getElementById('admin-stats').innerHTML =
      stat(data.centros, 'Centros') + stat(data.usuarios, 'Usuarios') +
      stat(data.documentos, 'Documentos') + stat(data.generadosIA, 'Generados IA') +
      stat(data.vigentes, 'Vigentes') + stat(data.borradores, 'Borradores');

    document.getElementById('centros-tbody').innerHTML = data.porCentro.length
      ? data.porCentro.map(c => `<tr data-id="${c.id}" data-nombre="${c.nombre}">
          <td><strong>${c.nombre}</strong></td>
          <td style="font-family:'DM Mono',monospace;font-size:.82rem;">${c.codigo}</td>
          <td>${c.num_usuarios}</td>
          <td>${c.num_documentos}</td>
          <td>${c.num_carpetas}</td>
        </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--mid);padding:16px;">Sin centros aún</td></tr>';

    // Clic en fila de centro → muestra usuarios
    document.querySelectorAll('#centros-tbody tr[data-id]').forEach(tr => {
      tr.addEventListener('click', () => {
        const id     = parseInt(tr.dataset.id, 10);
        const nombre = tr.dataset.nombre;
        document.querySelectorAll('#centros-tbody tr').forEach(r => r.classList.remove('selected'));
        if (centroSeleccionadoAdmin === id) {
          centroSeleccionadoAdmin = null;
          document.getElementById('panel-usuarios-centro').style.display = 'none';
        } else {
          tr.classList.add('selected');
          centroSeleccionadoAdmin = id;
          cargarUsuariosCentro(id, nombre);
        }
      });
    });

    // Si había un centro seleccionado, refresca su lista
    if (centroSeleccionadoAdmin) {
      const tr = document.querySelector(`#centros-tbody tr[data-id="${centroSeleccionadoAdmin}"]`);
      if (tr) { tr.classList.add('selected'); cargarUsuariosCentro(centroSeleccionadoAdmin, tr.dataset.nombre); }
    }
  } catch {}
}

async function cargarAlmacenamiento() {
  const el = document.getElementById('almacenamiento-body');
  if (!el) return;
  try {
    const s = await apiFetch('/admin/sistema');
    const esAnfitrion = s.almacenamiento.modo === 'carpeta_anfitrion';
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <span style="font-size:1.4rem;">${esAnfitrion ? '🖥️' : '🐳'}</span>
        <div>
          <div style="font-weight:600;font-size:.92rem;">
            ${esAnfitrion ? 'Carpeta del sistema anfitrión' : 'Volumen Docker interno'}
          </div>
          <div style="font-family:'DM Mono',monospace;font-size:.8rem;color:var(--mid);margin-top:2px;">
            ${esAnfitrion
              ? `<span style="color:var(--success);">Host:</span> ${s.almacenamiento.ruta_host}&nbsp;&nbsp;→&nbsp;&nbsp;Contenedor: ${s.almacenamiento.ruta_contenedor}`
              : `Volumen: <strong>${s.almacenamiento.nombre_volumen}</strong>&nbsp;&nbsp;→&nbsp;&nbsp;${s.almacenamiento.ruta_contenedor}`}
          </div>
        </div>
        <div style="margin-left:auto;">
          <button class="btn btn-outline" style="font-size:.78rem;" onclick="document.getElementById('ayuda-almacenamiento').style.display=document.getElementById('ayuda-almacenamiento').style.display==='none'?'block':'none'">
            ⚙ Cambiar carpeta
          </button>
        </div>
      </div>
      <div id="ayuda-almacenamiento" style="display:none;margin-top:16px;background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:16px;font-size:.84rem;">
        <p style="margin-bottom:10px;">Para enlazar los archivos a una carpeta de tu PC, edita el archivo <code style="background:#fff;padding:2px 5px;border-radius:4px;">.env</code> y establece:</p>
        <pre style="background:#fff;border:1px solid var(--border);border-radius:6px;padding:10px;font-size:.78rem;overflow-x:auto;">HOST_DOCS_PATH=C:/CaliDocs/datos       # Windows
HOST_DOCS_PATH=/home/usuario/calidocs  # Linux / Mac</pre>
        <p style="margin-top:10px;">Después reinicia el sistema:</p>
        <pre style="background:#fff;border:1px solid var(--border);border-radius:6px;padding:10px;font-size:.78rem;">docker compose down
docker compose up -d --build</pre>
        <p style="margin-top:10px;color:var(--mid);">⚠ La carpeta debe existir en el PC antes de arrancar. Los datos del volumen anterior <strong>no se migran</strong> automáticamente.</p>
      </div>`;
  } catch {
    el.innerHTML = '<p style="color:var(--mid);font-size:.88rem;">No se pudo cargar la información de almacenamiento.</p>';
  }
}

async function cargarUsuariosCentro(id, nombre) {
  document.getElementById('panel-usuarios-centro').style.display = 'block';
  document.getElementById('panel-usuarios-titulo').innerHTML =
    `👥 Usuarios de <strong>${nombre}</strong>
     <button class="btn-sm" id="btn-nuevo-usuario" style="margin-left:auto;" onclick="abrirModalUsuario(${id})">+ Nuevo usuario</button>`;

  try {
    const usuarios = await apiFetch(`/admin/centros/${id}/usuarios`);
    document.getElementById('usuarios-tbody').innerHTML = usuarios.length
      ? usuarios.map(u => `<tr>
          <td>${u.nombre}</td>
          <td style="font-family:'DM Mono',monospace;font-size:.82rem;">${u.email}</td>
          <td><span class="badge badge-${u.rol === 'admin_centro' ? 'vigente' : u.rol === 'docente' ? 'borrador' : 'obsoleto'}" style="font-size:.72rem;">${u.rol}</span></td>
          <td>${u.activo ? '<span style="color:var(--success);">Activo</span>' : '<span style="color:var(--mid);">Inactivo</span>'}</td>
          <td><div class="actions">
            <button class="btn btn-outline" style="padding:3px 8px;font-size:.75rem;" onclick="toggleUsuario(${u.id}, ${id}, '${nombre}')">
              ${u.activo ? 'Desactivar' : 'Activar'}
            </button>
            <button class="btn btn-danger" style="padding:3px 8px;font-size:.75rem;" onclick="eliminarUsuario(${u.id}, ${id}, '${nombre}')">✕</button>
          </div></td>
        </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--mid);padding:12px;">Sin usuarios</td></tr>';
  } catch {}
}

async function toggleUsuario(uid, centroId, centroNombre) {
  await apiFetch(`/admin/usuarios/${uid}/toggle`, { method: 'PUT' }).catch(() => {});
  cargarUsuariosCentro(centroId, centroNombre);
}

async function eliminarUsuario(uid, centroId, centroNombre) {
  if (!confirm('¿Eliminar este usuario?')) return;
  await apiFetch(`/admin/usuarios/${uid}`, { method: 'DELETE' }).catch(() => {});
  cargarUsuariosCentro(centroId, centroNombre);
}

// Modal nuevo centro
document.getElementById('btn-nuevo-centro').addEventListener('click', () => {
  ['nc2-nombre','nc2-codigo','nc2-email','nc2-anio','nc2-admin-nombre','nc2-admin-email','nc2-admin-pass']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('nc-msg')?.classList.remove('show');
  document.getElementById('modal-centro').style.display = 'flex';
});
document.getElementById('btn-cancel-centro').addEventListener('click', () => {
  document.getElementById('modal-centro').style.display = 'none';
});

document.getElementById('btn-ok-centro').addEventListener('click', async () => {
  const nombre = document.getElementById('nc2-nombre').value.trim();
  const codigo = document.getElementById('nc2-codigo').value.trim();
  if (!nombre || !codigo) return showMsg('nc-msg', 'Nombre y código son obligatorios');

  const btn = document.getElementById('btn-ok-centro');
  btn.disabled = true;
  try {
    const centro = await apiFetch('/admin/centros', { method: 'POST', body: {
      nombre,
      codigo,
      email:         document.getElementById('nc2-email').value,
      año_academico: document.getElementById('nc2-anio').value,
    }});

    const adminNombre = document.getElementById('nc2-admin-nombre').value.trim();
    const adminEmail  = document.getElementById('nc2-admin-email').value.trim();
    const adminPass   = document.getElementById('nc2-admin-pass').value;
    if (adminNombre && adminEmail && adminPass) {
      await apiFetch(`/admin/centros/${centro.id}/usuarios`, { method: 'POST', body: {
        nombre: adminNombre, email: adminEmail, password: adminPass, rol: 'admin_centro',
      }});
    }
    document.getElementById('modal-centro').style.display = 'none';
    cargarAdmin();
  } catch (err) { showMsg('nc-msg', err.message); }
  finally { btn.disabled = false; }
});

// Modal nuevo usuario desde panel de centro
function abrirModalUsuario(centroId) {
  ['nu-nombre','nu-email','nu-pass'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('nu-msg')?.classList.remove('show');
  document.getElementById('modal-usuario').dataset.centroId = centroId;
  document.getElementById('modal-usuario').style.display = 'flex';
}

document.getElementById('btn-cancel-usuario').addEventListener('click', () => {
  document.getElementById('modal-usuario').style.display = 'none';
});

document.getElementById('btn-ok-usuario').addEventListener('click', async () => {
  const centroId = document.getElementById('modal-usuario').dataset.centroId;
  const nombre   = document.getElementById('nu-nombre').value.trim();
  const email    = document.getElementById('nu-email').value.trim();
  const pass     = document.getElementById('nu-pass').value;
  const rol      = document.getElementById('nu-rol').value;
  if (!nombre || !email || !pass) return showMsg('nu-msg', 'Nombre, email y contraseña son obligatorios');

  const btn = document.getElementById('btn-ok-usuario');
  btn.disabled = true;
  try {
    await apiFetch(`/admin/centros/${centroId}/usuarios`, { method: 'POST', body: { nombre, email, password: pass, rol } });
    document.getElementById('modal-usuario').style.display = 'none';
    const tr = document.querySelector(`#centros-tbody tr[data-id="${centroId}"]`);
    cargarUsuariosCentro(parseInt(centroId, 10), tr?.dataset.nombre || '');
  } catch (err) { showMsg('nu-msg', err.message); }
  finally { btn.disabled = false; }
});

// ── Helpers compartidos ───────────────────────────────────────────────────────

// Usa arbolData en caché si ya está cargado; si no, lo pide
async function cargarCarpetasSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel || !usuario?.id_centro) return;
  try {
    const nodos = arbolData.length ? arbolData : await apiFetch('/carpetas');
    const mapa  = {};
    nodos.forEach(n => { mapa[n.id] = { ...n, hijos: [] }; });
    const raices = [];
    nodos.forEach(n => {
      if (n.parent_id && mapa[n.parent_id]) mapa[n.parent_id].hijos.push(mapa[n.id]);
      else raices.push(mapa[n.id]);
    });
    const opciones = ['<option value="">— Sin carpeta —</option>'];
    function addOpts(lista, nivel) {
      lista.forEach(n => {
        opciones.push(`<option value="${n.id}">${'  '.repeat(nivel)}${n.nombre}</option>`);
        addOpts(n.hijos, nivel + 1);
      });
    }
    addOpts(raices, 0);
    sel.innerHTML = opciones.join('');
  } catch {}
}

// ── Expandir / Plegar árbol ───────────────────────────────────────────────────

document.getElementById('btn-expandir-todo')?.addEventListener('click', () => {
  arbolData.forEach(n => nodosExpandidos.add(n.id));
  renderArbol();
});

document.getElementById('btn-plegar-todo')?.addEventListener('click', () => {
  nodosExpandidos.clear();
  renderArbol();
});

// ── Modal Codificar ───────────────────────────────────────────────────────────

document.getElementById('btn-codificar')?.addEventListener('click', () => {
  ['cod-tipo','cod-seccion','cod-subseccion','cod-seq','cod-desc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('cod-current-name').textContent = '(nuevo nombre)';
  document.getElementById('cod-preview-val').textContent = '—';
  document.getElementById('modal-codificar').style.display = 'flex';
});

function actualizarCodigo() {
  const tipo   = document.getElementById('cod-tipo').value;
  const sec    = document.getElementById('cod-seccion').value.trim();
  const sub    = document.getElementById('cod-subseccion').value.trim();
  const seq    = document.getElementById('cod-seq').value.trim();
  const desc   = document.getElementById('cod-desc').value.trim().replace(/\s+/g,'_');

  let partes = [];
  if (tipo) partes.push(tipo);
  if (sec)  partes.push(sec);
  if (sub)  partes.push(sub);
  if (seq)  partes.push(seq.padStart(2,'0'));

  let codigo = partes.join('-');
  if (desc) codigo = codigo ? `${codigo}_${desc}` : desc;

  document.getElementById('cod-preview-val').textContent = codigo || '—';
}

document.getElementById('btn-aplicar-codigo')?.addEventListener('click', () => {
  const val = document.getElementById('cod-preview-val').textContent;
  if (!val || val === '—') return;
  navigator.clipboard?.writeText(val).catch(() => {});
  document.getElementById('cod-current-name').textContent = `✓ Copiado: ${val}`;
  setTimeout(() => {
    document.getElementById('modal-codificar').style.display = 'none';
  }, 900);
});

// ── Modal Crear Documento (sin IA) ────────────────────────────────────────────

document.getElementById('btn-crear-doc')?.addEventListener('click', () => {
  ['crear-nombre','crear-codigo','crear-modulo','crear-ciclo','crear-contenido'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('crear-msg')?.classList.remove('show');
  cargarCarpetasSelect('crear-carpeta');
  document.getElementById('modal-crear').style.display = 'flex';
});

document.getElementById('btn-cancel-crear')?.addEventListener('click', () => {
  document.getElementById('modal-crear').style.display = 'none';
});

document.getElementById('btn-ok-crear')?.addEventListener('click', async () => {
  const nombre = document.getElementById('crear-nombre').value.trim();
  if (!nombre) return showMsg('crear-msg', 'El nombre es obligatorio');

  const btn = document.getElementById('btn-ok-crear');
  btn.disabled = true;
  btn.textContent = '⏳ Generando…';

  try {
    const doc = await apiFetch('/documentos/crear', {
      method: 'POST',
      body: {
        nombre,
        codigo:    document.getElementById('crear-codigo').value.trim() || undefined,
        tipo:      document.getElementById('crear-tipo').value || undefined,
        estado:    document.getElementById('crear-estado').value,
        id_carpeta: document.getElementById('crear-carpeta').value || undefined,
        modulo:    document.getElementById('crear-modulo').value.trim() || undefined,
        ciclo:     document.getElementById('crear-ciclo').value.trim()  || undefined,
        contenido: document.getElementById('crear-contenido').value,
      },
    });
    document.getElementById('modal-crear').style.display = 'none';
    cargarDocumentos();
  } catch (err) { showMsg('crear-msg', err.message); }
  finally { btn.disabled = false; btn.textContent = '📄 Generar DOCX'; }
});

// ── Arranque ──────────────────────────────────────────────────────────────────
checkSession();
