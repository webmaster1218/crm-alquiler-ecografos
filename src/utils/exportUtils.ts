/**
 * exportUtils.ts
 * Shared export utilities — generates real .xlsx files via SheetJS (xlsx)
 * and well-formed .xml files for all CRM views.
 */

import * as XLSX from 'xlsx';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export type ExportRow = Record<string, string | number | boolean | null | undefined>;

// ─────────────────────────────────────────
// Excel (.xlsx) Export  ← real Excel format
// ─────────────────────────────────────────

/**
 * Exports rows to a real .xlsx file using SheetJS.
 * The first row will be the header (bold + colored background in supported readers).
 *
 * @param headers  - Column display names (in order)
 * @param rows     - Array of objects; keys must match headers array
 * @param filename - Output filename (without extension)
 */
export function exportToExcel(
  headers: string[],
  rows: ExportRow[],
  filename: string
): void {
  // Build the 2D array: first row = headers, then data rows
  const sheetData: (string | number | boolean | null | undefined)[][] = [
    headers,
    ...rows.map(row => headers.map(h => row[h] ?? '')),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Column widths — auto-size based on longest value
  const colWidths = headers.map((h, colIdx) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(row => String(row[h] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;

  // Style the header row (bold, green background)
  // SheetJS CE (community edition) supports basic cell styles
  headers.forEach((_, colIdx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIdx });
    if (!ws[cellRef]) return;
    ws[cellRef].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '16A34A' } }, // emerald-600
      alignment: { horizontal: 'center' },
    };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');

  // Write and trigger download
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// Alias kept for backward compatibility
export const exportToCSV = exportToExcel;

// ─────────────────────────────────────────
// XML Export
// ─────────────────────────────────────────

/**
 * Exports an array of rows to a well-formed XML file.
 *
 * @param headers  - Column names (used as XML element tags, sanitized)
 * @param rows     - Array of objects
 * @param filename - Output filename (without extension)
 * @param rootTag  - Root XML element name (default: 'Exportacion')
 * @param rowTag   - Row XML element name (default: 'Registro')
 * @param meta     - Optional metadata attributes for the root element
 */
export function exportToXML(
  headers: string[],
  rows: ExportRow[],
  filename: string,
  rootTag = 'Exportacion',
  rowTag = 'Registro',
  meta: Record<string, string> = {}
): void {
  const sanitizeTag = (s: string) =>
    s.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/^([^a-zA-Z_])/, '_$1');

  const escapeXML = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const metaAttrs = Object.entries({
    fecha: new Date().toISOString().slice(0, 10),
    total: String(rows.length),
    ...meta,
  })
    .map(([k, v]) => ` ${sanitizeTag(k)}="${escapeXML(v)}"`)
    .join('');

  const rowsXML = rows
    .map(row => {
      const fields = headers
        .map(h => {
          const tag = sanitizeTag(h);
          return `    <${tag}>${escapeXML(row[h])}</${tag}>`;
        })
        .join('\n');
      return `  <${sanitizeTag(rowTag)}>\n${fields}\n  </${sanitizeTag(rowTag)}>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${sanitizeTag(rootTag)}${metaAttrs}>\n${rowsXML}\n</${sanitizeTag(rootTag)}>`;

  triggerDownload(xml, `${filename}.xml`, 'application/xml;charset=utf-8;');
}

// ─────────────────────────────────────────
// INFO TELOCALIZO TAG — Financial helpers
// ─────────────────────────────────────────

export interface FinancialOrderRow {
  pedido: string;
  canal: string;
  fecha: string;
  cliente: string;
  ciudad: string;
  metodoPago: string;
  ingresoBruto: number;
  cogs: number;
  flete: number;
  comisionBold: number;
  utilidadNeta: number;
  accesoApp: string;
}

export const FINANCIAL_HEADERS = [
  'Pedido',
  'Canal',
  'Fecha',
  'Cliente',
  'Ciudad',
  'Metodo Pago',
  'Ingreso Bruto',
  'COGS (Equipos)',
  'Flete',
  'Comision Bold',
  'Utilidad Neta',
  'Acceso App',
];

/**
 * Maps a FinancialOrderRow to the standard header keys for Excel/XML.
 */
export function mapFinancialRow(r: FinancialOrderRow): ExportRow {
  return {
    'Pedido': r.pedido,
    'Canal': r.canal,
    'Fecha': r.fecha,
    'Cliente': r.cliente,
    'Ciudad': r.ciudad,
    'Metodo Pago': r.metodoPago,
    'Ingreso Bruto': r.ingresoBruto,
    'COGS (Equipos)': r.cogs,
    'Flete': r.flete,
    'Comision Bold': Math.round(r.comisionBold),
    'Utilidad Neta': Math.round(r.utilidadNeta),
    'Acceso App': r.accesoApp,
  };
}

/**
 * Builds a totals summary row for financial exports.
 */
export function buildTotalsRow(rows: FinancialOrderRow[]): ExportRow {
  return {
    'Pedido': 'TOTALES',
    'Canal': '',
    'Fecha': '',
    'Cliente': `${rows.length} pedidos`,
    'Ciudad': '',
    'Metodo Pago': '',
    'Ingreso Bruto': rows.reduce((s, r) => s + r.ingresoBruto, 0),
    'COGS (Equipos)': rows.reduce((s, r) => s + r.cogs, 0),
    'Flete': rows.reduce((s, r) => s + r.flete, 0),
    'Comision Bold': Math.round(rows.reduce((s, r) => s + r.comisionBold, 0)),
    'Utilidad Neta': Math.round(rows.reduce((s, r) => s + r.utilidadNeta, 0)),
    'Acceso App': '',
  };
}

// ─────────────────────────────────────────
// Internal helper
// ─────────────────────────────────────────

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────
// Liquidación Oficial Alquiler de Ecógrafos (.xlsx)
// Genera el formato exacto multi-pestaña por mes o por rango de fechas
// ─────────────────────────────────────────

export interface LiquidacionRentalItem {
  id?: number | string;
  nombre_cliente?: string;
  client_name?: string;
  fecha_inicio?: string;
  start_date?: string;
  fecha_fin?: string;
  end_date?: string;
  precio_total?: number | string;
  total_price?: number | string;
  cantidad_z6?: number;
  quantity_z6?: number;
  cantidad_z60?: number;
  quantity_z60?: number;
  cantidad_m7?: number;
  quantity_m7?: number;
  cantidad_mx3?: number;
  quantity_mx3?: number;
  estado?: string;
  status?: string;
  notas?: string;
  notes?: string;
  fecha_pago?: string;
  domicilio?: number;
  info_cuenta?: string;
}

export interface ExportLiquidacionConfig {
  dateRange?: {
    start?: string;
    end?: string;
  };
  filename?: string;
  separateMonths?: boolean;
}

const MESES_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${dd}-${mm}-${yyyy.slice(2)}`;
  }
  return dateStr;
}

function buildLiquidacionSheet(records: LiquidacionRentalItem[]): XLSX.WorkSheet {
  const headers = [
    "FECHA PAGO ",
    "FECHA ALQUILER ",
    "CLIENTE ",
    "REFERENCIA ",
    "VALOR TOTAL ",
    "DOMICILIO ",
    "VALOR NETO ",
    "40 % DR MAURICIO ",
    "60 % FABRICA DE WINNERS",
    "INFO/CUENTA "
  ];

  let sumTotal = 0;
  let sumDomicilio = 0;
  let sumNeto = 0;
  let sum40 = 0;
  let sum60 = 0;

  const dataRows = records.map(r => {
    const clientName = (r.nombre_cliente || r.client_name || 'CLIENTE').toUpperCase().trim();
    const startDate = r.fecha_inicio || r.start_date || '';
    const endDate = r.fecha_fin || r.end_date || '';

    // Formato FECHA ALQUILER
    let fechaAlquiler = '';
    if (startDate && endDate && startDate !== endDate) {
      fechaAlquiler = `${formatDateShort(startDate)} AL ${formatDateShort(endDate)}`;
    } else if (startDate) {
      fechaAlquiler = formatDateShort(startDate);
    }

    // FECHA PAGO (o fecha de inicio por defecto)
    const fechaPago = r.fecha_pago ? formatDateShort(r.fecha_pago) : (startDate ? formatDateShort(startDate) : '');

    // Referencia de equipos
    const refs: string[] = [];
    const z6 = (r.cantidad_z6 ?? r.quantity_z6 ?? 0);
    const z60 = (r.cantidad_z60 ?? r.quantity_z60 ?? 0);
    const m7 = (r.cantidad_m7 ?? r.quantity_m7 ?? 0);
    const mx3 = (r.cantidad_mx3 ?? r.quantity_mx3 ?? 0);
    if (z6 > 0) refs.push(z6 > 1 ? `${z6}x Z6` : 'Z6');
    if (z60 > 0) refs.push(z60 > 1 ? `${z60}x Z60` : 'Z60');
    if (m7 > 0) refs.push(m7 > 1 ? `${m7}x M7` : 'M7');
    if (mx3 > 0) refs.push(mx3 > 1 ? `${mx3}x MX3` : 'MX3');
    if (refs.length === 0) {
      if ((r.notas || r.notes || '').includes('MX3')) refs.push('MX3');
      else refs.push('Z6');
    }
    const referencia = refs.join(', ');

    // Cálculos de liquidación
    const valorTotal = Number(r.precio_total ?? r.total_price ?? 0);
    const domicilio = typeof r.domicilio === 'number' ? r.domicilio : 70000;
    const valorNeto = Math.max(0, valorTotal - domicilio);
    const drMauricio = Math.round(valorNeto * 0.40);
    const fabricaWinners = Math.round(valorNeto * 0.60);
    const infoCuenta = r.info_cuenta || 'ECO ESPECIALIZADA ';

    sumTotal += valorTotal;
    sumDomicilio += domicilio;
    sumNeto += valorNeto;
    sum40 += drMauricio;
    sum60 += fabricaWinners;

    return [
      fechaPago,
      fechaAlquiler,
      clientName,
      referencia,
      valorTotal,
      domicilio,
      valorNeto,
      drMauricio,
      fabricaWinners,
      infoCuenta
    ];
  });

  const summaryRow = [
    null,
    null,
    null,
    null,
    sumTotal,
    sumDomicilio,
    sumNeto,
    sum40,
    sum60,
    null
  ];

  const sheetData: any[][] = [
    ["LIQUIDACIÓN  ALQUILER DE ECOGRAFOS .COM", null, null, null, null, null, null, null, null, "V"],
    [],
    headers,
    ...dataRows,
    summaryRow
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Ancho de columnas
  ws['!cols'] = [
    { wch: 15 }, // FECHA PAGO
    { wch: 25 }, // FECHA ALQUILER
    { wch: 35 }, // CLIENTE
    { wch: 16 }, // REFERENCIA
    { wch: 16 }, // VALOR TOTAL
    { wch: 14 }, // DOMICILIO
    { wch: 16 }, // VALOR NETO
    { wch: 22 }, // 40 % DR MAURICIO
    { wch: 26 }, // 60 % FABRICA DE WINNERS
    { wch: 22 }, // INFO/CUENTA
  ];

  return ws;
}

/**
 * Exporta liquidaciones en el formato idéntico a "LIQUIDACION ALQUILER DE ECOGRAFOS .xlsx".
 * Permite exportar multi-mes (pestaña por mes) o por rango de fechas seleccionado.
 */
export function exportLiquidacionExcel(
  rentals: LiquidacionRentalItem[],
  config: ExportLiquidacionConfig = {}
): void {
  const wb = XLSX.utils.book_new();

  // Filtrar por rango de fechas si se especifica
  let filtered = [...rentals];
  if (config.dateRange?.start) {
    filtered = filtered.filter(r => (r.fecha_fin || r.end_date || r.fecha_inicio || r.start_date || '') >= config.dateRange!.start!);
  }
  if (config.dateRange?.end) {
    filtered = filtered.filter(r => (r.fecha_inicio || r.start_date || '') <= config.dateRange!.end!);
  }

  // Ordenar por fecha cronológica
  filtered.sort((a, b) => {
    const da = a.fecha_inicio || a.start_date || '';
    const db = b.fecha_inicio || b.start_date || '';
    return da.localeCompare(db);
  });

  const separateMonths = config.separateMonths ?? true;

  if (separateMonths) {
    // Agrupar por mes
    const monthGroups: Record<number, LiquidacionRentalItem[]> = {};

    filtered.forEach(r => {
      const dateStr = r.fecha_inicio || r.start_date || '';
      if (dateStr) {
        const parts = dateStr.slice(0, 10).split('-');
        if (parts.length >= 2) {
          const m = parseInt(parts[1], 10) - 1;
          if (!monthGroups[m]) monthGroups[m] = [];
          monthGroups[m].push(r);
        }
      }
    });

    const monthIndexes = Object.keys(monthGroups).map(Number).sort((a, b) => a - b);

    if (monthIndexes.length > 0) {
      monthIndexes.forEach(m => {
        const sheetName = MESES_ES[m] || `MES_${m + 1}`;
        const ws = buildLiquidacionSheet(monthGroups[m]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
    }

    // Agregar pestaña de Consolidado General si hay múltiples meses o registros
    if (filtered.length > 0) {
      const wsConsolidado = buildLiquidacionSheet(filtered);
      XLSX.utils.book_append_sheet(wb, wsConsolidado, 'CONSOLIDADO');
    }
  } else {
    // Pestaña única para el rango de fechas
    let tabTitle = 'LIQUIDACION';
    if (config.dateRange?.start && config.dateRange?.end) {
      tabTitle = `${formatDateShort(config.dateRange.start)} A ${formatDateShort(config.dateRange.end)}`;
    }
    const ws = buildLiquidacionSheet(filtered);
    XLSX.utils.book_append_sheet(wb, ws, tabTitle.slice(0, 31));
  }

  // Nombre de archivo
  let outName = config.filename;
  if (!outName) {
    if (config.dateRange?.start && config.dateRange?.end) {
      outName = `LIQUIDACION_ECOGRAFOS_${config.dateRange.start}_AL_${config.dateRange.end}`;
    } else {
      outName = `LIQUIDACION_ALQUILER_DE_ECOGRAFOS_${new Date().getFullYear()}`;
    }
  }

  XLSX.writeFile(wb, `${outName}.xlsx`);
}
