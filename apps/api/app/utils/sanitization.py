"""Utilities for sanitising inbound data before persistence."""

from __future__ import annotations

from typing import Iterable

import bleach

# Allow a conservative set of tags for rich text content.
RICH_ALLOWED_TAGS: tuple[str, ...] = (
    "p",
    "strong",
    "em",
    "ul",
    "ol",
    "li",
    "br",
    "code",
    "pre",
    "blockquote",
    "a",
)

RICH_ALLOWED_ATTRIBUTES: dict[str, Iterable[str]] = {
    "a": ("href", "title", "target", "rel"),
    "code": ("class",),
    "pre": ("class", "data-lang"),
}

ALLOWED_PROTOCOLS: set[str] = {"http", "https", "mailto"}


def sanitize_plain_text(value: str) -> str:
    """Remove any HTML or scripting content from a plain text input."""

    return bleach.clean(value, tags=[], strip=True).strip()


def sanitize_rich_text(value: str) -> str:
    """Allow limited markup while stripping unsafe content."""

    return bleach.clean(
        value,
        tags=RICH_ALLOWED_TAGS,
        attributes=RICH_ALLOWED_ATTRIBUTES,
        strip=True,
        protocols=ALLOWED_PROTOCOLS,
    ).strip()


def sanitize_url(value: str) -> str:
    """Ensure URLs use an allowed protocol and are otherwise plain text."""

    sanitized = bleach.clean(value, tags=[], strip=True).strip()
    if sanitized and "://" in sanitized:
        scheme = sanitized.split(":", 1)[0].lower()
        if scheme not in ALLOWED_PROTOCOLS:
            raise ValueError("Unsupported URL scheme provided.")
    return sanitized


def sanitize_media_path(value: str) -> str:
    """Allow local media paths (e.g. /uploads/...) or absolute URLs."""

    sanitized = bleach.clean(value, tags=[], strip=True).strip()
    if not sanitized:
        return sanitized

    if sanitized.startswith("/"):
        # Disallow protocol-relative URLs (//example) and directory traversal.
        if sanitized.startswith("//"):
            raise ValueError("Protocol-relative paths are not allowed.")
        if ".." in sanitized.split("/"):
            raise ValueError("Relative paths cannot contain '..'.")
        return sanitized

    return sanitize_url(sanitized)
