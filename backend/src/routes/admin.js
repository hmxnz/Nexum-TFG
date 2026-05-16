// Rutas del panel de administración: gestión de usuarios y estadísticas globales
// Solo accesible para el rol admin
// Hugo - TFG Ingeniería Informática

const express  = require('express');
const router   = express.Router();
const fs       = require('fs');
const path     = require('path');
const { verificarToken }           = require('../middleware/auth');
const fusekiService                = require('../services/fusekiService');
const { leerOntologias, guardarOntologias } = require('./mis-ontologias');

const RUTA_USUARIOS = path.join(__dirname, '../data/usuarios.json');

function leerUsuarios() {
  try { return JSON.parse(fs.readFileSync(RUTA_USUARIOS, 'utf8')).usuarios; }
  catch { return []; }
}

function guardarUsuarios(lista) {
  fs.writeFileSync(RUTA_USUARIOS, JSON.stringify({ usuarios: lista }, null, 2), 'utf8');
}

function soloAdmin(req, res, next) {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo los administradores pueden acceder a este recurso' });
  }
  next();
}

// GET /api/admin/stats — estadísticas globales del sistema
router.get('/stats', verificarToken, soloAdmin, async (req, res) => {
  const usuarios   = leerUsuarios();
  const ontologias = leerOntologias();

  let totalTriples = 0;
  try {
    const r = await fusekiService.ejecutarQuery(`
      SELECT (SUM(?c) AS ?total) WHERE {
        SELECT ?g (COUNT(*) AS ?c) WHERE { GRAPH ?g { ?s ?p ?o } } GROUP BY ?g
      }
    `);
    const b = r.results?.bindings?.[0];
    if (b?.total) totalTriples = parseInt(b.total.value, 10) || 0;
  } catch { /* Fuseki puede no tener grafos aún */ }

  res.json({
    totalUsuarios:   usuarios.length,
    totalOntologias: ontologias.length,
    totalTriples,
  });
});

// GET /api/admin/usuarios — lista de todos los usuarios con su nº de ontologías
router.get('/usuarios', verificarToken, soloAdmin, (req, res) => {
  const usuarios   = leerUsuarios();
  const ontologias = leerOntologias();

  const lista = usuarios.map(({ password: _, ...u }) => ({
    ...u,
    numOntologias: ontologias.filter(o => o.username === u.username).length,
  }));

  res.json(lista);
});

// PATCH /api/admin/usuarios/:username/rol — alterna entre consultor y admin
router.patch('/usuarios/:username/rol', verificarToken, soloAdmin, (req, res) => {
  const { username } = req.params;

  if (username === req.usuario.username) {
    return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
  }

  const usuarios = leerUsuarios();
  const idx = usuarios.findIndex(u => u.username === username);
  if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' });

  usuarios[idx].rol = usuarios[idx].rol === 'admin' ? 'consultor' : 'admin';
  guardarUsuarios(usuarios);

  console.log(`[ADMIN] Rol de ${username} → ${usuarios[idx].rol} (por ${req.usuario.username})`);
  res.json({ username, rol: usuarios[idx].rol });
});

// DELETE /api/admin/usuarios/:username — elimina el usuario y todas sus ontologías en Fuseki
router.delete('/usuarios/:username', verificarToken, soloAdmin, async (req, res) => {
  const { username } = req.params;

  if (username === req.usuario.username) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  }

  const usuarios = leerUsuarios();
  const idx = usuarios.findIndex(u => u.username === username);
  if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' });

  const ontologias = leerOntologias();
  const suyas = ontologias.filter(o => o.username === username);

  for (const ont of suyas) {
    try {
      await fusekiService.ejecutarUpdate(`DROP SILENT GRAPH <${ont.grafoUri}>`);
    } catch (e) {
      console.error(`[ADMIN] Error borrando grafo ${ont.grafoUri}:`, e.message);
    }
  }

  guardarOntologias(ontologias.filter(o => o.username !== username));
  usuarios.splice(idx, 1);
  guardarUsuarios(usuarios);

  console.log(`[ADMIN] ${username} eliminado por ${req.usuario.username} (${suyas.length} ontologías)`);
  res.json({ mensaje: `Usuario ${username} eliminado correctamente`, ontologiasEliminadas: suyas.length });
});

module.exports = router;
