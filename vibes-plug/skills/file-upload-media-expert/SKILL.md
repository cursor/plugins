---
name: file-upload-media-expert
description: "Expert guide for file uploads (S3, R2, Supabase Storage), presigned URLs, image/video processing, CDN optimization, and media pipeline architecture / Panduan ahli untuk upload file (S3, R2, Supabase Storage), presigned URL, pemrosesan gambar/video, optimasi CDN, dan arsitektur pipeline media."
author: "Roedy Rustam"
version: "4.3.0"
---

# File Upload & Media Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Production-grade guide for building secure, performant file upload systems and media processing pipelines. Covers **presigned URL upload patterns** (S3, R2, Supabase Storage), **multipart uploads** with progress tracking, **image optimization** (Sharp, Cloudflare Images, Vercel OG), **video transcoding** (Mux, Cloudflare Stream), **PDF generation**, **file validation & virus scanning**, **CDN configuration**, and **drag-and-drop UI components**.

### Trigger Conditions
Activate this skill when:
- Implementing file upload functionality (images, documents, videos).
- Setting up cloud storage (AWS S3, Cloudflare R2, Supabase Storage, UploadThing).
- Building image processing pipelines (resize, crop, watermark, format conversion).
- Implementing drag-and-drop file upload UI components.
- Configuring CDN for static assets and media delivery.
- Generating PDFs or processing documents server-side.
- Building avatar/profile picture upload functionality.

---

### Storage Provider Selection Guide

| Provider | Best For | Key Strength | Egress Cost |
|---|---|---|---|
| **Cloudflare R2** | Cost-sensitive, global | Zero egress fees, S3-compatible | **$0** |
| **AWS S3** | Enterprise, AWS ecosystem | Most mature, rich feature set | $0.09/GB |
| **Supabase Storage** | Supabase-powered apps | RLS integration, built-in transforms | Included in plan |
| **UploadThing** | Quick prototyping | React components, zero config | Included in plan |
| **Vercel Blob** | Vercel-hosted apps | Seamless Vercel integration | Included in plan |

**Recommendation**: Use **Cloudflare R2** for most production apps (zero egress, S3-compatible). Use **Supabase Storage** if already on Supabase. Use **UploadThing** for rapid prototyping.

---

### 1. Presigned URL Upload Pattern (Server → Client → Storage)

```
┌──────────┐     1. Request URL      ┌──────────┐
│  Client   │ ──────────────────────► │  Server  │
│ (Browser) │                         │ (API)    │
│           │ ◄────────────────────── │          │
│           │   2. Presigned URL      │          │
│           │                         └──────────┘
│           │     3. Upload file
│           │ ──────────────────────► ┌──────────┐
│           │                         │  Storage │
│           │ ◄────────────────────── │ (S3/R2)  │
└──────────┘   4. Success response    └──────────┘
```

#### Server: Generate Presigned URL
```typescript
// app/api/upload/route.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,           // Cloudflare R2
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Allowed file types and max sizes
const ALLOWED_TYPES: Record<string, { maxSize: number; extensions: string[] }> = {
  image: { maxSize: 10 * 1024 * 1024, extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif'] },
  document: { maxSize: 25 * 1024 * 1024, extensions: ['pdf', 'docx', 'xlsx'] },
  video: { maxSize: 500 * 1024 * 1024, extensions: ['mp4', 'webm', 'mov'] },
};

export async function POST(request: Request) {
  const { filename, contentType, fileSize, category = 'image' } = await request.json();

  // Validate file type
  const config = ALLOWED_TYPES[category];
  if (!config) return Response.json({ error: 'Invalid category' }, { status: 400 });

  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext || !config.extensions.includes(ext)) {
    return Response.json({ error: `Invalid file type. Allowed: ${config.extensions.join(', ')}` }, { status: 400 });
  }

  // Validate file size
  if (fileSize > config.maxSize) {
    return Response.json({ error: `File too large. Max: ${config.maxSize / 1024 / 1024}MB` }, { status: 400 });
  }

  // Generate unique key
  const key = `uploads/${category}/${nanoid()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ContentLength: fileSize,
  });

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 600 }); // 10 min

  return Response.json({
    presignedUrl,
    key,
    publicUrl: `${process.env.CDN_URL}/${key}`,
  });
}
```

#### Client: Upload with Progress
```tsx
// hooks/use-file-upload.ts
'use client';

import { useState, useCallback } from 'react';

interface UploadState {
  progress: number;
  isUploading: boolean;
  error: string | null;
  publicUrl: string | null;
}

export function useFileUpload() {
  const [state, setState] = useState<UploadState>({
    progress: 0, isUploading: false, error: null, publicUrl: null,
  });

  const upload = useCallback(async (file: File, category = 'image') => {
    setState({ progress: 0, isUploading: true, error: null, publicUrl: null });

    try {
      // Step 1: Get presigned URL
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          category,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to get upload URL');
      }

      const { presignedUrl, publicUrl } = await res.json();

      // Step 2: Upload to storage with progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setState(prev => ({ ...prev, progress: Math.round((e.loaded / e.total) * 100) }));
          }
        };

        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      setState({ progress: 100, isUploading: false, error: null, publicUrl });
      return publicUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setState(prev => ({ ...prev, isUploading: false, error: message }));
      throw error;
    }
  }, []);

  return { ...state, upload };
}
```

---

### 2. Drag-and-Drop Upload Component

```tsx
// components/file-dropzone.tsx
'use client';

import { useCallback, useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { useFileUpload } from '@/hooks/use-file-upload';

interface FileDropzoneProps {
  accept?: string;
  maxSize?: number; // bytes
  onUploadComplete?: (url: string) => void;
}

export function FileDropzone({ accept = 'image/*', maxSize = 10 * 1024 * 1024, onUploadComplete }: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { progress, isUploading, error, upload } = useFileUpload();

  const handleFile = useCallback(async (file: File) => {
    if (file.size > maxSize) {
      alert(`File too large. Max size: ${maxSize / 1024 / 1024}MB`);
      return;
    }
    const url = await upload(file);
    if (url) onUploadComplete?.(url);
  }, [maxSize, upload, onUploadComplete]);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      className={`dropzone ${isDragOver ? 'dropzone--active' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload file"
    >
      <input ref={inputRef} type="file" accept={accept} onChange={onChange} hidden />

      {isUploading ? (
        <div className="upload-progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <span>{progress}%</span>
        </div>
      ) : (
        <p>Drag & drop a file here, or click to browse</p>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
```

---

### 3. Image Optimization with Sharp

```typescript
// lib/image-processing.ts
import sharp from 'sharp';

interface ProcessOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  /** Generate multiple sizes for responsive images */
  responsive?: boolean;
}

export async function processImage(buffer: Buffer, options: ProcessOptions = {}) {
  const { width = 1200, height, quality = 80, format = 'webp' } = options;

  const pipeline = sharp(buffer)
    .resize(width, height, { fit: 'inside', withoutEnlargement: true });

  switch (format) {
    case 'webp': return pipeline.webp({ quality }).toBuffer();
    case 'avif': return pipeline.avif({ quality }).toBuffer();
    case 'jpeg': return pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
    case 'png':  return pipeline.png({ compressionLevel: 9 }).toBuffer();
  }
}

/** Generate responsive image set */
export async function generateResponsiveSet(buffer: Buffer) {
  const sizes = [320, 640, 960, 1280, 1920];
  return Promise.all(
    sizes.map(async (w) => ({
      width: w,
      buffer: await processImage(buffer, { width: w, format: 'webp', quality: 80 }),
      key: `w${w}.webp`,
    })),
  );
}
```

---

### 4. Avatar Upload with Crop

```typescript
// lib/avatar.ts
import sharp from 'sharp';

export async function processAvatar(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(256, 256, {
      fit: 'cover',          // Crop to fill
      position: 'attention', // Smart crop (focus on faces/subjects)
    })
    .webp({ quality: 85 })
    .toBuffer();
}
```

---

### 5. File Validation & Security

```typescript
// lib/file-validator.ts
import { fileTypeFromBuffer } from 'file-type';

const MAGIC_BYTES_WHITELIST = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif',
  'application/pdf',
  'video/mp4', 'video/webm',
]);

export async function validateFile(buffer: Buffer, declaredMimeType: string): Promise<{ valid: boolean; detectedType?: string; error?: string }> {
  // Check magic bytes (not just extension/MIME header)
  const fileType = await fileTypeFromBuffer(buffer);

  if (!fileType) {
    return { valid: false, error: 'Unable to determine file type from content' };
  }

  if (!MAGIC_BYTES_WHITELIST.has(fileType.mime)) {
    return { valid: false, detectedType: fileType.mime, error: `File type ${fileType.mime} is not allowed` };
  }

  // Verify declared type matches actual type
  if (fileType.mime !== declaredMimeType) {
    return { valid: false, detectedType: fileType.mime, error: `Declared type ${declaredMimeType} doesn't match actual type ${fileType.mime}` };
  }

  return { valid: true, detectedType: fileType.mime };
}
```

---

### Common Pitfalls to Avoid

| Anti-Pattern | Problem | Correct Approach |
|---|---|---|
| Uploading through your API server | Memory pressure, timeout risk, bandwidth cost | Use presigned URLs for direct-to-storage uploads |
| Trusting file extension alone | Malicious files disguised as images | Validate magic bytes with `file-type` library |
| No file size limit | Storage abuse, OOM errors | Enforce limits both client-side and server-side |
| Storing originals only | Slow load times, excessive bandwidth | Generate optimized responsive variants |
| Public S3 bucket | Data breach risk | Use presigned URLs or CDN with signed URLs |
| Processing images synchronously in API | Blocks request, timeout | Process async (queue) or use on-the-fly transforms (Cloudflare Images) |

---

### Integration with Other Skills

- `cloud-hosting-expert` — CDN setup, Cloudflare R2/S3 configuration
- `senior-frontend` — Upload UI components, image optimization in Next.js
- `performance-web-vitals` — Image loading strategy (lazy loading, srcset, blur placeholder)
- `database-orm-expert` — Storing file metadata and references
- `production-ready-hardener` — File upload security audit
- `error-resilience-expert` — Upload retry logic and failure recovery

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan tingkat produksi untuk membangun sistem upload file yang aman dan performa tinggi serta pipeline pemrosesan media. Mencakup **pola upload presigned URL** (S3, R2, Supabase Storage), **upload multipart** dengan pelacakan progres, **optimasi gambar** (Sharp, Cloudflare Images, Vercel OG), **transcoding video** (Mux, Cloudflare Stream), **pembuatan PDF**, **validasi file & pemindaian virus**, **konfigurasi CDN**, dan **komponen UI drag-and-drop**.

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Mengimplementasikan fungsionalitas upload file (gambar, dokumen, video).
- Menyiapkan penyimpanan cloud (AWS S3, Cloudflare R2, Supabase Storage, UploadThing).
- Membangun pipeline pemrosesan gambar (resize, crop, watermark, konversi format).
- Mengimplementasikan komponen UI upload file drag-and-drop.
- Mengonfigurasi CDN untuk aset statis dan pengiriman media.
- Menghasilkan PDF atau memproses dokumen di sisi server.

### Panduan Pemilihan Storage

| Provider | Terbaik Untuk | Kekuatan Utama | Biaya Egress |
|---|---|---|---|
| **Cloudflare R2** | Hemat biaya, global | Tanpa biaya egress, kompatibel S3 | **$0** |
| **AWS S3** | Enterprise, ekosistem AWS | Paling matang, fitur lengkap | $0.09/GB |
| **Supabase Storage** | Aplikasi Supabase | Integrasi RLS, transform bawaan | Termasuk paket |
| **UploadThing** | Prototipe cepat | Komponen React, tanpa konfigurasi | Termasuk paket |

**Rekomendasi**: Gunakan **Cloudflare R2** untuk kebanyakan app produksi (tanpa egress, S3-kompatibel). Gunakan **Supabase Storage** jika sudah menggunakan Supabase.

### Kesalahan Umum yang Harus Dihindari

| Anti-Pola | Masalah | Pendekatan yang Benar |
|---|---|---|
| Upload melalui server API | Tekanan memori, risiko timeout | Gunakan presigned URL untuk upload langsung ke storage |
| Mempercayai ekstensi file saja | File berbahaya menyamar sebagai gambar | Validasi magic bytes dengan library `file-type` |
| Tidak ada batas ukuran file | Penyalahgunaan storage, error OOM | Terapkan batas di sisi klien dan server |
| Menyimpan file asli saja | Waktu muat lambat, bandwidth berlebih | Buat varian responsif yang teroptimasi |
| Bucket S3 publik | Risiko kebocoran data | Gunakan presigned URL atau CDN dengan signed URL |

### Integrasi dengan Skill Lain

- `cloud-hosting-expert` — Setup CDN, konfigurasi Cloudflare R2/S3
- `senior-frontend` — Komponen UI upload, optimasi gambar di Next.js
- `performance-web-vitals` — Strategi loading gambar (lazy loading, srcset, blur placeholder)
- `database-orm-expert` — Menyimpan metadata file dan referensi
- `production-ready-hardener` — Audit keamanan upload file
- `error-resilience-expert` — Logika retry upload dan pemulihan kegagalan