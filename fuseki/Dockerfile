FROM stain/jena-fuseki:4.8.0

USER root

RUN mkdir -p /fuseki/databases

COPY config.ttl         /fuseki/config.ttl
COPY ontologia-base.ttl /fuseki/databases/ontologia-base.ttl

RUN chown -R fuseki:fuseki /fuseki

USER fuseki

# El docker-entrypoint.sh de la imagen base configura la contraseña de admin
# y luego ejecuta este CMD
CMD ["/jena-fuseki/fuseki-server", "--conf=/fuseki/config.ttl", "--port=3030"]
