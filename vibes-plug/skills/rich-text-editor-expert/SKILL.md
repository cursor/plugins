---
name: rich-text-editor-expert
description: "Expert guide for rich text editor integration (Tiptap, Lexical, ProseMirror), collaborative editing, and custom extensions / Panduan ahli integrasi editor rich text (Tiptap, Lexical, ProseMirror), editing kolaboratif, dan ekstensi kustom."
author: "Roedy Rustam"
version: "4.3.0"
---

# Rich Text Editor Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
- **`realtime-collaboration-expert`**: Yjs/Automerge CRDTs for collaborative editing.
- **`form-validation-expert`**: Form integration patterns for editor content.
- **`headless-cms-expert`**: CMS schema integration for rich text fields.
- **`file-upload-media-expert`**: Image/video embedding within editor content.
- **`senior-frontend`**: React component patterns for editor wrappers.

### Description
Expert guide for integrating production-quality rich text editors into web applications. Covers Tiptap v2 (ProseMirror-based, extensible), Lexical (Meta's framework, high-performance), and ProseMirror (low-level, maximum control). Includes custom node/mark creation, collaborative editing with Yjs, slash commands, mention systems, image/video embedding, Portable Text output, and accessibility compliance.

### Trigger Conditions
- Adding a WYSIWYG or rich text editor to an application.
- Building collaborative document editing features.
- Creating custom editor extensions (mentions, slash commands, embeds).
- Choosing between Tiptap, Lexical, or ProseMirror.
- Implementing content serialization (HTML, JSON, Markdown, Portable Text).

---

### Editor Selection Guide

| Criteria | Tiptap v2 | Lexical (Meta) | ProseMirror |
|----------|-----------|----------------|-------------|
| Abstraction Level | High | Medium | Low |
| Framework | React, Vue, vanilla | React (primary) | Vanilla JS |
| Extension Ecosystem | ★★★★★ (50+ extensions) | ★★★ (growing) | ★★★★ (community) |
| Collaboration | Yjs built-in | Yjs plugin | Yjs via prosemirror-collab |
| Performance | ★★★★ | ★★★★★ | ★★★★ |
| Learning Curve | Low-Medium | Medium-High | High |
| **Best For** | Most apps, CMS | High-scale, messaging | Custom editors |

**Recommendation:** Use **Tiptap v2** for 90% of use cases. Use **Lexical** for high-performance messaging apps. Use **ProseMirror** only when you need full low-level control.

### Core Patterns

#### 1. Tiptap v2 Setup (React)

```tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';

const ydoc = new Y.Doc();

function RichEditor({ onUpdate }: { onUpdate: (json: object) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }), // Disable history for collab
      Placeholder.configure({ placeholder: 'Start writing...' }),
      Image.configure({ inline: true, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Collaboration.configure({ document: ydoc }),
    ],
    onUpdate: ({ editor }) => onUpdate(editor.getJSON()),
  });

  return (
    <div className="editor-wrapper">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="prose max-w-none" />
    </div>
  );
}
```

#### 2. Custom Slash Command Extension (Tiptap)

```typescript
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

export const SlashCommands = Extension.create({
  name: 'slashCommands',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        items: ({ query }) => [
          { title: 'Heading 1', command: ({ editor }) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
          { title: 'Bullet List', command: ({ editor }) => editor.chain().focus().toggleBulletList().run() },
          { title: 'Code Block', command: ({ editor }) => editor.chain().focus().toggleCodeBlock().run() },
          { title: 'Image', command: ({ editor }) => { /* open upload dialog */ } },
        ].filter((item) => item.title.toLowerCase().includes(query.toLowerCase())),
      },
    };
  },
  addProseMirrorPlugins() {
    return [Suggestion({ editor: this.editor, ...this.options.suggestion })];
  },
});
```

#### 3. Lexical Setup (React)

```tsx
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode } from '@lexical/code';

const editorConfig = {
  namespace: 'MyEditor',
  nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode],
  onError: (error: Error) => console.error(error),
  theme: { /* custom theme classes */ },
};

function LexicalEditor() {
  return (
    <LexicalComposer initialConfig={editorConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable className="prose" />}
        placeholder={<div className="text-gray-400">Start writing...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <AutoFocusPlugin />
    </LexicalComposer>
  );
}
```

#### 4. Content Serialization Patterns
- **JSON** (Tiptap/Lexical): Store editor state as JSON for exact restoration.
- **HTML**: Use `editor.getHTML()` for rendering in non-editor contexts.
- **Markdown**: Convert with `@tiptap/extension-markdown` for developer-facing content.
- **Portable Text** (Sanity): Map Tiptap nodes to Portable Text blocks for CMS storage.

### Production Checklist
- [ ] Content sanitization (DOMPurify) before rendering user HTML.
- [ ] Image upload with presigned URLs (not base64 in content).
- [ ] Keyboard shortcuts documented and accessible.
- [ ] Mobile-responsive toolbar (sticky or floating).
- [ ] Autosave with debounce (500ms) and conflict resolution.
- [ ] Max content length validation.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
- **`realtime-collaboration-expert`**: CRDT Yjs/Automerge untuk editing dokumen kolaboratif real-time.
- **`form-validation-expert`**: Pola integrasi formulir untuk konten rich text (Zod + React Hook Form).
- **`headless-cms-expert`**: Integrasi skema CMS untuk field rich text dan Portable Text.
- **`file-upload-media-expert`**: Upload gambar/video dengan presigned URL ke dalam konten editor.

### Deskripsi
Panduan ahli untuk mengintegrasikan editor rich text berkualitas produksi ke dalam aplikasi web. Mencakup Tiptap v2 (berbasis ProseMirror, modular), Lexical (framework berperforma tinggi dari Meta), dan ProseMirror murni. Termasuk pembuatan ekstensi kustom (slash commands, mention, blockquote kustom), kolaborasi real-time dengan Yjs, sanitasi DOMPurify, dan output JSON/HTML.

### Kondisi Pemicu
- Menambahkan editor WYSIWYG atau rich text ke aplikasi SaaS.
- Membangun fitur kolaborasi pengeditan dokumen langsung antar banyak pengguna.
- Membuat ekstensi kustom seperti slash commands (`/`), tag mention (`@`), atau embedding media.

---

### Implementasi Pola Kunci (TypeScript & React)

#### 1. Konfigurasi Editor Tiptap v2 dengan Ekstensi Lengkap
```tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';

export function EditorDokumen({ onPerubahan }: { onPerubahan: (json: object) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Ketik "/" untuk perintah...' }),
      Image.configure({ inline: true, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    onUpdate: ({ editor }) => onPerubahan(editor.getJSON()),
  });

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-900">
      <EditorContent editor={editor} className="prose dark:prose-invert max-w-none focus:outline-none" />
    </div>
  );
}
```

#### 2. Sanitasi Output HTML Mencegah XSS (DOMPurify)
```typescript
import DOMPurify from 'isomorphic-dompurify';

export function bersihkanHtmlKonten(htmlMentah: string): string {
  return DOMPurify.sanitize(htmlMentah, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'img', 'pre', 'code'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target'],
  });
}
```