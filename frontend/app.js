/* ── CaliDocs — Frontend F1 ── */

const API = '/api';

// ── Utilidades ────────────────────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',   // envía la cookie httpOnly
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Error'), { status: res.status });
  return data;
}

function mostrarMsg(id, texto, tipo = 'error') {
  const el = document.getElementById(id);
  el.textContent = texto;
  el.className = `msg ${tipo} visible`;
  setTimeout(() => el.classList.remove('visible'), 4000);
}

function mostrarSeccion(id) {
  document.querySelectorAll('.seccion').forEach(s => s.classList.remove('visible'));
  document.getElementById(id)?.classList.add('visible');
}

// ── Estado de sesión ──────────────────────────────────────────────────────────

let usuario = null;

async function checkSession() {
  try {
    usuario = await apiFetch('/auth/me');
    onLogin();
  } catch {
    mostrarSeccion('sec-login');
  }
}

function onLogin() {
  document.getElementById('navbar').classList.add('visible');
  document.getElementById('nav-usuario').textContent = `${usuario.nombre} · ${usuario.rol}`;
  mostrarSeccion('sec-centro');
  cargarCentro();
}

// ── Login ─────────────────────────────────────────────────────────────────────

document.getElementById('btn-login').addEventListener('click', async () => {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pass').value;
  if (!email || !password) return mostrarMsg('login-msg', 'Introduce email y contraseña');

  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  try {
    usuario = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    onLogin();
  } catch (err) {
    mostrarMsg('login-msg', err.message);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('login-pass').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-login').click();
});

// ── Logout ────────────────────────────────────────────────────────────────────

document.getElementById('btn-logout').addEventListener('click', async () => {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
  usuario = null;
  document.getElementById('navbar').classList.remove('visible');
  mostrarSeccion('sec-login');
});

// ── Configuración del centro ──────────────────────────────────────────────────

async function cargarCentro() {
  if (!usuario?.id_centro) return;
  try {
    const centro = await apiFetch('/centro');
    document.getElementById('c-nombre').value = centro.nombre         || '';
    document.getElementById('c-codigo').value = centro.codigo         || '';
    document.getElementById('c-año').value    = centro.año_academico  || '';
    document.getElementById('c-dir').value    = centro.direccion      || '';
    document.getElementById('c-tel').value    = centro.telefono       || '';
    document.getElementById('c-email').value  = centro.email          || '';
    if (centro.logo_base64) mostrarLogoPreview(centro.logo_base64);
  } catch { /* superadmin sin centro propio, no hay nada que cargar */ }
}

document.getElementById('btn-guardar-centro').addEventListener('click', async () => {
  const btn = document.getElementById('btn-guardar-centro');
  btn.disabled = true;
  try {
    await apiFetch('/centro', {
      method: 'PUT',
      body: {
        nombre:        document.getElementById('c-nombre').value,
        codigo:        document.getElementById('c-codigo').value,
        año_academico: document.getElementById('c-año').value,
        direccion:     document.getElementById('c-dir').value,
        telefono:      document.getElementById('c-tel').value,
        email:         document.getElementById('c-email').value,
        logo_base64:   logoBase64 || undefined,
      },
    });
    mostrarMsg('centro-msg', 'Datos guardados correctamente', 'ok');
  } catch (err) {
    mostrarMsg('centro-msg', err.message);
  } finally {
    btn.disabled = false;
  }
});

// ── Logo ──────────────────────────────────────────────────────────────────────

let logoBase64 = null;

document.getElementById('logo-preview').addEventListener('click', () => {
  document.getElementById('logo-input').click();
});

document.getElementById('logo-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    logoBase64 = ev.target.result;   // data:image/...;base64,...
    mostrarLogoPreview(logoBase64);
  };
  reader.readAsDataURL(file);
});

function mostrarLogoPreview(src) {
  const el = document.getElementById('logo-preview');
  el.innerHTML = `<img src="${src}" alt="Logo del centro">`;
}

// ── Arranque ──────────────────────────────────────────────────────────────────
checkSession();
