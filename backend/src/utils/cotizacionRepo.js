const pool = require('../config/db');

async function cargarCotizacionCompleta(id) {
  const [[cotizacion]] = await pool.query(
    `SELECT c.*,
            COALESCE(cl.nombre, c.cliente_nombre) AS cliente_nombre,
            COALESCE(cl.empresa, c.cliente_empresa) AS cliente_empresa,
            COALESCE(cl.email, c.cliente_email) AS cliente_email,
            COALESCE(cl.telefono, c.cliente_telefono) AS cliente_telefono,
            COALESCE(cl.direccion, c.cliente_direccion) AS cliente_direccion,
            u.nombre AS usuario_nombre, u.email AS usuario_email, u.telefono AS usuario_telefono,
            e.nombre AS empresa_nombre, e.eslogan AS empresa_eslogan, e.subeslogan AS empresa_subeslogan,
            e.direccion AS empresa_direccion, e.telefono AS empresa_telefono, e.email AS empresa_email,
            e.rfc AS empresa_rfc, e.logo_path AS empresa_logo_path
     FROM cotizaciones c
     LEFT JOIN clientes cl ON cl.id = c.cliente_id
     JOIN usuarios u ON u.id = c.usuario_id
     JOIN empresas e ON e.id = c.empresa_id
     WHERE c.id = ?`,
    [id]
  );
  if (!cotizacion) return null;

  const [items] = await pool.query(
    `SELECT d.*, s.nombre AS servicio_nombre
     FROM cotizacion_detalle d
     LEFT JOIN servicios s ON s.id = d.servicio_id
     WHERE d.cotizacion_id = ?
     ORDER BY d.orden`,
    [id]
  );

  const [historial] = await pool.query(
    `SELECT h.*, u.nombre AS usuario_nombre
     FROM cotizacion_historial h
     LEFT JOIN usuarios u ON u.id = h.usuario_id
     WHERE h.cotizacion_id = ?
     ORDER BY h.created_at DESC`,
    [id]
  );

  return { ...cotizacion, items, historial };
}

module.exports = { cargarCotizacionCompleta };
