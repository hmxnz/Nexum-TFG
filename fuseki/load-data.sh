#!/bin/sh
# ------------------------------------------------------------------
# Carga inicial de la ontología base en Fuseki.
#
# La ontología se carga en dos sitios:
#   1) el grafo por defecto        -> alimenta la vista "general"
#   2) el grafo nombrado del admin -> aparece en "mis ontologías"
#      (coincide con la entrada de backend/src/data/ontologias.json)
#
# NOTA: no se materializa ninguna inferencia. Fuseki TDB2 corre sin
# razonador, así que las tripletas inferidas (herencia de tipos,
# propiedad inversa esCitadoPor y dirección simétrica de
# estaRelacionadoCon) NO se almacenan: se CALCULAN en tiempo de
# consulta con SPARQL 1.1 (rdfs:subClassOf+, el camino inverso ^cita y
# el recorrido de cada triple en sentido opuesto). Un razonador OWL las
# materializaría; aquí se demuestra el cálculo al vuelo. Materializar
# rompería ese discurso didáctico.
#
# Se ejecuta como servicio one-shot al levantar el proyecto. Es
# idempotente: si el dataset ya tiene datos, no hace nada. Así un
# `git clone && docker compose up` deja la app lista para usar.
# ------------------------------------------------------------------
set -eu

FUSEKI="${FUSEKI_URL:-http://fuseki:3030}"
DS="${FUSEKI_DATASET:-recursos}"
USER="${FUSEKI_USER:-admin}"
PASS="${FUSEKI_PASSWORD:-admin}"
TTL="/data/ontologia-base.ttl"

# Grafo nombrado del admin (debe coincidir con ontologias.json), ya URL-encoded
GRAFO_ADMIN_ENC="http%3A%2F%2Ftfg.universidad.es%2Fusuario%2Fadmin%2Fontologia%2Fontologia-base"

echo "[init] Esperando a que Fuseki responda..."
until curl -sf "${FUSEKI}/\$/ping" >/dev/null 2>&1; do
  sleep 2
done
echo "[init] Fuseki disponible."

# ¿Ya hay datos cargados? (idempotencia)
N=$(curl -s -u "${USER}:${PASS}" "${FUSEKI}/${DS}/sparql" \
      --data-urlencode "query=SELECT (COUNT(*) AS ?n) WHERE { { ?s ?p ?o } UNION { GRAPH ?g { ?s ?p ?o } } }" \
      -H "Accept: text/csv" | tail -n1 | tr -d '\r\n ')

if [ -n "${N}" ] && [ "${N}" != "0" ] && [ "${N}" != "n" ]; then
  echo "[init] El dataset ya contiene ${N} triples. Nada que cargar."
  exit 0
fi

# 1) Grafo por defecto (vista general)
echo "[init] Cargando ontología base en el grafo por defecto..."
curl -sf -u "${USER}:${PASS}" -X POST "${FUSEKI}/${DS}/data?default" \
  -H "Content-Type: text/turtle" --data-binary "@${TTL}"

# 2) Grafo nombrado del admin (vista "mis ontologías")
echo "[init] Cargando ontología base en el grafo nombrado del admin..."
curl -sf -u "${USER}:${PASS}" -X POST "${FUSEKI}/${DS}/data?graph=${GRAFO_ADMIN_ENC}" \
  -H "Content-Type: text/turtle" --data-binary "@${TTL}"

echo "[init] Carga completada."
