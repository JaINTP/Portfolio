# Portfolio Platform (v2 Rebuild)

A modern, high-performance, unified portfolio platform built with **Next.js 15 (App Router)** and **Payload CMS v3**. 

## Features

- **Unified Stack**: Frontend and Backend (CMS) live in a single Next.js app.
- **Professional Admin**: **Payload CMS** provides a powerful, existing admin dashboard for managing content.
- **Modern UI**: Styled with **Tailwind CSS v4** and **shadcn/ui** for a sleek, dark aesthetic.
- **Commenting System**: Powered by **Giscus** (leveraging GitHub Discussions).
- **Storage**: Media assets are stored in **Cloudflare R2** (via S3-compatible storage adapter).
- **Database**: **PostgreSQL** for content persistence.

## Project Structure

- `apps/portfolio` – Unified Next.js + Payload CMS application.
- `deploy/` – Deployment configurations (Fail2ban, Systemd).
- `scripts/` – Utility scripts.

## Getting Started (Local Development)

### Prerequisites

- **Node.js 20+**
- **npm** or **yarn**
- **PostgreSQL 15+**

### 1. Installation

```bash
cd apps/portfolio
npm install
```

### 2. Configuration

Copy the example environment variables and customize them:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL`: Your PostgreSQL connection string.
- `PAYLOAD_SECRET`: A long random string for CMS security.
- `NEXT_PUBLIC_GISCUS_REPO`: Your GitHub repository for Giscus comments.

### 3. Running Locally

```bash
cd apps/portfolio
npm run dev
```

The app will be available at `http://localhost:3000`.
Access the admin dashboard at `http://localhost:3000/admin`.

## Deployment

This app is optimized for deployment on **Vercel** with a PostgreSQL database (e.g., Vercel Postgres, Supabase, or Railway).

---
*Rebuilt from the ground up for maximum performance and maintainability.*
