# Portfolio Web Frontend

The frontend for the Portfolio Platform, built with **React**, **Tailwind CSS**, and **Framer Motion**.

## Key Features

- **Modern UI**: Smooth transitions and responsive design using Tailwind CSS.
- **Security First**: 
  - Centralized media resolution via `resolveMediaUrl` to handle cloud storage link formats safely.
  - Configured for `credentialless` Cross-Origin-Embedder-Policy (COEP) to allow cross-origin images without compromising safety.
  - Environment-aware routing and API interaction.
- **Admin Dashboard**: A secure, integrated interface for managing blog posts, projects, and profile data.

## Local Development

### Installation

```bash
yarn install
```

### Development Server

```bash
yarn start
```
Runs the app in dev mode at `http://localhost:3000`.

### Build

```bash
yarn build
```
Creates an optimized production bundle in the `build/` directory.

## Environment Variables

The frontend relies on the following variables (managed via `.env` or Vercel dashboard):

- `REACT_APP_API_BASE_URL`: The URL of your FastAPI backend (defaults to `/api` for Vercel rewrites).

## Security Note

This app uses strict security headers. When adding third-party integrations (like analytics or fonts), ensure you update the Content Security Policy (CSP) in the root `vercel.json` if necessary.

---
For full project setup instructions, refer to the [root README](../../README.md).
