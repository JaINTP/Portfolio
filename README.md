# Portfolio Platform

A modern, high-performance monorepo for a personal portfolio. Features a **FastAPI** backend and a **React** frontend, optimized for deployment on **Vercel** with **Cloudflare R2** for media storage.

## Architecture & Security

- **Hybrid Deployment**: Frontend and API are hosted on Vercel for global edge performance.
- **Cloud Storage**: Media assets (profile images, blog covers) are stored in Cloudflare R2.
- **Security Hardening**:
  - Strict Content Security Policy (CSP) with `credentialless` COEP for cross-origin image compatibility.
  - HttpOnly, Secure, and SameSite=Strict session cookies.
  - Robust media URL resolution that automatically handles protocol-less storage domains.
  - Email-based admin authentication with Bcrypt password hashing.

## Project Structure

- `apps/api` – FastAPI service with PostgreSQL (via `asyncpg`).
- `apps/web` – React SPA styled with Tailwind CSS.
- `scripts/` – Utility scripts for environment validation and local development.

## Getting Started (Local Development)

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** with **Yarn 1.x**
- **PostgreSQL 14+** (e.g., `postgresql://postgres:postgres@localhost:5432/portfolio`)

### 1. Backend Setup

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

### 2. Frontend Setup

```bash
cd apps/web
yarn install
cp .env.example .env
```

### 3. Running Locally

From the root directory:
```bash
./scripts/start.sh
```
The API runs on `http://localhost:8000` and the web client on `http://localhost:3000`.

## Production Deployment (Vercel)

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ENVIRONMENT` | Set to `production`. |
| `DATABASE_URL` | PostgreSQL connection string (must use `postgresql+asyncpg://`). |
| `FRONTEND_ORIGIN` | Your production URL (e.g., `https://portfolio.jaintp.com`). |
| `JWT_SECRET_KEY` | Long random string for signing tokens. |
| `SESSION_SECRET_KEY` | Long random string for session cookies. |
| `ADMIN_EMAIL` | Admin login email. |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash of your admin password. |
| **Storage (R2)** | |
| `STORAGE_TYPE` | Set to `s3`. |
| `S3_BUCKET` | Your R2 bucket name. |
| `S3_ENDPOINT_URL` | R2 S3 API endpoint (e.g., `https://<id>.r2.cloudflarestorage.com`). |
| `S3_ACCESS_KEY_ID` | R2 Access Key. |
| `S3_SECRET_ACCESS_KEY` | R2 Secret Key. |
| `S3_CUSTOM_DOMAIN` | Your R2 public URL (e.g., `https://media.yourdomain.com`). |

### Cloudflare R2 Configuration

To allow images to display correctly, you must configure a **CORS Policy** in your R2 bucket settings:

```json
[
  {
    "AllowedOrigins": ["https://your-portfolio.vercel.app", "http://localhost:3000"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["Content-Type", "Origin"],
    "MaxAgeSeconds": 3600
  }
]
```

## Maintenance & Testing

- **Backend Tests**: `cd apps/api && pytest`
- **Frontend Lint**: `cd apps/web && yarn lint`
- **Security Audit**: `scripts/verify-security.sh` (validates headers on a live URL).

---
*Generated with care for the Portfolio Platform.*
