// Protección contra SPARQL injection
// Inspirado en las recomendaciones de OWASP para lenguajes de consulta
// No es infalible pero cubre los casos más obvios

// Longitud máxima permitida para una consulta - para evitar ataques DoS con queries enormes
const MAX_LONGITUD = 5000;

// Patrones que NO deben aparecer en consultas del endpoint /query
// (las de actualización van por /update que solo usa el admin)
const PATRONES_PELIGROSOS = [
  /\bDROP\s+(GRAPH|ALL)\b/gi,
  /\bCLEAR\s+(GRAPH|ALL|DEFAULT)\b/gi,
  /\bDELETE\s+(DATA|WHERE|\{)/gi,
  /\bINSERT\s+(DATA|\{)/gi,
  /\bLOAD\b/gi,           // cargar grafos externos - podría hacer SSRF
  /\bSERVICE\s*</gi,      // federated query a servicios externos - también peligroso
  /\bCREATE\s+GRAPH\b/gi,
  /\bCOPY\s+(GRAPH|TO)\b/gi,
  /\bMOVE\s+GRAPH\b/gi,
  /\bADD\s+GRAPH\b/gi,
];

// Limpiar caracteres de control y truncar si la consulta es demasiado larga
function sanitizarConsulta(consulta) {
  if (!consulta || typeof consulta !== 'string') {
    return '';
  }

  // Quitar caracteres de control (excepto \t, \n, \r que son normales en SPARQL)
  let aux = consulta.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Truncar si es demasiado larga
  if (aux.length > MAX_LONGITUD) {
    aux = aux.substring(0, MAX_LONGITUD);
  }

  return aux.trim();
}

// Comprobar si la consulta es segura para el endpoint de lectura
function esConsultaSegura(consulta) {
  if (!consulta || consulta.length === 0) {
    return false;
  }

  if (consulta.length > MAX_LONGITUD) {
    return false;
  }

  // Comprobar patrones peligrosos
  for (const patron of PATRONES_PELIGROSOS) {
    // importante: resetear lastIndex para los flags /g
    patron.lastIndex = 0;
    if (patron.test(consulta)) {
      console.log(`[SPARQL-SEC] Patrón bloqueado: ${patron.source}`);
      return false;
    }
  }

  // La consulta del endpoint de lectura debe ser SELECT, ASK, DESCRIBE o CONSTRUCT
  // Quitamos los prefijos primero para no confundirnos
  const sinPrefijos = consulta
    .replace(/PREFIX\s+[\w-]*:\s*<[^>]+>\s*/gi, '')
    .trim();

  const tipoValido = /^(SELECT|ASK|DESCRIBE|CONSTRUCT)\b/i.test(sinPrefijos);

  if (!tipoValido) {
    console.log('[SPARQL-SEC] Tipo de consulta no permitido en endpoint de lectura');
    return false;
  }

  return true;
}

module.exports = { sanitizarConsulta, esConsultaSegura };
