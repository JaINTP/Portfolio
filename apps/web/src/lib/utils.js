import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Robustly resolve a media URL.
 * Handles absolute URLs, relative paths, and protocol-less domains.
 */
export function resolveMediaUrl(value) {
  if (!value) return '';

  // 1. If it's already an absolute URL (has protocol)
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  // 2. If it's a protocol-less domain-start URL (e.g. bucket.jaintp.com/...)
  // We check if the first part looks like a domain (contains dots)
  const parts = value.split('/');
  const firstPart = parts[0];
  if (firstPart.includes('.') && !firstPart.startsWith('.')) {
    return `https://${value}`;
  }

  // 3. If it's a relative path (starts with / or is just a path)
  const normalized = value.startsWith('/') ? value : `/${value}`;

  // On client, prepend origin if relative
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${normalized}`;
  }

  return normalized;
}
