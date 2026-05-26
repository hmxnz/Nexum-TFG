// Punto de entrada del servidor — Nexum, gestión de recursos semánticos

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./src/routes/auth');
const sparqlRoutes = require('./src/routes/sparql');
const recursosRoutes = require('./src/routes/recursos');
const grafoRoutes       = require('./src/routes/grafo');
const inferenciaRoutes  = require('./src/routes/inferencia');
const ontologiaRoutes     = require('./src/routes/ontologia');
const { router: misOntologiasRoutes } = require('./src/routes/mis-ontologias');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'http://frontend:5173'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev')); // logs de peticiones HTTP en desarrollo

// Limitador de peticiones - por si acaso hay spam o algo
// TODO: ajustar estos valores, 100 igual es demasiado poco para el demo
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas peticiones, espera un momento' }
});
app.use('/api/', limiter);

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/sparql', sparqlRoutes);
app.use('/api/recursos', recursosRoutes);
app.use('/api/grafo',      grafoRoutes);
app.use('/api/inferencia', inferenciaRoutes);
app.use('/api/ontologia',       ontologiaRoutes);
app.use('/api/mis-ontologias', misOntologiasRoutes);
app.use('/api/admin',         adminRoutes);

// Ruta de prueba para comprobar que el servidor responde
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mensaje: 'servidor funcionando',
    fuseki: process.env.FUSEKI_URL,
    timestamp: new Date().toISOString()
  });
});

// Manejo genérico de errores no controlados
// aquí habría que mejorar esto pero de momento va
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(` Servidor TFG corriendo en puerto ${PORT}`);
  console.log(` Fuseki: ${process.env.FUSEKI_URL}`);
  console.log(` Dataset: ${process.env.FUSEKI_DATASET}`);
  console.log(` JWT_SECRET cargado: ${!!process.env.JWT_SECRET} (${process.env.JWT_SECRET?.length ?? 0} chars)`);
  console.log(`===========================================`);
});
