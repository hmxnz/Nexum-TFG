// Rutas de autenticación: login, registro y verificación de token

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const fs      = require('fs');
const path    = require('path');
const { verificarToken } = require('../middleware/auth');

const RUTA_USUARIOS = path.join(__dirname, '../data/usuarios.json');

// Usuarios semilla: se crean la primera vez que arranca el servidor si el fichero no existe
const USUARIOS_SEED = [
  { id: 1, username: 'admin',      nombre: 'Administrador',  passwordPlana: 'admin123',     rol: 'admin'     },
  { id: 2, username: 'consultor1', nombre: 'Consultor Demo', passwordPlana: 'consultor123', rol: 'consultor' },
];

// ──────────────────────────────────────────────
// Helpers de persistencia
// ──────────────────────────────────────────────

function leerUsuarios() {
  try {
    return JSON.parse(fs.readFileSync(RUTA_USUARIOS, 'utf8')).usuarios;
  } catch {
    return [];
  }
}

function guardarUsuarios(lista) {
  fs.writeFileSync(RUTA_USUARIOS, JSON.stringify({ usuarios: lista }, null, 2), 'utf8');
}

// Inicializar fichero de usuarios la primera vez que arranca el servidor
async function inicializar() {
  if (fs.existsSync(RUTA_USUARIOS)) return;

  const hashed = await Promise.all(
    USUARIOS_SEED.map(async (u) => ({
      id:        u.id,
      username:  u.username,
      nombre:    u.nombre,
      password:  await bcrypt.hash(u.passwordPlana, 10),
      rol:       u.rol,
      creadoEn:  new Date().toISOString(),
    }))
  );
  guardarUsuarios(hashed);
  console.log('[AUTH] Fichero de usuarios creado con usuarios semilla');
}

inicializar().catch(err => console.error('[AUTH] Error inicializando usuarios:', err));

// ──────────────────────────────────────────────
// Rutas
// ──────────────────────────────────────────────

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Se necesitan usuario y contraseña' });
  }

  const usuarios = leerUsuarios();
  const usuario  = usuarios.find(u => u.username === username);

  // Mismo mensaje para usuario inexistente o contraseña incorrecta (evita enumeración)
  if (!usuario) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const ok = await bcrypt.compare(password, usuario.password);
  if (!ok) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = jwt.sign(
    { id: usuario.id, username: usuario.username, rol: usuario.rol, nombre: usuario.nombre },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  console.log(`[AUTH] Login de ${username} (${usuario.rol})`);

  res.json({
    token,
    usuario: { id: usuario.id, username: usuario.username, rol: usuario.rol, nombre: usuario.nombre },
  });
});

// GET /api/auth/verificar
router.get('/verificar', verificarToken, (req, res) => {
  res.json({ valido: true, usuario: req.usuario });
});

// POST /api/auth/registro — endpoint público
// Cualquiera puede registrarse; el rol siempre es 'consultor' excepto si quien
// hace la petición ya es admin (pasa el JWT de admin en Authorization).
router.post('/registro', async (req, res) => {
  const { username, password, nombre, rol: rolSolicitado } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Los campos username y password son obligatorios' });
  }

  // Solo letras, números, guión y guión_bajo; 3-30 caracteres
  if (!/^[a-zA-Z0-9_\-]{3,30}$/.test(username)) {
    return res.status(400).json({ error: 'El nombre de usuario solo puede contener letras, números, - y _  (3-30 caracteres)' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  // Determinar rol: solo un admin autenticado puede crear otro admin
  let rolFinal = 'consultor';
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
      if (payload.rol === 'admin' && ['admin', 'consultor'].includes(rolSolicitado)) {
        rolFinal = rolSolicitado;
      }
    } catch { /* token inválido → se ignora, rol queda como consultor */ }
  }

  const usuarios = leerUsuarios();

  if (usuarios.find(u => u.username === username)) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese nombre de usuario' });
  }

  const nuevoUsuario = {
    id:        usuarios.length + 1,
    username,
    nombre:    nombre?.trim() || username,
    password:  await bcrypt.hash(password, 10),
    rol:       rolFinal,
    creadoEn:  new Date().toISOString(),
  };

  usuarios.push(nuevoUsuario);
  guardarUsuarios(usuarios);

  console.log(`[AUTH] Nuevo usuario registrado: ${username} (${rolFinal})`);

  res.status(201).json({
    mensaje:  'Usuario creado correctamente',
    usuario: { id: nuevoUsuario.id, username: nuevoUsuario.username, rol: nuevoUsuario.rol },
  });
});

// GET /api/auth/usuarios — lista de usuarios (solo admin)
router.get('/usuarios', verificarToken, (req, res) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo el administrador puede ver la lista de usuarios' });
  }
  const usuarios = leerUsuarios().map(({ password: _, ...u }) => u); // sin el hash
  res.json(usuarios);
});

module.exports = router;
