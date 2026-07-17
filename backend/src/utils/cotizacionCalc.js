const IVA_RATE = parseFloat(process.env.IVA_RATE || '0.16');

// Calcula subtotal/descuento/iva/total a partir de las lineas de una cotizacion.
// items: [{ cantidad, precio_unitario, descuento_pct }]
// aplicaIva: si es false, el IVA se omite (total = subtotal - descuento).
function calcularTotales(items, aplicaIva = true) {
  let subtotal = 0;
  let descuentoTotal = 0;

  const lineas = items.map((item) => {
    const cantidad = Number(item.cantidad) || 0;
    const precioUnitario = Number(item.precio_unitario) || 0;
    const descuentoPct = Number(item.descuento_pct) || 0;

    const bruto = cantidad * precioUnitario;
    const descuento = bruto * (descuentoPct / 100);
    const lineaSubtotal = bruto - descuento;

    subtotal += lineaSubtotal;
    descuentoTotal += descuento;

    return { ...item, cantidad, precio_unitario: precioUnitario, descuento_pct: descuentoPct, subtotal: lineaSubtotal };
  });

  const iva = aplicaIva ? subtotal * IVA_RATE : 0;
  const total = subtotal + iva;

  return {
    lineas,
    subtotal: Number(subtotal.toFixed(2)),
    descuento_total: Number(descuentoTotal.toFixed(2)),
    iva: Number(iva.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

module.exports = { calcularTotales, IVA_RATE };
