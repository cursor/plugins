---
name: pdf-document-generation-expert
description: "Expert guide for PDF generation and document processing (React PDF, Puppeteer, jsPDF, pdf-lib) / Panduan ahli generasi PDF dan pemrosesan dokumen (React PDF, Puppeteer, jsPDF, pdf-lib)."
author: "Roedy Rustam"
version: "4.3.0"
---

# PDF & Document Generation Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Production guide for generating high-fidelity PDF documents, transactional invoices, financial reports, and certificates in modern web backends and serverless runtimes. Covers `@react-pdf/renderer` component architecture, server-side streaming buffers, font embedding with custom TrueType/WOFF metrics, Typst/WASM ultra-fast document compilation, and memory-safe PDF manipulation using `pdf-lib`. Enforces sovereign anti-slop visual standards (crisp monochrome/slate palettes, tabular numerals, 1px borders, zero generic purple gradients).

### Trigger Conditions
- Generating transactional billing invoices, tax receipts, or exportable financial summaries.
- Converting HTML views or React components into downloadable, pixel-perfect A4/Letter PDFs.
- Merging, watermarking, stamping, or digitally signing existing PDF contracts (`pdf-lib`).
- Overcoming serverless runtime memory/size limits where headless Chromium/Puppeteer is too heavy (>50MB).

### Production Invoicing Component (`@react-pdf/renderer`)

```tsx
// src/documents/InvoiceDocument.tsx
import { Document, Page, Text, View, StyleSheet, Font, renderToBuffer } from '@react-pdf/renderer';

// Sovereign typography and professional slate palette (Anti-Slop Pillar 7 compliant)
const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, color: '#0f172a', fontFamily: 'Helvetica' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  brandTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  metaLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 },
  metaValue: { fontSize: 10, fontWeight: 'medium', color: '#1e293b' },
  table: { marginTop: 24, borderTopWidth: 1, borderColor: '#e2e8f0' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 8, paddingHorizontal: 12 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f1f5f9', paddingVertical: 10, paddingHorizontal: 12 },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 2, textAlign: 'right' },
  colTotal: { flex: 2, textAlign: 'right' },
  totalSection: { marginTop: 16, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', width: 180, paddingVertical: 4 },
  grandTotal: { borderTopWidth: 1, borderColor: '#0f172a', paddingTop: 6, marginTop: 4, fontWeight: 'bold', fontSize: 12 },
});

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  customerName: string;
  customerEmail: string;
  items: { description: string; quantity: number; unitPrice: number }[];
}

export function InvoiceDocument({ invoice }: { invoice: InvoiceData }) {
  const subtotal = invoice.items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);

  return (
    <Document title={`Invoice-${invoice.invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brandTitle}>INVOICE</Text>
            <Text style={styles.metaLabel}>Invoice #{invoice.invoiceNumber}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.metaLabel}>Issue Date</Text>
            <Text style={styles.metaValue}>{invoice.issueDate}</Text>
          </View>
        </View>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.metaLabel}>Billed To</Text>
            <Text style={styles.metaValue}>{invoice.customerName}</Text>
            <Text style={{ fontSize: 9, color: '#64748b' }}>{invoice.customerEmail}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Amount</Text>
          </View>
          {invoice.items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>${item.unitPrice.toFixed(2)}</Text>
              <Text style={styles.colTotal}>${(item.quantity * item.unitPrice).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalSection}>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>Total Due:</Text>
            <Text>${subtotal.toFixed(2)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// Server API Route: stream to Buffer without writing to disk
export async function generateInvoicePdfBuffer(invoice: InvoiceData): Promise<Buffer> {
  return await renderToBuffer(<InvoiceDocument invoice={invoice} />);
}
```

## Orchestration & Integration
- **`saas-billing`**: Generates automated billing receipts and downloadable VAT invoices.
- **`email-notification-expert`**: Attaches generated PDF buffers to transactional customer emails.
- **`file-upload-media-expert`**: Streams generated PDFs to S3 or Cloudflare R2 bucket storage.
- **`anti-slop`**: Eliminates generic neon/purple design slop from official documentation.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Panduan produksi untuk menghasilkan dokumen PDF berkualitas tinggi, faktur tagihan (*invoice*), laporan keuangan, dan sertifikat pada backend web modern maupun lingkungan serverless. Mencakup arsitektur komponen `@react-pdf/renderer`, streaming buffer di sisi server tanpa penyimpanan disk sementara, penyematan font kustom, serta manipulasi dokumen PDF menggunakan `pdf-lib`. Menegakkan standar estetika visual anti-slop (palet warna slate/monokrom profesional, angka tabular, border 1px yang tajam, bebas gradien ungu generik).

### Kondisi Pemicu
- Menghasilkan faktur pembayaran, bukti transaksi (*receipt*), atau laporan pajak berkala dalam bentuk PDF.
- Mengonversi data dinamis menjadi dokumen PDF berukuran A4/Letter yang rapi dan konsisten.
- Menggabungkan (*merge*), memberi cap (*watermark*), atau menandatangani dokumen PDF secara digital (`pdf-lib`).
- Menghindari batasan memori serverless di mana Puppeteer/Chromium terlalu berat (>50MB).

### Endpoint API Streaming PDF di Next.js App Router

```typescript
// src/app/api/invoices/[id]/pdf/route.ts
import { NextResponse } from 'next/server';
import { generateInvoicePdfBuffer } from '@/documents/InvoiceDocument';
import { getInvoiceById } from '@/lib/db/invoices';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const invoice = await getInvoiceById(params.id);
  if (!invoice) {
    return NextResponse.json({ error: 'Faktur tidak ditemukan' }, { status: 404 });
  }

  const pdfBuffer = await generateInvoicePdfBuffer(invoice);

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
```

### 3 Aturan Emas Dokumen Keuangan
1. **Palet Warna Profesional**: Gunakan warna monokrom slate (`#0f172a`, `#64748b`) untuk menjaga kesan kredibel perbankan/FinTech. Hindari warna ungu mencolok atau efek bayangan berlebihan.
2. **Angka Tabular**: Pastikan kolom harga dan total menggunakan angka dengan lebar seragam agar desimal sejajar secara vertikal.
3. **Buffer Tanpa File Sementara**: Render langsung ke `Buffer` di memori untuk mencegah kebocoran penyimpanan disk pada container atau fungsi serverless.

## Integrasi Orkestrasi
- **`saas-billing`**: Menghasilkan faktur langganan dan rincian pajak secara otomatis.
- **`email-notification-expert`**: Melampirkan buffer file PDF pada email konfirmasi pembayaran.
- **`file-upload-media-expert`**: Mengunggah salinan arsip faktur ke penyimpanan Cloudflare R2 atau S3.
- **`anti-slop`**: Menjaga tata letak dokumen bebas dari artefak visual tiruan yang tidak rapi.