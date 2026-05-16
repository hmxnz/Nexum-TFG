// Rutas para gestionar recursos semánticos (CRUD básico sobre Fuseki)
const express = require('express');
const router = express.Router();
const { verificarToken, soloAdmin, adminOConsultor } = require('../middleware/auth');
const fusekiService = require('../services/fusekiService');

// GET /api/recursos - obtener todos los recursos del dataset
router.get('/', verificarToken, adminOConsultor, async (req, res) => {
  // Esta consulta devuelve los recursos con sus propiedades principales
  // Solo coge instancias del namespace propio, no las clases de OWL/RDF internas
  const query = `
    PREFIX rdf:      <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX rdfs:     <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX dc:       <http://purl.org/dc/elements/1.1/>
    PREFIX recursos: <http://tfg.universidad.es/recursos#>

    SELECT DISTINCT ?recurso ?tipo ?nombre ?descripcion ?autor ?fecha
    WHERE {
      ?recurso rdf:type ?tipo .
      ?recurso rdfs:label ?nombre .
      OPTIONAL { ?recurso dc:description ?descripcion . FILTER(LANG(?descripcion) = 'es' || LANG(?descripcion) = '') }
      OPTIONAL { ?recurso dc:creator ?autor }
      OPTIONAL { ?recurso dc:date ?fecha }
      FILTER(STRSTARTS(STR(?recurso), "http://tfg.universidad.es/recursos#"))
      FILTER(STRSTARTS(STR(?tipo),    "http://tfg.universidad.es/recursos#"))
    }
    ORDER BY ?nombre
  `;

  try {
    const datos = await fusekiService.ejecutarQuery(query);
    res.json(datos);
  } catch (error) {
    console.error('Error obteniendo lista de recursos:', error.message);
    res.status(500).json({ error: 'No se pudo obtener la lista de recursos' });
  }
});

// GET /api/recursos/:id - ver todas las propiedades de un recurso concreto
// el id es la URI del recurso codificada con encodeURIComponent
router.get('/:id', verificarToken, adminOConsultor, async (req, res) => {
  const uri = decodeURIComponent(req.params.id);

  // Aquí habría que validar mejor que la URI es del namespace correcto
  // pero de momento con esto va para el TFG
  if (!uri.startsWith('http')) {
    return res.status(400).json({ error: 'URI no válida' });
  }

  const query = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX dc:   <http://purl.org/dc/elements/1.1/>

    SELECT ?propiedad ?valor
    WHERE {
      <${uri}> ?propiedad ?valor .
    }
    ORDER BY ?propiedad
  `;

  try {
    const resultado = await fusekiService.ejecutarQuery(query);

    if (!resultado.results || resultado.results.bindings.length === 0) {
      return res.status(404).json({ error: 'Recurso no encontrado' });
    }

    res.json(resultado);
  } catch (error) {
    console.error('Error obteniendo recurso:', error.message);
    res.status(500).json({ error: 'Error al recuperar el recurso' });
  }
});

// POST /api/recursos - crear un nuevo recurso en el dataset (solo admin)
router.post('/', verificarToken, soloAdmin, async (req, res) => {
  const { uri, tipo, nombre, descripcion, autor } = req.body;

  if (!uri || !tipo || !nombre) {
    return res.status(400).json({ error: 'Los campos uri, tipo y nombre son obligatorios' });
  }

  // Validación básica de la URI - no sé si esto es suficiente pero algo es algo
  if (!uri.startsWith('http://tfg.universidad.es/recursos#')) {
    return res.status(400).json({ error: 'La URI debe empezar por http://tfg.universidad.es/recursos#' });
  }

  const fechaHoy = new Date().toISOString().split('T')[0];

  // Construir la consulta INSERT - esto podría ser más elegante pero funciona
  let updateQuery = `
    PREFIX rdf:      <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX rdfs:     <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX dc:       <http://purl.org/dc/elements/1.1/>
    PREFIX xsd:      <http://www.w3.org/2001/XMLSchema#>

    INSERT DATA {
      <${uri}> rdf:type  <${tipo}> .
      <${uri}> rdfs:label "${nombre.replace(/"/g, '\\"')}"@es .
      <${uri}> dc:date   "${fechaHoy}"^^xsd:date .
  `;

  if (descripcion) {
    updateQuery += `  <${uri}> dc:description "${descripcion.replace(/"/g, '\\"')}"@es .\n`;
  }
  if (autor) {
    updateQuery += `  <${uri}> dc:creator "${autor.replace(/"/g, '\\"')}" .\n`;
  }

  updateQuery += `}`;

  try {
    await fusekiService.ejecutarUpdate(updateQuery);
    res.status(201).json({ mensaje: 'Recurso creado correctamente', uri });
  } catch (error) {
    console.error('Error creando recurso:', error.message);
    res.status(500).json({ error: 'Error al crear el recurso' });
  }
});

// DELETE /api/recursos/:id - eliminar un recurso (solo admin)
router.delete('/:id', verificarToken, soloAdmin, async (req, res) => {
  const uri = decodeURIComponent(req.params.id);

  if (!uri.startsWith('http')) {
    return res.status(400).json({ error: 'URI no válida' });
  }

  // Eliminar todos los triples donde el recurso aparece como sujeto
  const deleteQuery = `
    DELETE WHERE {
      <${uri}> ?p ?o .
    }
  `;

  try {
    await fusekiService.ejecutarUpdate(deleteQuery);
    res.json({ mensaje: 'Recurso eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando recurso:', error.message);
    res.status(500).json({ error: 'Error al eliminar el recurso' });
  }
});

module.exports = router;
