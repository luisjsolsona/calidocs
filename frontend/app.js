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

const MODALES = ['modal-carpeta', 'modal-renombrar', 'modal-upload', 'modal-centro', 'modal-usuario'];

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

function onLogin() {
  document.getElementById('sec-login').style.display = 'none';
  document.getElementById('app-header').style.display = 'flex';
  document.getElementById('app-body').style.display = 'flex';
  document.getElementById('nav-usuario').textContent = `${usuario.nombre} · ${usuario.rol}`;
  if (usuario.rol === 'superadmin') {
    document.getElementById('nav-admin').style.display = 'flex';
    document.getElementById('nav-admin-section').style.display = 'block';
  }
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
  row.innerHTML = `
    <span class="tree-toggle" style="width:16px;text-align:center;font-size:.7rem;color:var(--mid);cursor:pointer;">
      ${tieneHijos ? (expandido ? '▾' : '▸') : ' '}
    </span>
    <span class="tree-icon">${tieneHijos ? '📂' : '📄'}</span>
    <span class="tree-name">${n.nombre}${n.codigo ? ` <span style="color:var(--mid);font-size:.72rem;">(${n.codigo})</span>` : ''}</span>
    <span class="tree-actions">
      <button class="tree-btn" onclick="abrirModalRenombrar(${n.id},'${n.nombre.replace(/'/g, "\\'")}')">✏</button>
      <button class="tree-btn" onclick="nuevaSubcarpeta(${n.id})">+</button>
      <button class="tree-btn" style="color:var(--error);" onclick="borrarCarpeta(${n.id})">✕</button>
    </span>`;

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
  await apiFetch('/carpetas/reset', { method: 'POST' });
  nodosExpandidos.clear();
  cargarArbol();
});

document.getElementById('btn-script-bash').addEventListener('click', () => window.open('/api/carpetas/script?tipo=bash', '_blank'));
document.getElementById('btn-script-ps').addEventListener('click',   () => window.open('/api/carpetas/script?tipo=ps',   '_blank'));

// ── Repositorio (F3) ──────────────────────────────────────────────────────────

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
  const tbody    = document.getElementById('doc-tbody');
  const carpeta  = document.getElementById('repo-filtro-carpeta')?.value;
  try {
    let docs;
    if (query) {
      docs = await apiFetch(`/documentos/buscar?q=${encodeURIComponent(query)}`);
    } else if (carpeta) {
      docs = await apiFetch(`/documentos?carpeta=${encodeURIComponent(carpeta)}`);
    } else {
      docs = await apiFetch('/documentos');
    }
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
            <button class="btn btn-outline" style="padding:4px 10px;font-size:.78rem;" onclick="descargarDoc(${d.id})">⬇</button>
            <button class="btn btn-danger"  style="padding:4px 10px;font-size:.78rem;" onclick="eliminarDoc(${d.id})">✕</button>
          </div></td>
        </tr>`).join('')
      : '<tr><td colspan="6" style="color:var(--mid);text-align:center;padding:20px;">Sin documentos</td></tr>';

    // Escucha cambios de estado en los selects recién creados
    tbody.querySelectorAll('.estado-select').forEach(sel => {
      sel.addEventListener('change', async e => {
        const id     = e.target.dataset.id;
        const estado = e.target.value;
        try {
          await apiFetch(`/documentos/${id}`, { method: 'PUT', body: { estado } });
        } catch (err) { showMsg('', err.message); cargarDocumentos(query); }
      });
    });
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

// ── Arranque ──────────────────────────────────────────────────────────────────
checkSession();
