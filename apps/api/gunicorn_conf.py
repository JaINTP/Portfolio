"""Gunicorn configuration tuned for the portfolio API."""

from __future__ import annotations

import multiprocessing
import os


def _cpu_count() -> int:
    try:
        return multiprocessing.cpu_count()
    except NotImplementedError:  # pragma: no cover - platform guard
        return 2


bind = "0.0.0.0:8000"
worker_class = "uvicorn.workers.UvicornWorker"
workers = int(os.getenv("WEB_CONCURRENCY", str(max(2, _cpu_count() // 2 or 1))))
threads = int(os.getenv("GUNICORN_THREADS", "2"))
preload_app = True
timeout = int(os.getenv("GUNICORN_TIMEOUT", "30"))
graceful_timeout = int(os.getenv("GUNICORN_GRACEFUL_TIMEOUT", "30"))
keepalive = int(os.getenv("GUNICORN_KEEPALIVE", "5"))
max_requests = int(os.getenv("GUNICORN_MAX_REQUESTS", "1000"))
max_requests_jitter = int(os.getenv("GUNICORN_MAX_REQUESTS_JITTER", "100"))
limit_request_line = 4096
limit_request_fields = 50
limit_request_field_size = 8190
worker_tmp_dir = "/tmp/gunicorn"
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
capture_output = True
forwarded_allow_ips = os.getenv("FORWARDED_ALLOW_IPS", "127.0.0.1")
proc_name = "portfolio-api"
secure_scheme_headers = {
    "X-FORWARDED-PROTO": "https",
}
