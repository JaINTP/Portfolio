# syntax=docker/dockerfile:1.7
FROM python:3.13.1-slim-bullseye AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /build

RUN apt-get update \
    && apt-get install --no-install-recommends -y build-essential curl \
    && python -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip setuptools wheel

COPY requirements.lock .

RUN /opt/venv/bin/pip install --require-hashes -r requirements.lock

FROM python:3.13.1-slim-bullseye AS runtime

ARG APP_USER=portfolio
ARG APP_UID=1001
ARG APP_GID=1001

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app \
    PATH=/opt/venv/bin:$PATH

RUN addgroup --system --gid "$APP_GID" "$APP_USER" \
    && adduser --system --uid "$APP_UID" --ingroup "$APP_USER" "$APP_USER"

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv

COPY app ./app
COPY main.py ./main.py
COPY gunicorn_conf.py ./gunicorn_conf.py

RUN mkdir -p /data/uploads /tmp/gunicorn \
    && chown -R "$APP_USER:$APP_USER" /app /data/uploads /tmp/gunicorn \
    && chmod 750 /data/uploads

USER $APP_USER

EXPOSE 8000
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import http.client; conn=http.client.HTTPConnection('127.0.0.1', 8000, timeout=3); conn.request('GET', '/healthz'); resp=conn.getresponse(); exit(0 if resp.status == 200 else 1)"

CMD ["gunicorn", "main:app", "-c", "gunicorn_conf.py"]
