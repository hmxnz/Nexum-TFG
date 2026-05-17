# Nexum — Sistema de Gestión de Recursos Semánticos

Trabajo de Fin de Grado — Grado en Gestión de Información y Contenidos Digitales  
Universidad de Murcia — 2026

## Descripción

Sistema web para la gestión y consulta de recursos semánticos mediante tecnologías RDF/OWL y SPARQL. Permite a usuarios con diferentes roles (administrador/consultor) cargar ontologías, navegar por el grafo de conocimiento, ejecutar consultas SPARQL y explorar la inferencia OWL activada en Apache Jena Fuseki.

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Base de datos semántica | Apache Jena Fuseki 4.x (con razonador OWL) |
| Autenticación | JWT (JSON Web Tokens) + bcrypt |
| Contenedores | Docker + Docker Compose |

## Cómo arrancar el proyecto

### Requisitos

- Docker
- Docker Compose

No hace falta instalar Node.js ni nada más; Docker gestiona todas las dependencias.

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd nexum

# 2. Arrancar todos los servicios
docker-compose up --build
```

La primera vez tarda un rato porque descarga las imágenes base. Una vez arrancado:

- **Frontend**: http://localhost:5173
- **API Backend**: http://localhost:4000/api/health
- **Fuseki (interfaz web)**: http://localhost:3030

Para parar:
```bash
docker-compose down
```

Para parar y borrar los datos de Fuseki:
```bash
docker-compose down -v
```

### Usuarios de demo

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | admin123 | Administrador |
| consultor1 | consultor123 | Consultor |

## Estructura del proyecto

```
nexum/
├── docker-compose.yml
├── README.md
├── frontend/                        # Aplicación React + Vite
│   ├── Dockerfile
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx                  # Enrutamiento y rutas protegidas
│       ├── App.css                  # Estilos globales y tema
│       ├── main.jsx
│       ├── components/
│       │   ├── Login.jsx            # Pantalla de acceso
│       │   ├── Registro.jsx         # Registro de nuevos usuarios
│       │   ├── Navbar.jsx           # Barra de navegación
│       │   ├── Dashboard.jsx        # Página principal tras el login
│       │   ├── MisOntologias.jsx    # Listado de ontologías del usuario
│       │   ├── OntologiaDetalle.jsx # Detalle, triples y grafo de una ontología
│       │   ├── ModalSubirOntologia.jsx # Modal de carga de archivos RDF/OWL
│       │   ├── GrafoVista.jsx       # Visualización interactiva del grafo (Cytoscape.js)
│       │   ├── SparqlConsole.jsx    # Consola de consultas SPARQL
│       │   ├── InferenciaOWL.jsx    # Explorador de jerarquías e inferencia OWL
│       │   ├── RecursosList.jsx     # Listado de recursos semánticos
│       │   └── AdminPanel.jsx       # Panel de administración de usuarios
│       ├── context/
│       │   ├── AuthContext.jsx      # Contexto de autenticación global
│       │   └── TemaContext.jsx      # Contexto de tema claro/oscuro
│       └── services/
│           └── api.js               # Cliente HTTP (axios) con interceptores JWT
├── backend/                         # API REST con Express
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js                    # Punto de entrada
│   └── src/
│       ├── config/
│       │   └── fuseki.js            # Configuración de conexión con Fuseki
│       ├── data/
│       │   ├── usuarios.json        # Almacén de usuarios en memoria
│       │   └── ontologias.json      # Metadatos de ontologías cargadas
│       ├── middleware/
│       │   └── auth.js              # Verificación JWT y control de roles
│       ├── routes/
│       │   ├── auth.js              # Login, registro y verificación de sesión
│       │   ├── mis-ontologias.js    # Gestión de ontologías por usuario
│       │   ├── ontologia.js         # Carga y detalle de una ontología
│       │   ├── sparql.js            # Endpoints SPARQL query/update
│       │   ├── grafo.js             # Datos del grafo para visualización
│       │   ├── inferencia.js        # Jerarquías OWL e inferencias
│       │   ├── recursos.js          # CRUD de recursos semánticos
│       │   └── admin.js             # Estadísticas y gestión de usuarios
│       ├── services/
│       │   └── fusekiService.js     # Comunicación con Apache Jena Fuseki
│       └── utils/
│           └── sparqlSanitizer.js   # Protección contra SPARQL injection
└── fuseki/                          # Configuración Apache Jena Fuseki
    ├── Dockerfile
    ├── config.ttl                   # Config del dataset con inferencia OWL
    └── ontologia-base.ttl           # Ontología inicial con datos de ejemplo
```

## API REST

### Autenticación
```
POST   /api/auth/login              → Login, devuelve JWT
GET    /api/auth/verificar          → Comprobar si el token sigue válido
POST   /api/auth/registro           → Registrar usuario (solo admin)
```

### Ontologías
```
GET    /api/mis-ontologias          → Listar ontologías del usuario
POST   /api/ontologia/subir         → Cargar archivo RDF/OWL/Turtle
GET    /api/ontologia/:slug         → Metadatos y triples de una ontología
DELETE /api/ontologia/:slug         → Eliminar una ontología (solo admin)
```

### Grafo e inferencia
```
GET    /api/grafo                   → Nodos y aristas para visualización
GET    /api/inferencia/jerarquia    → Árbol de clases OWL inferido
GET    /api/inferencia/tipos/:uri   → Tipos directos e inferidos de un recurso
```

### Recursos semánticos
```
GET    /api/recursos                → Listar todos los recursos
GET    /api/recursos/:uri           → Ver un recurso concreto
POST   /api/recursos                → Crear recurso (solo admin)
DELETE /api/recursos/:uri           → Eliminar recurso (solo admin)
```

### Consultas SPARQL
```
POST   /api/sparql/query            → Ejecutar SELECT/ASK/DESCRIBE/CONSTRUCT
POST   /api/sparql/update           → Ejecutar INSERT/DELETE (solo admin)
GET    /api/sparql/prefijos         → Ver prefijos disponibles
```

### Administración
```
GET    /api/admin/stats             → Estadísticas globales (solo admin)
GET    /api/admin/usuarios          → Listar todos los usuarios (solo admin)
PATCH  /api/admin/usuarios/:id/rol  → Cambiar rol de un usuario (solo admin)
DELETE /api/admin/usuarios/:id      → Eliminar usuario (solo admin)
```

## Roles y permisos

**Administrador**: acceso completo — carga y elimina ontologías, crea/gestiona usuarios, ejecuta queries y updates SPARQL, consulta estadísticas globales.

**Consultor**: solo lectura — explora ontologías, visualiza el grafo, ejecuta consultas SELECT/ASK/DESCRIBE/CONSTRUCT.

## Seguridad implementada

- Contraseñas hasheadas con bcrypt (salt rounds: 10)
- Tokens JWT con expiración configurable
- Protección contra SPARQL injection (lista blanca de tipos de consulta + validación de patrones peligrosos)
- Rate limiting: máximo 100 peticiones por IP cada 15 minutos
- Separación de endpoints query/update con autorización por rol

## Inferencia OWL

El dataset de Fuseki está configurado con el razonador `OWLFBRuleReasoner` de Apache Jena, que infiere relaciones implícitas definidas en la ontología sin necesidad de escribirlas explícitamente.

Por ejemplo, dado que en la ontología se define `recursos:esCitadoPor owl:inverseOf recursos:cita`, si se inserta que el recurso A *cita* al recurso B, el razonador inferirá automáticamente que B *es citado por* A.

**Limitación conocida**: los datos se almacenan en memoria. Las actualizaciones vía SPARQL Update persisten mientras el contenedor esté en marcha, pero se pierden al reiniciar. En producción habría que configurar TDB2 como almacén persistente.

## Limitaciones y trabajo futuro

- La base de datos de usuarios se almacena en un fichero JSON; en producción se usaría PostgreSQL o similar
- El editor SPARQL es un textarea simple; idealmente se integraría YASGUI
- La paginación de recursos no está implementada
- No se han implementado tests automatizados

## Autor

Hugo Martínez Segura — Grado en Gestión de Información y Contenidos Digitales — Universidad de Murcia — 2026
