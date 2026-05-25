/* ── CaliDocs SPA — app.js ── */

const API = '/api';
let usuario = null;
let arbolData = [];
let docIdGenerado = null;

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
  setTimeout(() => el.classList.remove('show'), 4000);
}

function fmtFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES');
}

// ── Navegación ────────────────────────────────────────────────────────────────

function showSec(id) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sec-' + id)?.classList.add('active');
  document.querySelector(`.nav-item[data-sec="${id}"]`)?.classList.add('active');
  // Carga de datos por módulo
  if (id === 'dashboard')  cargarDashboard();
  if (id === 'centro')     cargarCentro();
  if (id === 'carpetas')   cargarArbol();
  if (id === 'repositorio') { cargarDocumentos(); cargarCarpetasSelect('up-carpeta'); }
  if (id === 'generador')  cargarCarpetasSelect('gen-carpeta');
  if (id === 'admin')      cargarAdmin();
}

document.querySelectorAll('.nav-item[data-sec]').forEach(btn => {
  btn.addEventListener('click', () => showSec(btn.dataset.sec));
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
    } else {
      const docs = await apiFetch('/documentos').catch(() => []);
      const vig  = docs.filter(d => d.estado === 'vigente').length;
      const bor  = docs.filter(d => d.estado === 'borrador').length;
      subEl.textContent = `Centro: ${usuario.nombre}`;
      statsEl.innerHTML = stat(docs.length, 'Documentos') + stat(vig, 'Vigentes')
        + stat(bor, 'Borradores');
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
  } catch {}
}

document.getElementById('logo-preview').addEventListener('click', () => document.getElementById('logo-input').click());
document.getElementById('logo-input').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  new FileReader().onload = ev => { logoBase64 = ev.target.result; mostrarLogo(logoBase64); };
  new FileReader().readAsDataURL(f);
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
      nombre: document.getElementById('c-nombre').value,
      codigo: document.getElementById('c-codigo').value,
      año_academico: document.getElementById('c-anio').value,
      direccion: document.getElementById('c-dir').value,
      telefono: document.getElementById('c-tel').value,
      email: document.getElementById('c-email').value,
      logo_base64: logoBase64 || undefined,
    }});
    showMsg('centro-msg', 'Guardado correctamente', 'ok');
  } catch (err) { showMsg('centro-msg', err.message); }
  finally { btn.disabled = false; }
});

// ── Árbol SGC (F2) ────────────────────────────────────────────────────────────

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
  root.innerHTML = '';
  raices.forEach(n => root.appendChild(crearNodo(n)));
}

function crearNodo(n) {
  const li = document.createElement('li');
  li.className = 'tree-node';
  li.dataset.id = n.id;

  const row = document.createElement('div');
  row.className = 'tree-row';
  row.innerHTML = `
    <span class="tree-icon">${n.hijos.length ? '📂' : '📁'}</span>
    <span class="tree-name">${n.nombre}${n.codigo ? ` <span style="color:var(--mid);font-size:.75rem;">(${n.codigo})</span>` : ''}</span>
    <span class="tree-actions">
      <button class="tree-btn" onclick="renombrarCarpeta(${n.id},'${n.nombre.replace(/'/g, "\\'")}')">✏</button>
      <button class="tree-btn" onclick="nuevaSubcarpeta(${n.id})">+</button>
      <button class="tree-btn" style="color:var(--error);" onclick="borrarCarpeta(${n.id})">✕</button>
    </span>`;
  li.appendChild(row);

  if (n.hijos.length) {
    const ul = document.createElement('ul');
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
document.getElementById('btn-cancel-carpeta').addEventListener('click', () => cerrarModalCarpeta());
document.getElementById('btn-ok-carpeta').addEventListener('click', () => crearCarpeta());

function nuevaSubcarpeta(parentId) {
  carpetaPadreSeleccionada = parentId;
  abrirModalCarpeta();
}

function abrirModalCarpeta() {
  document.getElementById('nc-nombre').value = '';
  document.getElementById('nc-codigo').value = '';
  const m = document.getElementById('modal-carpeta');
  m.style.display = 'flex';
}
function cerrarModalCarpeta() {
  document.getElementById('modal-carpeta').style.display = 'none';
}

async function crearCarpeta() {
  const nombre = document.getElementById('nc-nombre').value.trim();
  const codigo = document.getElementById('nc-codigo').value.trim();
  if (!nombre) return;
  try {
    await apiFetch('/carpetas', { method: 'POST', body: { nombre, codigo, parent_id: carpetaPadreSeleccionada } });
    cerrarModalCarpeta();
    cargarArbol();
  } catch (err) { alert(err.message); }
}

async function renombrarCarpeta(id, nombre) {
  const nuevo = prompt('Nuevo nombre:', nombre);
  if (!nuevo || nuevo === nombre) return;
  await apiFetch(`/carpetas/${id}`, { method: 'PUT', body: { nombre: nuevo } });
  cargarArbol();
}

async function borrarCarpeta(id) {
  if (!confirm('¿Eliminar esta carpeta y todas sus subcarpetas?')) return;
  await apiFetch(`/carpetas/${id}`, { method: 'DELETE' });
  cargarArbol();
}

document.getElementById('btn-reset-arbol').addEventListener('click', async () => {
  if (!confirm('¿Cargar el árbol SGC estándar? Esto eliminará el árbol actual.')) return;
  await apiFetch('/carpetas/reset', { method: 'POST' });
  cargarArbol();
});

document.getElementById('btn-script-bash').addEventListener('click', () => {
  window.open('/api/carpetas/script?tipo=bash', '_blank');
});
document.getElementById('btn-script-ps').addEventListener('click', () => {
  window.open('/api/carpetas/script?tipo=ps', '_blank');
});

// ── Repositorio (F3) ──────────────────────────────────────────────────────────

async function cargarDocumentos(query = '') {
  const tbody = document.getElementById('doc-tbody');
  try {
    const docs = query
      ? await apiFetch(`/documentos/buscar?q=${encodeURIComponent(query)}`)
      : await apiFetch('/documentos');
    tbody.innerHTML = docs.length
      ? docs.map(d => `<tr>
          <td><strong>${d.nombre}</strong>${d.codigo ? `<br><span style="font-size:.75rem;color:var(--mid);font-family:'DM Mono',monospace;">${d.codigo}</span>` : ''}</td>
          <td>${d.tipo || '—'}</td>
          <td><span class="badge badge-${d.estado}">${d.estado}</span></td>
          <td>${d.version}</td>
          <td>${fmtFecha(d.updated_at)}</td>
          <td><div class="actions">
            <button class="btn btn-outline" style="padding:4px 10px;font-size:.78rem;" onclick="descargarDoc(${d.id})">⬇</button>
            <button class="btn btn-danger" style="padding:4px 10px;font-size:.78rem;" onclick="eliminarDoc(${d.id})">✕</button>
          </div></td>
        </tr>`).join('')
      : '<tr><td colspan="6" style="color:var(--mid);text-align:center;padding:20px;">Sin documentos</td></tr>';
  } catch {}
}

document.getElementById('btn-buscar').addEventListener('click', () => {
  cargarDocumentos(document.getElementById('repo-buscar').value);
});
document.getElementById('repo-buscar').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-buscar').click();
});

function descargarDoc(id) { window.open(`/api/documentos/${id}/descargar`, '_blank'); }

async function eliminarDoc(id) {
  if (!confirm('¿Eliminar este documento?')) return;
  await apiFetch(`/documentos/${id}`, { method: 'DELETE' });
  cargarDocumentos();
}

// Upload modal
document.getElementById('btn-subir-doc').addEventListener('click', () => {
  document.getElementById('modal-upload').style.display = 'flex';
});
document.getElementById('btn-cancel-upload').addEventListener('click', () => {
  document.getElementById('modal-upload').style.display = 'none';
});

const uploadZone = document.getElementById('upload-zone');
uploadZone.addEventListener('click', () => document.getElementById('upload-file').click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.classList.remove('dragover');
  const f = e.dataTransfer.files[0];
  if (f) setUploadFile(f);
});
document.getElementById('upload-file').addEventListener('change', e => {
  if (e.target.files[0]) setUploadFile(e.target.files[0]);
});

let uploadFile = null;
function setUploadFile(f) {
  uploadFile = f;
  document.getElementById('upload-fname').textContent = f.name;
  if (!document.getElementById('up-nombre').value) {
    document.getElementById('up-nombre').value = f.name.replace(/\.[^.]+$/, '');
  }
}

document.getElementById('btn-ok-upload').addEventListener('click', async () => {
  if (!uploadFile) return showMsg('upload-msg', 'Selecciona un archivo primero');
  const btn = document.getElementById('btn-ok-upload');
  btn.disabled = true;
  try {
    const fd = new FormData();
    fd.append('archivo', uploadFile);
    fd.append('nombre',  document.getElementById('up-nombre').value || uploadFile.name);
    fd.append('codigo',  document.getElementById('up-codigo').value);
    fd.append('estado',  document.getElementById('up-estado').value);
    const carpeta = document.getElementById('up-carpeta').value;
    if (carpeta) fd.append('id_carpeta', carpeta);
    await apiFetch('/documentos', { method: 'POST', body: fd });
    document.getElementById('modal-upload').style.display = 'none';
    uploadFile = null;
    cargarDocumentos();
  } catch (err) { showMsg('upload-msg', err.message); }
  finally { btn.disabled = false; }
});

// ── Generador IA (F4) ─────────────────────────────────────────────────────────

document.getElementById('gen-nombre').addEventListener('input', async () => {
  const nombre = document.getElementById('gen-nombre').value.trim();
  if (nombre.length < 3) { document.getElementById('gen-analisis').style.display = 'none'; return; }
  try {
    const a = await apiFetch(`/generador/analizar?nombre=${encodeURIComponent(nombre)}`);
    document.getElementById('gen-analisis').style.display = 'block';
    document.getElementById('gen-chips').innerHTML =
      `<span class="gen-chip">Tipo: ${a.tipo}</span>` +
      (a.seccion ? `<span class="gen-chip">Sección: ${a.seccion}</span>` : '') +
      `<span class="gen-chip">${a.descripcion || ''}</span>`;
  } catch {}
});

document.getElementById('btn-generar').addEventListener('click', async () => {
  const nombre = document.getElementById('gen-nombre').value.trim();
  if (!nombre) return showMsg('gen-msg', 'Introduce el nombre del documento');
  const btn = document.getElementById('btn-generar');
  btn.disabled = true;
  btn.textContent = '⏳ Generando…';
  document.getElementById('gen-result-panel').style.display = 'none';
  try {
    const r = await apiFetch('/generador', { method: 'POST', body: {
      nombre,
      id_carpeta: document.getElementById('gen-carpeta').value || undefined,
    }});
    docIdGenerado = r.documento.id;
    document.getElementById('gen-result-meta').innerHTML =
      `<span class="gen-chip">Tipo: ${r.tipo}</span>` +
      (r.seccion ? `<span class="gen-chip">Sección: ${r.seccion}</span>` : '') +
      `<span class="gen-chip">~${r.tokens_usados} tokens</span>` +
      `<span class="gen-chip badge badge-borrador">Guardado como borrador</span>`;
    document.getElementById('gen-result-text').textContent = r.preview;
    document.getElementById('gen-result-panel').style.display = 'block';
    showMsg('gen-msg', '✓ Documento generado y guardado como borrador', 'ok');
  } catch (err) { showMsg('gen-msg', err.message); }
  finally { btn.disabled = false; btn.textContent = '✦ Generar con IA'; }
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
    document.getElementById('centros-tbody').innerHTML = data.porCentro.map(c =>
      `<tr>
        <td><strong>${c.nombre}</strong></td>
        <td style="font-family:'DM Mono',monospace;font-size:.82rem;">${c.codigo}</td>
        <td>${c.num_usuarios}</td>
        <td>${c.num_documentos}</td>
        <td>${c.num_carpetas}</td>
      </tr>`
    ).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--mid);">Sin centros</td></tr>';
  } catch {}
}

document.getElementById('btn-nuevo-centro').addEventListener('click', () => {
  document.getElementById('modal-centro').style.display = 'flex';
});
document.getElementById('btn-cancel-centro').addEventListener('click', () => {
  document.getElementById('modal-centro').style.display = 'none';
});

document.getElementById('btn-ok-centro').addEventListener('click', async () => {
  const btn = document.getElementById('btn-ok-centro');
  btn.disabled = true;
  try {
    const centro = await apiFetch('/admin/centros', { method: 'POST', body: {
      nombre: document.getElementById('nc2-nombre').value,
      codigo: document.getElementById('nc2-codigo').value,
      email:  document.getElementById('nc2-email').value,
      año_academico: document.getElementById('nc2-anio').value,
    }});
    const adminNombre = document.getElementById('nc2-admin-nombre').value;
    const adminEmail  = document.getElementById('nc2-admin-email').value;
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

// ── Helpers compartidos ───────────────────────────────────────────────────────

async function cargarCarpetasSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel || !usuario?.id_centro) return;
  try {
    const nodos = await apiFetch('/carpetas');
    const mapa = {};
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
