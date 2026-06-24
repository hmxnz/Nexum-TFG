#!/bin/sh
# ------------------------------------------------------------------
# Carga inicial de la ontología base en Fuseki + materialización de
# las inferencias OWL (inversa, simétrica y herencia de tipos).
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

echo "[init] Esperando a que Fuseki responda..."
until curl -sf "${FUSEKI}/\$/ping" >/dev/null 2>&1; do
  sleep 2
done
echo "[init] Fuseki disponible."

# ¿Ya hay datos cargados? (idempotencia)
N=$(curl -s -u "${USER}:${PASS}" "${FUSEKI}/${DS}/sparql" \
      --data-urlencode "query=SELECT (COUNT(*) AS ?n) WHERE { ?s ?p ?o }" \
      -H "Accept: text/csv" | tail -n1 | tr -d '\r\n ')

if [ -n "${N}" ] && [ "${N}" != "0" ] && [ "${N}" != "n" ]; then
  echo "[init] El dataset ya contiene ${N} triples. Nada que cargar."
  exit 0
fi

echo "[init] Cargando ontología base en el grafo por defecto..."
curl -sf -u "${USER}:${PASS}" -X POST "${FUSEKI}/${DS}/data?default" \
  -H "Content-Type: text/turtle" \
  --data-binary "@${TTL}"

echo "[init] Materializando inferencias OWL..."
curl -sf -u "${USER}:${PASS}" -X POST "${FUSEKI}/${DS}/update" \
  --data-urlencode 'update=
PREFIX :    <http://tfg.universidad.es/recursos#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
# Propiedad inversa: cita / esCitadoPor
INSERT { ?y :esCitadoPor ?x } WHERE { ?x :cita ?y } ;
# Propiedad simétrica: estaRelacionadoCon
INSERT { ?b :estaRelacionadoCon ?a } WHERE { ?a :estaRelacionadoCon ?b } ;
# Herencia de tipos por la jerarquía de subclases
INSERT { ?r a ?super } WHERE {
  ?r a ?c . ?c rdfs:subClassOf+ ?super .
  FILTER(isIRI(?super))
  FILTER(STRSTARTS(STR(?super), "http://tfg.universidad.es/recursos#"))
}'

echo "[init] Carga e inferencia completadas."
