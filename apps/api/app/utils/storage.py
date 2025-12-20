"""Storage providers for handling media persistence."""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO, Literal

import aioboto3
from fastapi import HTTPException, status

class StorageProvider(ABC):
    """Abstract base class for storage providers."""

    @abstractmethod
    async def upload(self, file: BinaryIO, filename: str, subdir: str | None = None) -> str:
        """Upload a file and return its public URL or relative path."""
        pass

class LocalStorageProvider(StorageProvider):
    """Stores files on the local filesystem."""

    def __init__(self, base_dir: Path, public_url_prefix: str = "/uploads"):
        self.base_dir = base_dir
        self.public_url_prefix = public_url_prefix

    async def upload(self, file: BinaryIO, filename: str, subdir: str | None = None) -> str:
        target_dir = self.base_dir
        relative_path = f"{self.public_url_prefix}/{filename}"
        
        if subdir:
            target_dir = self.base_dir / subdir
            relative_path = f"{self.public_url_prefix}/{subdir}/{filename}"
        
        target_dir.mkdir(parents=True, exist_ok=True)
        destination = target_dir / filename
        
        # In a real async implementation, we would use aiofiles
        # But for compatibility with existing code structure:
        with destination.open("wb") as buffer:
            buffer.write(file.read())
            
        return relative_path

class S3StorageProvider(StorageProvider):
    """Stores files in an S3-compatible bucket (AWS, R2, etc.)."""

    def __init__(
        self,
        bucket: str,
        region: str,
        access_key: str,
        secret_key: str,
        endpoint_url: str | None = None,
        public_url_override: str | None = None
    ):
        self.bucket = bucket
        self.region = region
        self.access_key = access_key
        self.secret_key = secret_key
        self.endpoint_url = endpoint_url
        self.public_url_override = public_url_override
        
        self.session = aioboto3.Session()

    async def upload(self, file: BinaryIO, filename: str, subdir: str | None = None) -> str:
        key = filename
        if subdir:
            key = f"{subdir}/{filename}"
            
        async with self.session.client(
            "s3",
            region_name=self.region,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            endpoint_url=self.endpoint_url
        ) as s3:
            try:
                # R2 buckets often have ACLs disabled. We rely on Bucket policies
                # or a Public Custom Domain for public access.
                await s3.put_object(
                    Bucket=self.bucket,
                    Key=key,
                    Body=file.read()
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Cloud storage upload failed: {str(e)}"
                )
                
        if self.public_url_override:
            return f"{self.public_url_override.rstrip('/')}/{key}"
        
        # Default S3/R2 URL format
        if self.endpoint_url:
            # For R2 or custom endpoints
            return f"{self.endpoint_url.rstrip('/')}/{self.bucket}/{key}"
            
        return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{key}"

def resolve_storage_url(url: str | None) -> str | None:
    """
    Rewrite legacy or internal storage URLs to public URLs if configured.
    
    Specifically handles Cloudflare R2 S3-compatibility URLs that are blocked
    by CORS/ORB when used directly in the browser.
    """
    if not url:
        return url
        
    from ..config import get_settings
    settings = get_settings()

    # Only rewrite if a custom domain or public subdomain is configured
    if not settings.s3_custom_domain:
        return url

    # Check for legacy Cloudflare R2 S3-style URLs
    # Format: https://<account_id>.r2.cloudflarestorage.com/<bucket>/<key>
    if ".r2.cloudflarestorage.com/" in url:
        parts = url.split(".r2.cloudflarestorage.com/", 1)
        if len(parts) == 2:
            # strip leading bucket name if present in path
            path_parts = parts[1].split("/", 1)
            if len(path_parts) == 2 and path_parts[0] == settings.s3_bucket:
                key = path_parts[1]
                return f"{settings.s3_custom_domain.rstrip('/')}/{key}"
            
    return url

def get_storage_provider() -> StorageProvider:
    """Factory function to get the configured storage provider."""
    from ..config import get_settings
    settings = get_settings()
    
    if settings.storage_type == "s3":
        return S3StorageProvider(
            bucket=settings.s3_bucket,
            region=settings.s3_region,
            access_key=settings.s3_access_key_id,
            secret_key=settings.s3_secret_access_key,
            endpoint_url=settings.s3_endpoint_url,
            public_url_override=settings.s3_custom_domain
        )
    
    return LocalStorageProvider(base_dir=settings.uploads_dir)
