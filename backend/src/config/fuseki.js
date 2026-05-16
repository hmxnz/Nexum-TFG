// Configuración de la conexión con Apache Jena Fuseki

const fusekiConfig = {
  url: process.env.FUSEKI_URL || 'http://localhost:3030',
  dataset: process.env.FUSEKI_DATASET || 'recursos',
  user: process.env.FUSEKI_USER || 'admin',
  password: process.env.FUSEKI_PASSWORD || 'admin123',
};

// Construir las URLs de los endpoints de Fuseki
fusekiConfig.queryEndpoint  = `${fusekiConfig.url}/${fusekiConfig.dataset}/sparql`;
fusekiConfig.updateEndpoint = `${fusekiConfig.url}/${fusekiConfig.dataset}/update`;
fusekiConfig.dataEndpoint   = `${fusekiConfig.url}/${fusekiConfig.dataset}/data`;

module.exports = fusekiConfig;
