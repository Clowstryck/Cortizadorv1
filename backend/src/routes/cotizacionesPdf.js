const fs = require('fs');
const path = require('path');
const express = require('express');
const PDFDocument = require('pdfkit');
const { requireAuth, requirePermiso } = require('../middleware/auth');
const { cargarCotizacionCompleta } = require('../utils/cotizacionRepo');
const { IVA_RATE } = require('../utils/cotizacionCalc');

const router = express.Router();
router.use(requireAuth, requirePermiso('cotizaciones.ver'));

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

const COLOR_PRIMARY = '#1F4E5F';
const COLOR_LABEL = '#555555';
const COLOR_TEXT = '#333333';
const COLOR_BORDER = '#CCCCCC';
const COLOR_ROW_ALT = '#FAFAFA';
const COLOR_TOTAL_BG = '#F2F2F2';

const PAGE_MARGIN = 50;
const PAGE_WIDTH = 612;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const CONTENT_BOTTOM = 742;

const COL_LEFT_X = PAGE_MARGIN;
const COL_LEFT_W = 245;
const COL_RIGHT_X = PAGE_MARGIN + 267;
const COL_RIGHT_W = 245;

function money(value) {
  return `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

router.get('/:id/pdf', async (req, res, next) => {
  try {
    const cotizacion = await cargarCotizacionCompleta(req.params.id);
    if (!cotizacion) return res.status(404).json({ error: 'Cotizacion no encontrada' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${cotizacion.folio}.pdf"`);

    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'letter' });
    doc.pipe(res);

    let y = drawHeader(doc, cotizacion);
    y = drawClienteVendedor(doc, cotizacion, y);
    y = drawTitulo(doc, cotizacion, y);
    y = drawItemsTable(doc, cotizacion, y);
    y = drawTotales(doc, cotizacion, y);
    y = drawNotaIva(doc, cotizacion, y);
    y = drawNotasCondiciones(doc, cotizacion, y);
    drawFirmas(doc, y);

    doc.end();
  } catch (err) {
    next(err);
  }
});

function ensureSpace(doc, y, needed) {
  if (y + needed > CONTENT_BOTTOM) {
    doc.addPage();
    return PAGE_MARGIN;
  }
  return y;
}

function drawHeader(doc, cotizacion) {
  const top = PAGE_MARGIN;
  let textX = COL_LEFT_X;
  let textWidth = 320;

  if (cotizacion.empresa_logo_path) {
    const logoFile = path.join(UPLOADS_DIR, cotizacion.empresa_logo_path);
    if (fs.existsSync(logoFile)) {
      try {
        doc.image(logoFile, COL_LEFT_X, top, { fit: [55, 55] });
        textX = COL_LEFT_X + 65;
        textWidth = 320 - 65;
      } catch (err) {
        // Si el archivo no es una imagen valida, continuamos sin logo.
      }
    }
  }

  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLOR_PRIMARY)
    .text(cotizacion.empresa_nombre || 'Mi Empresa', textX, top, { width: textWidth });

  let subY = top + 18;
  if (cotizacion.empresa_eslogan) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLOR_LABEL)
      .text(cotizacion.empresa_eslogan.toUpperCase(), textX, subY, { width: textWidth });
    subY += 11;
  }
  if (cotizacion.empresa_subeslogan) {
    doc.font('Helvetica').fontSize(7.5).fillColor(COLOR_LABEL)
      .text(cotizacion.empresa_subeslogan, textX, subY, { width: textWidth });
  }

  const rightX = COL_LEFT_X + 320;
  const rightW = CONTENT_WIDTH - 320;
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLOR_PRIMARY)
    .text('COTIZACIÓN', rightX, top, { width: rightW, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor(COLOR_TEXT)
    .text(`No.: ${cotizacion.folio}`, rightX, top + 18, { width: rightW, align: 'right' })
    .text(`Fecha: ${cotizacion.fecha_emision}`, rightX, top + 30, { width: rightW, align: 'right' })
    .text(`Vigencia: ${cotizacion.validez_dias} días`, rightX, top + 42, { width: rightW, align: 'right' });

  const lineY = top + 62;
  doc.moveTo(PAGE_MARGIN, lineY).lineTo(PAGE_MARGIN + CONTENT_WIDTH, lineY)
    .lineWidth(1.2).strokeColor(COLOR_PRIMARY).stroke();

  return lineY + 14;
}

function drawColumnBlock(doc, x, width, heading, lines) {
  let cy = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR_LABEL).text(heading, x, cy, { width });
  cy = doc.y + 2;
  doc.font('Helvetica').fontSize(9).fillColor(COLOR_TEXT);
  for (const line of lines) {
    doc.text(line, x, cy, { width });
    cy = doc.y + 1;
  }
  return cy;
}

function drawClienteVendedor(doc, cotizacion, y) {
  doc.y = y;
  const clienteLineas = [
    cotizacion.cliente_empresa
      ? `${cotizacion.cliente_nombre} (${cotizacion.cliente_empresa})`
      : cotizacion.cliente_nombre,
    cotizacion.cliente_direccion ? `Dirección: ${cotizacion.cliente_direccion}` : null,
    [cotizacion.cliente_telefono ? `Tel: ${cotizacion.cliente_telefono}` : null, cotizacion.cliente_email ? `Correo: ${cotizacion.cliente_email}` : null]
      .filter(Boolean).join('   ') || null,
  ].filter(Boolean);

  const vendedorLineas = [
    cotizacion.usuario_nombre,
    cotizacion.usuario_telefono ? `Tel: ${cotizacion.usuario_telefono}` : null,
  ].filter(Boolean);

  doc.y = y;
  const yLeft = drawColumnBlock(doc, COL_LEFT_X, COL_LEFT_W, 'DATOS DEL CLIENTE', clienteLineas);
  doc.y = y;
  const yRight = drawColumnBlock(doc, COL_RIGHT_X, COL_RIGHT_W, 'DATOS DEL VENDEDOR', vendedorLineas);

  return Math.max(yLeft, yRight) + 10;
}

function drawTitulo(doc, cotizacion, y) {
  if (!cotizacion.titulo) return y;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLOR_PRIMARY)
    .text(cotizacion.titulo, PAGE_MARGIN, y, { width: CONTENT_WIDTH });
  return doc.y + 10;
}

const COL_CANT_W = 50;
const COL_DESC_W = 282;
const COL_PU_W = 90;
const COL_TOTAL_W = 90;
const COL_CANT_X = PAGE_MARGIN;
const COL_DESC_X = COL_CANT_X + COL_CANT_W;
const COL_PU_X = COL_DESC_X + COL_DESC_W;
const COL_TOTAL_X = COL_PU_X + COL_PU_W;

function drawItemsTableHeader(doc, y) {
  const rowH = 22;
  doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, rowH).fillAndStroke(COLOR_PRIMARY, COLOR_BORDER);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF');
  doc.text('CANT.', COL_CANT_X, y + 6, { width: COL_CANT_W, align: 'center' });
  doc.text('DESCRIPCIÓN DEL SERVICIO / MATERIAL', COL_DESC_X + 6, y + 6, { width: COL_DESC_W - 12 });
  doc.text('COSTO UNIT.', COL_PU_X, y + 6, { width: COL_PU_W, align: 'center' });
  doc.text('COSTO TOTAL', COL_TOTAL_X, y + 6, { width: COL_TOTAL_W, align: 'center' });
  return y + rowH;
}

function drawItemsTable(doc, cotizacion, y) {
  y = ensureSpace(doc, y, 40);
  y = drawItemsTableHeader(doc, y);

  cotizacion.items.forEach((item, index) => {
    let detalle = item.descripcion;
    if (Number(item.descuento_pct) > 0) {
      detalle += `  (incluye descuento de ${Number(item.descuento_pct)}%)`;
    }
    const descHeight = doc.font('Helvetica').fontSize(9).heightOfString(detalle, { width: COL_DESC_W - 12 });
    const rowH = Math.max(20, descHeight + 8);

    y = ensureSpace(doc, y, rowH + 22);
    if (y === PAGE_MARGIN) {
      y = drawItemsTableHeader(doc, y);
    }

    if (index % 2 === 1) {
      doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, rowH).fill(COLOR_ROW_ALT);
    }
    doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, rowH).strokeColor(COLOR_BORDER).lineWidth(0.5).stroke();
    [COL_DESC_X, COL_PU_X, COL_TOTAL_X].forEach((x) => {
      doc.moveTo(x, y).lineTo(x, y + rowH).strokeColor(COLOR_BORDER).lineWidth(0.5).stroke();
    });

    doc.font('Helvetica').fontSize(9).fillColor(COLOR_TEXT);
    doc.text(String(item.cantidad), COL_CANT_X, y + 5, { width: COL_CANT_W, align: 'center' });
    doc.text(detalle, COL_DESC_X + 6, y + 5, { width: COL_DESC_W - 12 });
    doc.text(money(item.precio_unitario), COL_PU_X, y + 5, { width: COL_PU_W, align: 'center' });
    doc.text(money(item.subtotal), COL_TOTAL_X, y + 5, { width: COL_TOTAL_W - 6, align: 'right' });

    y += rowH;
  });

  return y + 10;
}

function drawTotales(doc, cotizacion, y) {
  y = ensureSpace(doc, y, 90);
  const labelX = PAGE_MARGIN + CONTENT_WIDTH - 220;
  const labelW = 120;
  const valueX = labelX + labelW;
  const valueW = 100;
  const rowH = 16;

  function row(label, value, opts = {}) {
    if (opts.bg) {
      doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, rowH + 4).fill(opts.bg);
    }
    doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 9.5)
      .fillColor(opts.color || COLOR_TEXT);
    doc.text(label, labelX, y + 3, { width: labelW, align: 'right' });
    doc.text(value, valueX, y + 3, { width: valueW, align: 'right' });
    y += rowH + (opts.bg ? 4 : 0);
  }

  row('Subtotal:', money(cotizacion.subtotal));
  if (Number(cotizacion.descuento_total) > 0) {
    row('Descuento:', money(cotizacion.descuento_total));
  }
  if (cotizacion.aplica_iva) {
    row(`IVA (${Math.round(IVA_RATE * 100)}%):`, money(cotizacion.iva));
  }
  row('TOTAL:', money(cotizacion.total), { bold: true, size: 11.5, color: COLOR_PRIMARY, bg: COLOR_TOTAL_BG });

  return y + 8;
}

function drawNotaIva(doc, cotizacion, y) {
  const texto = cotizacion.aplica_iva
    ? '* Precios en pesos mexicanos (MXN). El IVA ya esta incluido en el total mostrado.'
    : '* Precios en pesos mexicanos (MXN). Esta cotizacion no incluye IVA.';
  doc.font('Helvetica-Oblique').fontSize(8).fillColor(COLOR_LABEL)
    .text(texto, PAGE_MARGIN, y, { width: CONTENT_WIDTH });
  return doc.y + 12;
}

function drawNotasCondiciones(doc, cotizacion, y) {
  const notasLineas = cotizacion.notas ? [cotizacion.notas] : ['—'];
  const condicionesLineas = [
    cotizacion.condiciones_pago || '—',
    `Vigencia de la cotización: ${cotizacion.validez_dias} días`,
  ];

  y = ensureSpace(doc, y, 50);
  doc.y = y;
  const yLeft = drawColumnBlock(doc, COL_LEFT_X, COL_LEFT_W, 'NOTAS Y OBSERVACIONES', notasLineas);
  doc.y = y;
  const yRight = drawColumnBlock(doc, COL_RIGHT_X, COL_RIGHT_W, 'CONDICIONES DE PAGO', condicionesLineas);

  return Math.max(yLeft, yRight) + 30;
}

const FIRMA_BLOCK_HEIGHT = 45;

function drawFirmas(doc, y) {
  const idealY = CONTENT_BOTTOM - FIRMA_BLOCK_HEIGHT;
  let firmaY;
  if (y <= idealY) {
    firmaY = idealY;
  } else if (y + FIRMA_BLOCK_HEIGHT <= CONTENT_BOTTOM) {
    firmaY = y;
  } else {
    doc.addPage();
    firmaY = idealY;
  }

  const lineY = firmaY + 25;

  doc.moveTo(COL_LEFT_X, lineY).lineTo(COL_LEFT_X + COL_LEFT_W - 20, lineY)
    .strokeColor(COLOR_TEXT).lineWidth(0.5).stroke();
  doc.moveTo(COL_RIGHT_X, lineY).lineTo(COL_RIGHT_X + COL_RIGHT_W - 20, lineY)
    .strokeColor(COLOR_TEXT).lineWidth(0.5).stroke();

  doc.font('Helvetica').fontSize(8.5).fillColor(COLOR_TEXT);
  doc.text('Vendedor — Nombre y firma', COL_LEFT_X, lineY + 4, { width: COL_LEFT_W - 20 });
  doc.text('Cliente — Nombre y firma', COL_RIGHT_X, lineY + 4, { width: COL_RIGHT_W - 20 });
}

module.exports = router;
