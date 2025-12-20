# Portfolio Backend API

FastAPI-based backend for the Portfolio Platform, providing secure management of blog posts, projects, and profile data.

## Features

- **Asynchronous Design**: Built on **FastAPI** and **SQAlchemy** with `asyncpg` for high performance.
- **Secure Authentication**: Email-based login with session-issued JWT cookies.
- **Modular Storage**: Supports both local filesystem and **S3-compatible storage (like Cloudflare R2)**.
- **Auto-resolving URLs**: Dynamically rewrites internal storage URLs to public URLs based on configuration.
- **Advanced Security**: Includes rate limiting, input sanitization, and strict CORS policies.

## Local Development

### Installation

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### Run Development Server

```bash
python -m uvicorn app.main:app --reload
```
The API docs will be available at `http://localhost:8000/docs`.

### Testing

```bash
pytest
```

## Environment Variables

Key variables for the API:

- `DATABASE_URL`: Connection string for PostgreSQL.
- `STORAGE_TYPE`: `local` or `s3`.
- `S3_CUSTOM_DOMAIN`: Public domain for media assets.
- `ADMIN_EMAIL` & `ADMIN_PASSWORD_HASH`: Admin credentials.

---
For full project setup instructions, refer to the [root README](../../README.md).
