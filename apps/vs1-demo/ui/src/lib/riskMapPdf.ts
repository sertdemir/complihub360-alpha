import { jsPDF } from 'jspdf';
import type { SearchProfile } from '../components/wizard/WizardContext';

// ─── Risk-map PDF export (User Flows §9 · wiring map A6) ─────────────────────
// Guest-allowed snapshot of the results overview. PII policy: only the
// whitelisted profile facts (markets · categories · business type) ever reach
// the document — never notes, e-mails, or names. Sources are resolved from the
// legal references in each obligation and listed with their official origin.

export interface PdfObligation {
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  market: string;
  due: string;
  dueSub: string;
  stateLabel: string;
}

// Brand palette — risk lives in petrol tones, never red (Brand Code 02).
const INK = '#0F172B';
const MUTED = '#6B7280';
const PETROL_DEEP = '#004D40';
const PETROL_MID = '#0F524D';
const PETROL_SOFT = '#427B72';
const GOLD = '#C7A14D';
const LINE = '#E4E4E7';

const SEVERITY_FILL: Record<PdfObligation['severity'], string> = {
  critical: PETROL_DEEP,
  high: PETROL_MID,
  medium: PETROL_SOFT,
  low: '#9CB8AF',
};

// Curated official sources, matched against the legal refs in the details.
const SOURCES: { pattern: RegExp; ref: string; origin: string }[] = [
  { pattern: /UStG §18i/, ref: 'UStG §18i (OSS)', origin: 'Umsatzsteuergesetz — gesetze-im-internet.de/ustg' },
  { pattern: /UStG §13b/, ref: 'UStG §13b (Reverse charge)', origin: 'Umsatzsteuergesetz — gesetze-im-internet.de/ustg' },
  { pattern: /VATA 1994/, ref: 'UK VATA 1994 §3', origin: 'Value Added Tax Act 1994 — legislation.gov.uk' },
  { pattern: /VerpackG/, ref: 'VerpackG Art. 9', origin: 'Verpackungsgesetz · LUCID — verpackungsregister.org' },
  { pattern: /Packaging Regs/, ref: 'UK Packaging Regs. 2023 §7', origin: 'Packaging Waste Regulations 2023 — legislation.gov.uk' },
  { pattern: /GDPR Art\. 6\/7/, ref: 'GDPR Art. 6 & 7', origin: 'Regulation (EU) 2016/679 — eur-lex.europa.eu' },
  { pattern: /GDPR Art\. 35/, ref: 'GDPR Art. 35 (DPIA)', origin: 'Regulation (EU) 2016/679 — eur-lex.europa.eu' },
  { pattern: /TTDSG §25/, ref: 'TTDSG §25', origin: 'Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz — gesetze-im-internet.de' },
  { pattern: /GwG §20/, ref: 'GwG §20 Abs. 1', origin: 'Geldwäschegesetz · Transparenzregister — gesetze-im-internet.de/gwg' },
];

// jsPDF's built-in fonts speak WinAnsi — swap only glyphs outside it (arrows
// etc.); dashes, quotes, €, § and · render fine and must survive.
function pdfSafe(s: string): string {
  return s
    .replace(/→/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF€–—‘’“”…]/g, '');
}

function profileLine(profile?: SearchProfile | null): string {
  if (!profile) return 'Anonymous assessment · example scope';
  // PII whitelist — nothing else from the profile enters the PDF.
  const bits: string[] = [];
  if (profile.markets?.length) bits.push(`Markets: ${profile.markets.join(' · ')}`);
  if (profile.categories?.length) bits.push(`Domains: ${profile.categories.join(', ')}`);
  if (profile.businessTypeNote || profile.businessType) bits.push(`Operations: ${profile.businessTypeNote || profile.businessType}`);
  return bits.length ? bits.join('   ·   ') : 'Anonymous assessment';
}

export function generateRiskMapPdf(opts: {
  obligations: PdfObligation[];
  stats: { value: string; label: string }[];
  profile?: SearchProfile | null;
}): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = 56;

  const ensureRoom = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 64) {
      doc.addPage();
      y = 56;
    }
  };

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFont('times', 'bold').setFontSize(18).setTextColor(INK);
  doc.text('CompliHub', M, y);
  const chWidth = doc.getTextWidth('CompliHub');
  doc.setTextColor(GOLD).text('360', M + chWidth + 2, y);
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(MUTED);
  doc.text('Compliance. Simplified.', M, y + 12);
  doc.text(`Generated ${new Date().toISOString().slice(0, 10)} · staging preview`, W - M, y, { align: 'right' });
  y += 40;

  doc.setDrawColor(LINE).setLineWidth(0.75).line(M, y, W - M, y);
  y += 32;

  // ── Title + scope ───────────────────────────────────────────────────────
  doc.setFont('times', 'bold').setFontSize(24).setTextColor(INK);
  doc.text('Your compliance risk map.', M, y);
  y += 20;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(MUTED);
  doc.text(profileLine(opts.profile), M, y);
  y += 28;

  // ── Stats row ───────────────────────────────────────────────────────────
  const statW = (W - 2 * M - 3 * 12) / 4;
  opts.stats.slice(0, 4).forEach((s, i) => {
    const x = M + i * (statW + 12);
    doc.setDrawColor(LINE).setLineWidth(0.75).roundedRect(x, y, statW, 46, 6, 6);
    doc.setFont('times', 'bold').setFontSize(16).setTextColor(PETROL_DEEP);
    doc.text(s.value, x + 12, y + 20);
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(MUTED);
    doc.text(s.label.toUpperCase(), x + 12, y + 34);
  });
  y += 70;

  // ── Obligations table ───────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(MUTED);
  const cols = { sev: M, title: M + 78, market: M + 320, due: M + 396, state: M + 460 };
  ['SEVERITY', 'OBLIGATION', 'MARKET', 'DUE', 'STATE'].forEach((h, i) => {
    doc.text(h, Object.values(cols)[i], y);
  });
  y += 8;
  doc.setDrawColor(LINE).line(M, y, W - M, y);
  y += 16;

  for (const raw of opts.obligations) {
    const o = { ...raw, title: pdfSafe(raw.title), detail: pdfSafe(raw.detail) };
    const detailLines = doc.setFont('helvetica', 'normal').setFontSize(7.5).splitTextToSize(o.detail, 226) as string[];
    const rowH = Math.max(30, 14 + detailLines.length * 9);
    ensureRoom(rowH + 8);

    // severity chip (petrol scale)
    doc.setFillColor(SEVERITY_FILL[o.severity]);
    doc.roundedRect(cols.sev, y - 8, 58, 14, 7, 7, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor('#FFFFFF');
    doc.text(o.severity.toUpperCase(), cols.sev + 29, y + 1.5, { align: 'center' });

    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(INK);
    doc.text(o.title, cols.title, y);
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(MUTED);
    doc.text(detailLines, cols.title, y + 11);

    doc.setFontSize(8).setTextColor(INK);
    doc.text(o.market, cols.market, y);
    doc.text(o.due, cols.due, y);
    doc.setTextColor(MUTED).setFontSize(7.5);
    doc.text(o.dueSub, cols.due, y + 10);
    doc.setTextColor(PETROL_MID).setFontSize(8);
    doc.text(o.stateLabel, cols.state, y);

    y += rowH;
    doc.setDrawColor(LINE).setLineWidth(0.5).line(M, y - 8, W - M, y - 8);
  }
  y += 16;

  // ── Sources ─────────────────────────────────────────────────────────────
  const found = SOURCES.filter((s) => opts.obligations.some((o) => s.pattern.test(o.detail)));
  if (found.length) {
    ensureRoom(30 + found.length * 14);
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(MUTED);
    doc.text('SOURCES', M, y);
    y += 14;
    doc.setFont('helvetica', 'normal').setFontSize(8);
    for (const s of found) {
      doc.setTextColor(INK).text(s.ref, M, y);
      doc.setTextColor(MUTED).text(s.origin, M + 150, y);
      y += 13;
    }
    y += 8;
  }

  // ── Footer on every page ────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const H = doc.internal.pageSize.getHeight();
    doc.setDrawColor(LINE).setLineWidth(0.5).line(M, H - 48, W - M, H - 48);
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(MUTED);
    doc.text(
      'CompliHub360 is an orchestration platform, not a law firm. Legal, tax and regulatory advice is delivered by Verified Partners under their own professional liability.',
      M, H - 36, { maxWidth: W - 2 * M - 60 },
    );
    doc.text(`${p} / ${pages}`, W - M, H - 36, { align: 'right' });
  }

  doc.save('complihub360-risk-map.pdf');
}
