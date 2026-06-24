// Inferencia OWL: jerarquías, propiedades inversas y simétricas
// Acepta un grafoUri opcional para trabajar sobre una ontología concreta del usuario

const express = require('express');
const router  = express.Router();
const { verificarToken, adminOConsultor } = require('../middleware/auth');
const fusekiService = require('../services/fusekiService');
const { esGrafoDelUsuario } = require('./mis-ontologias');

// GET /api/inferencia
// Query param opcional: grafoUri
router.get('/', verificarToken, adminOConsultor, async (req, res) => {
  const { grafoUri } = req.query;

  if (grafoUri && !esGrafoDelUsuario(grafoUri, req.usuario.username)) {
    return res.status(403).json({ error: 'No tienes acceso a ese grafo' });
  }

  //* si viene un grafoUri usamos consultas genéricas — cada ontología puede tener su propio namespace
  //? si no hay grafoUri, filtramos al namespace del dataset de demo
  const filtroNamespace = grafoUri
    ? '' //? sin filtro de namespace — ontologías de usuario pueden tener cualquier URI base
    : 'FILTER(STRSTARTS(STR(?sub), "http://tfg.universidad.es/recursos#"))\n        FILTER(STRSTARTS(STR(?sup), "http://tfg.universidad.es/recursos#"))';

  try {
    const queryJerarquia = `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

      SELECT ?sub ?sup
      WHERE {
        ?sub rdfs:subClassOf ?sup .
        FILTER(isIRI(?sub) && isIRI(?sup))
        FILTER(!STRSTARTS(STR(?sub), "http://www.w3.org/"))
        FILTER(!STRSTARTS(STR(?sup), "http://www.w3.org/"))
        ${filtroNamespace}
      }
    `;

    const queryRecursos = `
      PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

      SELECT DISTINCT ?uri ?nombre
      WHERE {
        ?uri rdf:type ?tipo .
        OPTIONAL { ?uri rdfs:label ?nombre }
        FILTER(isIRI(?uri))
        FILTER(!STRSTARTS(STR(?tipo), "http://www.w3.org/"))
      }
      ORDER BY ?nombre
      LIMIT 200
    `;

    const queryCita = `
      PREFIX recursos: <http://tfg.universidad.es/recursos#>
      PREFIX rdfs:     <http://www.w3.org/2000/01/rdf-schema#>

      SELECT ?origen ?nombreOrigen ?destino ?nombreDestino
      WHERE {
        ?origen recursos:cita ?destino .
        OPTIONAL { ?origen rdfs:label ?nombreOrigen }
        OPTIONAL { ?destino rdfs:label ?nombreDestino }
      }
    `;

    // esCitadoPor NO está materializada en el dataset (Fuseki TDB2 sin razonador).
    // Se DERIVA en tiempo de consulta con el camino inverso ^recursos:cita:
    // "?origen ^cita ?destino" equivale a "?destino cita ?origen", es decir,
    // ?origen es citado por ?destino. Misma semántica que owl:inverseOf, pero
    // calculada al vuelo en lugar de materializada por un razonador.
    const queryEsCitadoPor = `
      PREFIX recursos: <http://tfg.universidad.es/recursos#>
      PREFIX rdfs:     <http://www.w3.org/2000/01/rdf-schema#>

      SELECT ?origen ?nombreOrigen ?destino ?nombreDestino
      WHERE {
        ?origen ^recursos:cita ?destino .
        OPTIONAL { ?origen rdfs:label ?nombreOrigen }
        OPTIONAL { ?destino rdfs:label ?nombreDestino }
      }
    `;

    const querySimetricaDirecta = `
      PREFIX recursos: <http://tfg.universidad.es/recursos#>
      PREFIX rdfs:     <http://www.w3.org/2000/01/rdf-schema#>

      SELECT ?a ?nombreA ?b ?nombreB
      WHERE {
        ?a recursos:estaRelacionadoCon ?b .
        OPTIONAL { ?a rdfs:label ?nombreA }
        OPTIONAL { ?b rdfs:label ?nombreB }
      }
    `;

    // estaRelacionadoCon es owl:SymmetricProperty: si A está relacionado con B,
    // entonces B lo está con A. La dirección opuesta NO está materializada; se
    // DERIVA al vuelo recorriendo cada triple explícito en sentido inverso.
    // Para el triple "?b estaRelacionadoCon ?a" emitimos el par (?a, ?b), que es
    // la dirección simétrica derivada. Calculado, no materializado.
    const querySimetricaInversa = `
      PREFIX recursos: <http://tfg.universidad.es/recursos#>
      PREFIX rdfs:     <http://www.w3.org/2000/01/rdf-schema#>

      SELECT ?a ?nombreA ?b ?nombreB
      WHERE {
        ?b recursos:estaRelacionadoCon ?a .
        OPTIONAL { ?a rdfs:label ?nombreA }
        OPTIONAL { ?b rdfs:label ?nombreB }
      }
    `;

    const grafo = grafoUri || null;
    const [
      rJerarquia, rRecursos,
      rCita, rEsCitadoPor,
      rSimetricaDir, rSimetricaInv,
    ] = await Promise.all([
      fusekiService.ejecutarQuery(queryJerarquia, grafo),
      fusekiService.ejecutarQuery(queryRecursos, grafo),
      fusekiService.ejecutarQuery(queryCita, grafo),
      fusekiService.ejecutarQuery(queryEsCitadoPor, grafo),
      fusekiService.ejecutarQuery(querySimetricaDirecta, grafo),
      fusekiService.ejecutarQuery(querySimetricaInversa, grafo),
    ]);

    const jerarquia = rJerarquia.results.bindings.map(b => ({
      sub: b.sub.value.split('#').pop() || b.sub.value.split('/').pop(),
      sup: b.sup.value.split('#').pop() || b.sup.value.split('/').pop(),
    }));

    const recursos = rRecursos.results.bindings.map(b => ({
      uri:    b.uri.value,
      nombre: b.nombre?.value || b.uri.value.split('#').pop() || b.uri.value.split('/').pop(),
    }));

    function formatearRelacion(bindings) {
      return bindings.map(b => ({
        origen:        b.origen?.value || b.a?.value,
        nombreOrigen:  b.nombreOrigen?.value || b.nombreA?.value || '?',
        destino:       b.destino?.value || b.b?.value,
        nombreDestino: b.nombreDestino?.value || b.nombreB?.value || '?',
      }));
    }

    res.json({
      jerarquia,
      recursos,
      propInversa: {
        conCita:        formatearRelacion(rCita.results.bindings),
        conEsCitadoPor: formatearRelacion(rEsCitadoPor.results.bindings),
      },
      propSimetrica: {
        directa: rSimetricaDir.results.bindings.map(b => ({
          a: b.nombreA?.value || b.a.value.split('#').pop(),
          b: b.nombreB?.value || b.b.value.split('#').pop(),
        })),
        inversa: rSimetricaInv.results.bindings.map(b => ({
          a: b.nombreA?.value || b.a.value.split('#').pop(),
          b: b.nombreB?.value || b.b.value.split('#').pop(),
        })),
      },
    });

  } catch (error) {
    console.error('[INFERENCIA] Error en GET /:', error.message);
    res.status(500).json({ error: 'Error cargando datos de inferencia' });
  }
});

// GET /api/inferencia/tipos?uri=...&grafoUri=...
router.get('/tipos', verificarToken, adminOConsultor, async (req, res) => {
  const { uri, grafoUri } = req.query;

  if (!uri) {
    return res.status(400).json({ error: 'Falta el parámetro uri' });
  }

  if (grafoUri && !esGrafoDelUsuario(grafoUri, req.usuario.username)) {
    return res.status(403).json({ error: 'No tienes acceso a ese grafo' });
  }

  try {
    const queryDirectos = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

      SELECT DISTINCT ?tipo
      WHERE {
        <${uri}> rdf:type ?tipo .
        FILTER(!STRSTARTS(STR(?tipo), "http://www.w3.org/"))
      }
    `;

    const queryInferidos = `
      PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

      SELECT DISTINCT ?tipoDirecto ?tipoInferido
      WHERE {
        <${uri}> rdf:type ?tipoDirecto .
        ?tipoDirecto rdfs:subClassOf+ ?tipoInferido .
        FILTER(!STRSTARTS(STR(?tipoDirecto),  "http://www.w3.org/"))
        FILTER(!STRSTARTS(STR(?tipoInferido), "http://www.w3.org/"))
      }
    `;

    const grafo = grafoUri || null;
    const [rDirectos, rInferidos] = await Promise.all([
      fusekiService.ejecutarQuery(queryDirectos, grafo),
      fusekiService.ejecutarQuery(queryInferidos, grafo),
    ]);

    const directos = rDirectos.results.bindings.map(b =>
      b.tipo.value.split('#').pop() || b.tipo.value.split('/').pop()
    );

    const inferidosSet = new Set();
    for (const b of rInferidos.results.bindings) {
      const nombre = b.tipoInferido.value.split('#').pop() || b.tipoInferido.value.split('/').pop();
      if (!directos.includes(nombre)) inferidosSet.add(nombre);
    }

    const cadenas = {};
    for (const b of rInferidos.results.bindings) {
      const directo  = b.tipoDirecto.value.split('#').pop();
      const inferido = b.tipoInferido.value.split('#').pop();
      if (!cadenas[directo]) cadenas[directo] = [];
      if (!cadenas[directo].includes(inferido)) cadenas[directo].push(inferido);
    }

    console.log(`[INFERENCIA] ${uri}: ${directos.length} directos, ${inferidosSet.size} inferidos`);

    res.json({ directos, inferidos: [...inferidosSet], cadenas });

  } catch (error) {
    console.error('[INFERENCIA] Error en GET /tipos:', error.message);
    res.status(500).json({ error: 'Error consultando tipos del recurso' });
  }
});

module.exports = router;
