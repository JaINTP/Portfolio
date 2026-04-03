"""Entrypoint for running the Portfolio API with Uvicorn."""

from __future__ import annotations

from app.main import create_app

app = create_app()


def get_app():
    """Convenience accessor for ASGI servers."""

    return app
