// Rutas para ejecutar consultas SPARQL contra Fuseki
// Acepta parámetro opcional grafoUri para limitar las consultas a un grafo concreto

const express = require('express');
const router  = express.Router();
const { verificarToken, soloAdmin, adminOConsultor } = require('../middleware/auth');
const fusekiService = require('../services/fusekiService');
const { sanitizarConsulta, esConsultaSegura } = require('../utils/sparqlSanitizer');
const { esGrafoDelUsuario } = require('./mis-ontologias');

// POST /api/sparql/query
router.post('/query', verificarToken, adminOConsultor, async (req, res) => {
  const { consulta, grafoUri } = req.body;

  if (!consulta || consulta.trim() === '') {
    return res.status(400).json({ error: 'No se proporcionó ninguna consulta SPARQL' });
  }

  //! validar que el grafo pertenece al usuario antes de ejecutar cualquier consulta
  if (grafoUri && !esGrafoDelUsuario(grafoUri, req.usuario.username)) {
    return res.status(403).json({ error: 'No tienes acceso a ese grafo' });
  }

  let consultaSaneada = sanitizarConsulta(consulta);

  if (!esConsultaSegura(consultaSaneada)) {
    console.log(`[SPARQL-SEC] Consulta bloqueada para ${req.usuario.username}: ${consulta.substring(0, 100)}...`);
    return res.status(400).json({ error: 'La consulta contiene operaciones no permitidas o patrones peligrosos' });
  }

  try {
    const resultado = await fusekiService.ejecutarQuery(consultaSaneada, grafoUri || null);
    res.json(resultado);
  } catch (error) {
    console.error('Error en query SPARQL:', error.message);
    res.status(500).json({ error: 'Error al ejecutar la consulta', detalle: error.message });
  }
});

// POST /api/sparql/update — solo admin
router.post('/update', verificarToken, soloAdmin, async (req, res) => {
  const { consulta } = req.body;

  if (!consulta || consulta.trim() === '') {
    return res.status(400).json({ error: 'No se proporcionó ninguna consulta de actualización' });
  }

  const consultaSaneada = sanitizarConsulta(consulta);

  try {
    await fusekiService.ejecutarUpdate(consultaSaneada);
    res.json({ mensaje: 'Actualización ejecutada correctamente' });
  } catch (error) {
    console.error('Error en update SPARQL:', error.message);
    res.status(500).json({ error: 'Error al ejecutar la actualización', detalle: error.message });
  }
});

// GET /api/sparql/prefijos
router.get('/prefijos', verificarToken, adminOConsultor, (req, res) => {
  const prefijos = {
    rdf:      'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs:     'http://www.w3.org/2000/01/rdf-schema#',
    owl:      'http://www.w3.org/2002/07/owl#',
    xsd:      'http://www.w3.org/2001/XMLSchema#',
    dc:       'http://purl.org/dc/elements/1.1/',
    recursos: 'http://tfg.universidad.es/recursos#',
  };
  res.json(prefijos);
});

module.exports = router;
