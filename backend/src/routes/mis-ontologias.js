// Gestión de ontologías propias: listar, consultar y eliminar
// Cada ontología vive en un grafo nombrado único dentro de Fuseki

const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const { verificarToken } = require('../middleware/auth');
const fusekiService = require('../services/fusekiService');

const RUTA_ONTOLOGIAS = path.join(__dirname, '../data/ontologias.json');

// ──────────────────────────────────────────────
// Helpers de persistencia (compartidos con ontologia.js via require)
// ──────────────────────────────────────────────

function leerOntologias() {
  try {
    return JSON.parse(fs.readFileSync(RUTA_ONTOLOGIAS, 'utf8')).ontologias;
  } catch {
    return [];
  }
}

function guardarOntologias(lista) {
  fs.writeFileSync(RUTA_ONTOLOGIAS, JSON.stringify({ ontologias: lista }, null, 2), 'utf8');
}

// Construir la URI del grafo nombrado para un usuario y nombre de archivo dados
// Resultado: { slug, uri }
function construirUriGrafo(username, nombreArchivo) {
  const ext = path.extname(nombreArchivo).toLowerCase();
  const slug = (path.basename(nombreArchivo, ext)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')) || 'ontologia';

  const usernameSlug = username.toLowerCase().replace(/[^a-z0-9_\-]/g, '');
  return {
    slug,
    uri: `http://tfg.universidad.es/usuario/${usernameSlug}/ontologia/${slug}`,
  };
}

// Verificar que una URI de grafo pertenece al usuario indicado
function esGrafoDelUsuario(grafoUri, username) {
  if (typeof grafoUri !== 'string' || grafoUri.includes('..') || grafoUri.length > 300) {
    return false;
  }
  const usernameSlug = username.toLowerCase().replace(/[^a-z0-9_\-]/g, '');
  return grafoUri.startsWith(`http://tfg.universidad.es/usuario/${usernameSlug}/ontologia/`);
}

// ──────────────────────────────────────────────
// Rutas
// ──────────────────────────────────────────────

// GET /api/mis-ontologias — lista las ontologías del usuario autenticado
router.get('/', verificarToken, (req, res) => {
  const todas = leerOntologias();
  const mias  = todas.filter(o => o.username === req.usuario.username);
  res.json(mias);
});

// GET /api/mis-ontologias/:slug — metadatos de una ontología concreta
router.get('/:slug', verificarToken, (req, res) => {
  const { slug } = req.params;

  if (!/^[a-z0-9\-_]+$/.test(slug)) {
    return res.status(400).json({ error: 'Identificador de ontología no válido' });
  }

  const todas     = leerOntologias();
  const ontologia = todas.find(o => o.slug === slug && o.username === req.usuario.username);

  if (!ontologia) {
    return res.status(404).json({ error: 'Ontología no encontrada' });
  }

  res.json(ontologia);
});

// DELETE /api/mis-ontologias/:slug — eliminar una ontología propia (borra el grafo en Fuseki)
router.delete('/:slug', verificarToken, async (req, res) => {
  const { slug } = req.params;

  if (!/^[a-z0-9\-_]+$/.test(slug)) {
    return res.status(400).json({ error: 'Identificador de ontología no válido' });
  }

  const todas     = leerOntologias();
  const ontologia = todas.find(o => o.slug === slug && o.username === req.usuario.username);

  if (!ontologia) {
    return res.status(404).json({ error: 'Ontología no encontrada o no tienes permiso para eliminarla' });
  }

  try {
    // Borrar el grafo nombrado de Fuseki con DROP GRAPH
    await fusekiService.ejecutarUpdate(`DROP SILENT GRAPH <${ontologia.grafoUri}>`);

    // Actualizar el fichero de metadatos quitando esta entrada
    const actualizadas = todas.filter(o => !(o.slug === slug && o.username === req.usuario.username));
    guardarOntologias(actualizadas);

    console.log(`[MIS-ONT] ${req.usuario.username} eliminó ontología "${slug}" (${ontologia.grafoUri})`);

    res.json({ mensaje: 'Ontología eliminada correctamente' });

  } catch (error) {
    console.error('[MIS-ONT] Error eliminando ontología:', error.message);
    res.status(500).json({ error: 'Error al eliminar la ontología en Fuseki' });
  }
});

module.exports = { router, leerOntologias, guardarOntologias, construirUriGrafo, esGrafoDelUsuario };
