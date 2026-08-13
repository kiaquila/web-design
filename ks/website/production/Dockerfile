FROM node:22.18.0-alpine@sha256:1b2479dd35a99687d6638f5976fd235e26c5b37e8122f786fcd5fe231d63de5b AS build

WORKDIR /app
COPY assets ./assets
COPY package.json ./package.json
COPY scripts ./scripts
COPY src ./src
RUN npm run build

FROM nginx:1.28.0-alpine@sha256:30f1c0d78e0ad60901648be663a710bdadf19e4c10ac6782c235200619158284

ARG SOURCE_REVISION=unknown
LABEL org.opencontainers.image.title="ks-design portfolio" \
      org.opencontainers.image.source="https://github.com/kiaquila/web-design" \
      org.opencontainers.image.revision="${SOURCE_REVISION}"

COPY production/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
