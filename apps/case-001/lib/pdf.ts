import { PDFDocument, StandardFonts } from "pdf-lib";

function money(value: unknown, currency: string) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(Number(value ?? 0));
}

function safe(value: unknown) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").slice(0, 120);
}

export async function buildQuotePdf(quote: any) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 790;

  const line = (text: string, options?: { bold?: boolean; size?: number; gap?: number }) => {
    if (y < 70) {
      page = pdf.addPage([595.28, 841.89]);
      y = 790;
    }
    const size = options?.size ?? 10;
    page.drawText(text, { x: 48, y, size, font: options?.bold ? bold : font });
    y -= options?.gap ?? size + 7;
  };

  line("COTIZACION", { bold: true, size: 20, gap: 30 });
  line(`Referencia: ${safe(quote.id)}`, { bold: true });
  line(`Version: ${Number(quote.version ?? 1)}`);
  line(`Cliente WhatsApp: ${safe(quote.customer_phone)}`);
  line(`Moneda: ${safe(quote.currency)}`);
  line(`Fecha: ${new Date(quote.created_at).toLocaleString("es-PE")}`, { gap: 24 });

  line("Detalle", { bold: true, size: 13, gap: 22 });
  for (const item of quote.case001_quote_lines ?? []) {
    line(`${safe(item.sku)} - ${safe(item.description)}`, { bold: true });
    line(`Cantidad: ${Number(item.quantity)} | P. unitario: ${money(item.quoted_unit_price, quote.currency)} | Desc.: ${Number(item.discount_pct ?? 0)}%`, { gap: 19 });
  }

  y -= 8;
  line(`Subtotal: ${money(quote.subtotal, quote.currency)}`, { bold: true });
  line(`IGV: ${money(quote.tax_total, quote.currency)}`, { bold: true });
  line(`TOTAL: ${money(quote.total, quote.currency)}`, { bold: true, size: 15, gap: 30 });

  line("La disponibilidad se basa en el ultimo snapshot SAP importado al preparar la cotizacion.", { size: 9 });
  line("La propuesta queda sujeta a las condiciones comerciales y vigencia configuradas para el piloto.", { size: 9 });

  return pdf.save();
}
