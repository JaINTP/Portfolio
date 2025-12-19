import DOMPurify from 'dompurify';

const sanitizer =
  typeof window !== 'undefined' && DOMPurify?.sanitize ? DOMPurify : null;

const SANITIZE_OPTIONS = Object.freeze({
  USE_PROFILES: { html: true },
});

export const sanitizeHtml = (value) => {
  if (!value) {
    return '';
  }

  if (!sanitizer) {
    // Tests and server-side tooling may not have a DOM; fall back to raw value.
    return value;
  }

  return sanitizer.sanitize(value, SANITIZE_OPTIONS);
};
