// Ruta para cargar archivos de ontología directamente en Fuseki
// Cada archivo se guarda en un grafo nombrado único por usuario
// Accesible para cualquier usuario autenticado (no solo admin)
// Hugo - TFG Ingeniería Informática

const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const fs       = require('fs');
const os       = require('os');
const path     = require('path');
const axios    = require('axios');
const { verificarToken }   = require('../middleware/auth');
const fusekiConfig         = require('../config/fuseki');
const fusekiService        = require('../services/fusekiService');
const {
  leerOntologias, guardarOntologias, construirUriGrafo
} = require('./mis-ontologias');

// Mapa extensión → Content-Type RDF que entiende Fuseki
const CONTENT_TYPES = {
  '.ttl': 'text/turtle',
  '.rdf': 'application/rdf+xml',
  '.owl': 'application/rdf+xml',
  '.n3':  'text/n3',
  '.nt':  'application/n-triples',
};

// Directorio temporal para guardar el archivo mientras se procesa
const DIR_TMP = path.join(os.tmpdir(), 'tfg-ontologia');

if (!fs.existsSync(DIR_TMP)) {
  fs.mkdirSync(DIR_TMP, { recursive: true });
}

const upload = multer({
  dest: DIR_TMP,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB máximo
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (CONTENT_TYPES[ext]) {
      cb(null, true);
    } else {
      cb(new Error(`Formato no soportado: ${ext}. Formatos válidos: .ttl .rdf .owl .n3 .nt`));
    }
  },
});

function procesarSubida(req, res) {
  return new Promise((resolve, reject) => {
    upload.single('archivo')(req, res, err => (err ? reject(err) : resolve()));
  });
}

// Contar triples del grafo nombrado concreto (para calcular el delta)
async function contarTriplesGrafo(grafoUri) {
  const q = `SELECT (COUNT(*) AS ?n) WHERE { GRAPH <${grafoUri}> { ?s ?p ?o } }`;
  const resultado = await fusekiService.ejecutarQuery(q);
  return parseInt(resultado.results.bindings[0]?.n?.value || '0', 10);
}

// POST /api/ontologia/upload
// Recibe: multipart/form-data con campo "archivo"
// Devuelve: { ok, archivo, slug, grafoUri, triplesAnadidos, totalTriples }
router.post('/upload', verificarToken, async (req, res) => {
  try {
    await procesarSubida(req, res);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' });
  }

  const rutaTemporal = req.file.path;

  try {
    const ext         = path.extname(req.file.originalname).toLowerCase();
    const contentType = CONTENT_TYPES[ext];
    const { slug, uri: grafoUri } = construirUriGrafo(
      req.usuario.username,
      req.file.originalname
    );

    const antesDeCargar = await contarTriplesGrafo(grafoUri);

    // Enviar el archivo a Fuseki usando el Graph Store Protocol con grafo nombrado por usuario
    const urlFuseki = `${fusekiConfig.dataEndpoint}?graph=${encodeURIComponent(grafoUri)}`;
    const contenido = fs.readFileSync(rutaTemporal);

    await axios.post(urlFuseki, contenido, {
      auth:    { username: fusekiConfig.user, password: fusekiConfig.password },
      headers: { 'Content-Type': contentType },
      timeout: 120000,
      maxContentLength: Infinity,
      maxBodyLength:    Infinity,
    });

    const despuesDeCargar = await contarTriplesGrafo(grafoUri);
    const triplesAnadidos = despuesDeCargar - antesDeCargar;

    // Actualizar (o insertar) los metadatos en el fichero JSON
    const todas = leerOntologias();
    const idxExistente = todas.findIndex(
      o => o.slug === slug && o.username === req.usuario.username
    );
    const meta = {
      username:  req.usuario.username,
      slug,
      nombre:    req.file.originalname,
      grafoUri,
      formato:   contentType,
      triples:   despuesDeCargar,
      fecha:     new Date().toISOString(),
    };

    if (idxExistente >= 0) {
      todas[idxExistente] = meta; // actualizar si ya existía (re-subida del mismo archivo)
    } else {
      todas.push(meta);
    }
    guardarOntologias(todas);

    console.log(`[ONTOLOGIA] ${req.usuario.username} cargó "${req.file.originalname}" → grafo "${grafoUri}", +${triplesAnadidos} triples`);

    res.json({
      ok: true,
      archivo: req.file.originalname,
      slug,
      grafoUri,
      triplesAnadidos,
      totalTriples: despuesDeCargar,
    });

  } catch (error) {
    console.error('[ONTOLOGIA] Error al cargar archivo en Fuseki:', error.message);

    const mensajeError = error.response?.data
      ? `Fuseki rechazó el archivo: ${typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)}`
      : error.message;

    res.status(500).json({ error: mensajeError });

  } finally {
    try { fs.unlinkSync(rutaTemporal); } catch (_) {}
  }
});

module.exports = router;
