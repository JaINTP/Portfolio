# syntax=docker/dockerfile:1.7
FROM --platform=$BUILDPLATFORM node:22.11.0-alpine3.20 AS build

ARG FRONTEND_API_ORIGIN
ENV NODE_ENV=production
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

COPY . .
RUN if [ -z "${FRONTEND_API_ORIGIN}" ]; then \
      echo "FRONTEND_API_ORIGIN build argument is required (example: https://portfolio.example/api)" >&2; \
      exit 1; \
    fi \
    && printf "REACT_APP_API_BASE_URL=%s\n" "${FRONTEND_API_ORIGIN}" > .env.production \
    && REACT_APP_API_BASE_URL="${FRONTEND_API_ORIGIN}" yarn build

FROM nginx:1.27.3-alpine AS runtime

ARG FRONTEND_API_ORIGIN
ENV FRONTEND_API_ORIGIN=${FRONTEND_API_ORIGIN}

ENV NGINX_ENTRYPOINT_QUIET_LOGS=1 \
    NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/conf.d

WORKDIR /usr/share/nginx/html

RUN rm -f /etc/nginx/conf.d/default.conf \
    && mkdir -p /usr/share/nginx/html/uploads /var/cache/nginx /tmp/nginx \
    && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /tmp/nginx

COPY --from=build /app/build /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod 0550 /docker-entrypoint.sh \
    && chown nginx:nginx /docker-entrypoint.sh

USER nginx

EXPOSE 3000
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/healthz >/dev/null

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
