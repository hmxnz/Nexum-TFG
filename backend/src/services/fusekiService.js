// Servicio para comunicarse con Apache Jena Fuseki via HTTP
// Básicamente un wrapper sobre axios para los endpoints SPARQL

const axios = require('axios');
const fusekiConfig = require('../config/fuseki');

// Cabecera de autenticación básica - no sé muy bien por qué Fuseki la exige así
// pero si la quito no funciona
const auth = {
  username: fusekiConfig.user,
  password: fusekiConfig.password,
};

// Ejecutar una consulta de lectura (SELECT, ASK, DESCRIBE, CONSTRUCT)
// grafoUri opcional: restringe la consulta a ese grafo usando el parámetro de protocolo SPARQL
async function ejecutarQuery(consultaSparql, grafoUri = null) {
  try {
    const params = new URLSearchParams({ query: consultaSparql });
    if (grafoUri) params.append('default-graph-uri', grafoUri);

    const respuesta = await axios.post(
      fusekiConfig.queryEndpoint,
      params,
      {
        auth,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept':        'application/sparql-results+json',
        },
        timeout: 30000, // 30s por si el razonador OWL tarda
      }
    );

    return respuesta.data;

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('No se puede conectar con Fuseki. ¿Está el servidor arrancado?');
    }
    if (error.response) {
      throw new Error(`Fuseki devolvió error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Error de red al consultar Fuseki: ${error.message}`);
  }
}

// Ejecutar una actualización (INSERT DATA, DELETE WHERE, etc.)
async function ejecutarUpdate(updateSparql) {
  try {
    const respuesta = await axios.post(
      fusekiConfig.updateEndpoint,
      new URLSearchParams({ update: updateSparql }),
      {
        auth,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000,
      }
    );

    // Fuseki devuelve 200 o 204 cuando va bien
    return respuesta.status === 200 || respuesta.status === 204;

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('No se puede conectar con Fuseki');
    }
    if (error.response) {
      throw new Error(`Fuseki error en update ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Error ejecutando update: ${error.message}`);
  }
}

// Comprobar que Fuseki responde - se usa en el health check del backend
async function comprobarConexion() {
  try {
    const resp = await axios.get(`${fusekiConfig.url}/$/ping`, {
      auth,
      timeout: 5000,
    });
    return resp.status === 200;
  } catch (error) {
    console.error('Fuseki no responde al ping:', error.message);
    return false;
  }
}

// Cargar datos RDF directamente en el dataset (formato Turtle)
async function cargarDatos(contenidoTtl) {
  try {
    const respuesta = await axios.post(
      fusekiConfig.dataEndpoint,
      contenidoTtl,
      {
        auth,
        headers: { 'Content-Type': 'text/turtle' },
        timeout: 60000,
      }
    );
    return respuesta.status === 200 || respuesta.status === 204;
  } catch (error) {
    throw new Error(`Error cargando datos en Fuseki: ${error.message}`);
  }
}

module.exports = { ejecutarQuery, ejecutarUpdate, comprobarConexion, cargarDatos };
