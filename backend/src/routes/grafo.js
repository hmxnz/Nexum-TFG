// Ruta para obtener los datos del grafo de recursos y relaciones
// Devuelve nodos y aristas en formato Cytoscape.js
// Acepta parámetro opcional grafoUri para filtrar a una ontología concreta

const express = require('express');
const router  = express.Router();
const { verificarToken, adminOConsultor } = require('../middleware/auth');
const fusekiService = require('../services/fusekiService');
const { esGrafoDelUsuario } = require('./mis-ontologias');

//* colores por tipo de recurso — tienen que coincidir con los del frontend o la leyenda no cuadra
const COLORES_TIPO = {
  Articulo:       '#3b82f6',
  TFG:            '#22c55e',
  Software:       '#f97316',
  Dataset:        '#eab308',
  Autor:          '#a855f7',
  AreaTematica:   '#ef4444',
  TesisDoctoral:  '#06b6d4',
  Documento:      '#60a5fa',
  RecursoDigital: '#6b7280',
  Persona:        '#ec4899',
};

const COLOR_DEFAULT = '#94a3b8';

const ETIQUETAS_RELACION = {
  estaRelacionadoCon: 'relacionado con',
  cita:               'cita',
  esCitadoPor:        'citado por',
  tieneAutor:         'autor',
  perteneceA:         'pertenece a',
};

// GET /api/grafo
// Query param opcional: grafoUri  — si se indica, filtra al grafo de esa ontología
router.get('/', verificarToken, adminOConsultor, async (req, res) => {
  const { grafoUri } = req.query;

  //! validar que el grafo pertenece al usuario — no dejar que acceda a grafos ajenos
  if (grafoUri && !esGrafoDelUsuario(grafoUri, req.usuario.username)) {
    return res.status(403).json({ error: 'No tienes acceso a ese grafo' });
  }

  try {
    let queryNodos, queryAristas;

    if (grafoUri) {
      // ontología concreta del usuario: buscamos en ese grafo sin filtrar namespace
      queryNodos = `
        PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX dc:   <http://purl.org/dc/elements/1.1/>

        SELECT DISTINCT ?recurso ?tipo ?nombre ?descripcion
        FROM <${grafoUri}>
        WHERE {
          ?recurso rdf:type ?tipo .
          OPTIONAL { ?recurso rdfs:label ?nombre }
          OPTIONAL { ?recurso dc:description ?descripcion .
                     FILTER(LANG(?descripcion) = 'es' || LANG(?descripcion) = '') }
          FILTER(!STRSTARTS(STR(?tipo), "http://www.w3.org/"))
          FILTER(!STRSTARTS(STR(?tipo), "http://www.openlinksw.com/"))
          FILTER(isIRI(?recurso))
        }
      `;

      queryAristas = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

        SELECT ?origen ?relacion ?destino
        FROM <${grafoUri}>
        WHERE {
          ?origen ?relacion ?destino .
          FILTER(isIRI(?origen) && isIRI(?destino))
          FILTER(?relacion != rdf:type)
          FILTER(!STRSTARTS(STR(?relacion), "http://www.w3.org/"))
        }
      `;
    } else {
      // vista global: solo el namespace propio del dataset de demo
      queryNodos = `
        PREFIX rdf:      <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs:     <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX dc:       <http://purl.org/dc/elements/1.1/>
        PREFIX recursos: <http://tfg.universidad.es/recursos#>

        SELECT DISTINCT ?recurso ?tipo ?nombre ?descripcion
        WHERE {
          ?recurso rdf:type ?tipo .
          OPTIONAL { ?recurso rdfs:label ?nombre }
          OPTIONAL { ?recurso dc:description ?descripcion .
                     FILTER(LANG(?descripcion) = 'es' || LANG(?descripcion) = '') }
          FILTER(STRSTARTS(STR(?recurso), "http://tfg.universidad.es/recursos#"))
          FILTER(STRSTARTS(STR(?tipo),    "http://tfg.universidad.es/recursos#"))
        }
      `;

      queryAristas = `
        PREFIX recursos: <http://tfg.universidad.es/recursos#>

        SELECT ?origen ?relacion ?destino
        WHERE {
          VALUES ?relacion {
            recursos:estaRelacionadoCon
            recursos:cita
            recursos:esCitadoPor
            recursos:tieneAutor
            recursos:perteneceA
          }
          ?origen ?relacion ?destino .
          FILTER(STRSTARTS(STR(?origen),  "http://tfg.universidad.es/recursos#"))
          FILTER(STRSTARTS(STR(?destino), "http://tfg.universidad.es/recursos#"))
        }
      `;
    }

    const [resultNodos, resultAristas] = await Promise.all([
      fusekiService.ejecutarQuery(queryNodos),
      fusekiService.ejecutarQuery(queryAristas),
    ]);

    //* construir el mapa de nodos — usamos un objeto para deduplicar por URI
    const nodosMap = {};

    for (const b of resultNodos.results.bindings) {
      const id    = b.recurso.value;
      const tipo  = b.tipo.value.split('#').pop();
      const color = COLORES_TIPO[tipo] || COLOR_DEFAULT;

      if (!nodosMap[id] || (color !== COLOR_DEFAULT && nodosMap[id].data.color === COLOR_DEFAULT)) {
        nodosMap[id] = {
          group: 'nodes',
          data: {
            id,
            label:       b.nombre?.value || id.split('#').pop() || id.split('/').pop(),
            tipo,
            color,
            descripcion: b.descripcion?.value || '',
          },
        };
      }
    }

    //* construir las aristas — el Set de claves evita duplicados
    const aristas       = [];
    const aristasVistas = new Set();

    for (const b of resultAristas.results.bindings) {
      const source   = b.origen.value;
      const target   = b.destino.value;
      const relLocal = b.relacion.value.split('#').pop();
      const clave    = `${source}|${relLocal}|${target}`;

      if (!nodosMap[source] || !nodosMap[target]) continue;
      if (aristasVistas.has(clave)) continue;

      aristasVistas.add(clave);
      aristas.push({
        group: 'edges',
        data: {
          id:     `e_${aristas.length}`,
          source,
          target,
          label:  ETIQUETAS_RELACION[relLocal] || relLocal,
        },
      });
    }

    const elementos = [...Object.values(nodosMap), ...aristas];

    console.log(`[GRAFO] ${Object.keys(nodosMap).length} nodos, ${aristas.length} aristas${grafoUri ? ` (grafo: ${grafoUri})` : ''}`);

    res.json({ elementos });

  } catch (error) {
    console.error('[GRAFO] Error:', error.message);
    res.status(500).json({ error: 'Error al obtener los datos del grafo' });
  }
});

module.exports = router;
