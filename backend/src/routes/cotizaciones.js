const express = require('express');
const pool = require('../config/db');
const { requireAuth, requirePermiso } = require('../middleware/auth');
const { calcularTotales } = require('../utils/cotizacionCalc');
const { cargarCotizacionCompleta } = require('../utils/cotizacionRepo');

const router = express.Router();
router.use(requireAuth);

const ESTADOS = ['borrador', 'enviada', 'aprobada', 'rechazada', 'cancelada'];
const ESTADOS_EDITABLES = ['borrador', 'enviada'];

// Acepta un cliente_id (cliente ya registrado) o un cliente_nuevo (walk-in,
// capturado libremente en la cotizacion). Devuelve null si no viene ninguno.
function resolverCliente(body) {
  const { cliente_id, cliente_nuevo } = body;
  if (cliente_id) {
    return {
      cliente_id,
      cliente_nombre: null,
      cliente_empresa: null,
      cliente_telefono: null,
      cliente_email: null,
      cliente_direccion: null,
    };
  }
  if (cliente_nuevo && cliente_nuevo.nombre) {
    return {
      cliente_id: null,
      cliente_nombre: cliente_nuevo.nombre,
      cliente_empresa: cliente_nuevo.empresa || null,
      cliente_telefono: cliente_nuevo.telefono || null,
      cliente_email: cliente_nuevo.email || null,
      cliente_direccion: cliente_nuevo.direccion || null,
    };
  }
  return null;
}

router.get('/', requirePermiso('cotizaciones.ver'), async (req, res, next) => {
  try {
    const { estado, cliente_id, empresa_id, q, mes, anio } = req.query;
    let sql = `
      SELECT c.id, c.folio, c.fecha_emision, c.estado, c.total, c.created_at,
             COALESCE(cl.nombre, c.cliente_nombre) AS cliente_nombre,
             u.nombre AS usuario_nombre, e.nombre AS empresa_nombre
      FROM cotizaciones c
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      JOIN usuarios u ON u.id = c.usuario_id
      JOIN empresas e ON e.id = c.empresa_id
      WHERE 1 = 1
    `;
    const params = [];

    if (estado) {
      sql += ' AND c.estado = ?';
      params.push(estado);
    }
    if (cliente_id) {
      sql += ' AND c.cliente_id = ?';
      params.push(cliente_id);
    }
    if (empresa_id) {
      sql += ' AND c.empresa_id = ?';
      params.push(empresa_id);
    }
    if (q) {
      sql += ' AND (c.folio LIKE ? OR cl.nombre LIKE ? OR c.cliente_nombre LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (mes) {
      sql += ' AND MONTH(c.fecha_emision) = ?';
      params.push(mes);
    }
    if (anio) {
      sql += ' AND YEAR(c.fecha_emision) = ?';
      params.push(anio);
    }
    sql += ' ORDER BY c.created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requirePermiso('cotizaciones.ver'), async (req, res, next) => {
  try {
    const cotizacion = await cargarCotizacionCompleta(req.params.id);
    if (!cotizacion) return res.status(404).json({ error: 'Cotizacion no encontrada' });
    res.json(cotizacion);
  } catch (err) {
    next(err);
  }
});

router.post('/', requirePermiso('cotizaciones.crear'), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { empresa_id, validez_dias, titulo, condiciones_pago, notas, items } = req.body;
    const aplicaIva = req.body.aplica_iva === undefined ? true : !!req.body.aplica_iva;
    const cliente = resolverCliente(req.body);
    if (!empresa_id || !cliente || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'empresa_id, un cliente (registrado o nuevo) y al menos una linea (items) son requeridos' });
    }

    const { lineas, subtotal, descuento_total, iva, total } = calcularTotales(items, aplicaIva);

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO cotizaciones
         (folio, empresa_id, cliente_id, cliente_nombre, cliente_empresa, cliente_telefono, cliente_email, cliente_direccion,
          usuario_id, fecha_emision, validez_dias, estado, subtotal, descuento_total, aplica_iva, iva, total, titulo, condiciones_pago, notas)
       VALUES ('TEMP', ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, 'borrador', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empresa_id, cliente.cliente_id, cliente.cliente_nombre, cliente.cliente_empresa,
        cliente.cliente_telefono, cliente.cliente_email, cliente.cliente_direccion,
        req.user.id, validez_dias || 15, subtotal, descuento_total, aplicaIva ? 1 : 0, iva, total,
        titulo || null, condiciones_pago || null, notas || null,
      ]
    );
    const id = result.insertId;
    const folio = `COT-${new Date().getFullYear()}-${String(id).padStart(5, '0')}`;
    await conn.query('UPDATE cotizaciones SET folio = ? WHERE id = ?', [folio, id]);

    for (const [index, linea] of lineas.entries()) {
      await conn.query(
        `INSERT INTO cotizacion_detalle
           (cotizacion_id, servicio_id, descripcion, cantidad, precio_unitario, descuento_pct, subtotal, orden)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, linea.servicio_id || null, linea.descripcion, linea.cantidad, linea.precio_unitario, linea.descuento_pct, linea.subtotal, index]
      );
    }

    await conn.query(
      `INSERT INTO cotizacion_historial (cotizacion_id, usuario_id, accion, estado_nuevo, comentario)
       VALUES (?, ?, 'creada', 'borrador', 'Cotizacion creada')`,
      [id, req.user.id]
    );

    await conn.commit();
    const cotizacion = await cargarCotizacionCompleta(id);
    res.status(201).json(cotizacion);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

router.put('/:id', requirePermiso('cotizaciones.editar'), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { empresa_id, validez_dias, titulo, condiciones_pago, notas, items } = req.body;
    const aplicaIva = req.body.aplica_iva === undefined ? true : !!req.body.aplica_iva;
    const cliente = resolverCliente(req.body);
    if (!empresa_id || !cliente || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'empresa_id, un cliente (registrado o nuevo) y al menos una linea (items) son requeridos' });
    }

    const [[actual]] = await conn.query('SELECT estado FROM cotizaciones WHERE id = ?', [req.params.id]);
    if (!actual) return res.status(404).json({ error: 'Cotizacion no encontrada' });
    if (!ESTADOS_EDITABLES.includes(actual.estado)) {
      return res.status(409).json({ error: `No se puede editar una cotizacion en estado "${actual.estado}"` });
    }

    const { lineas, subtotal, descuento_total, iva, total } = calcularTotales(items, aplicaIva);

    await conn.beginTransaction();

    await conn.query(
      `UPDATE cotizaciones
       SET empresa_id = ?, cliente_id = ?, cliente_nombre = ?, cliente_empresa = ?, cliente_telefono = ?,
           cliente_email = ?, cliente_direccion = ?, validez_dias = ?, titulo = ?, condiciones_pago = ?, notas = ?,
           subtotal = ?, descuento_total = ?, aplica_iva = ?, iva = ?, total = ?
       WHERE id = ?`,
      [
        empresa_id, cliente.cliente_id, cliente.cliente_nombre, cliente.cliente_empresa,
        cliente.cliente_telefono, cliente.cliente_email, cliente.cliente_direccion,
        validez_dias || 15, titulo || null, condiciones_pago || null, notas || null,
        subtotal, descuento_total, aplicaIva ? 1 : 0, iva, total, req.params.id,
      ]
    );

    await conn.query('DELETE FROM cotizacion_detalle WHERE cotizacion_id = ?', [req.params.id]);
    for (const [index, linea] of lineas.entries()) {
      await conn.query(
        `INSERT INTO cotizacion_detalle
           (cotizacion_id, servicio_id, descripcion, cantidad, precio_unitario, descuento_pct, subtotal, orden)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.params.id, linea.servicio_id || null, linea.descripcion, linea.cantidad, linea.precio_unitario, linea.descuento_pct, linea.subtotal, index]
      );
    }

    await conn.query(
      `INSERT INTO cotizacion_historial (cotizacion_id, usuario_id, accion, comentario)
       VALUES (?, ?, 'editada', 'Cotizacion actualizada')`,
      [req.params.id, req.user.id]
    );

    await conn.commit();
    const cotizacion = await cargarCotizacionCompleta(req.params.id);
    res.json(cotizacion);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

router.post('/:id/guardar-cliente', requirePermiso('clientes.crear'), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const [[cotizacion]] = await conn.query('SELECT * FROM cotizaciones WHERE id = ?', [req.params.id]);
    if (!cotizacion) return res.status(404).json({ error: 'Cotizacion no encontrada' });
    if (cotizacion.cliente_id) {
      return res.status(409).json({ error: 'Esta cotizacion ya tiene un cliente registrado' });
    }
    if (!cotizacion.cliente_nombre) {
      return res.status(409).json({ error: 'Esta cotizacion no tiene datos de cliente para guardar' });
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO clientes (nombre, empresa, telefono, email, direccion)
       VALUES (?, ?, ?, ?, ?)`,
      [cotizacion.cliente_nombre, cotizacion.cliente_empresa, cotizacion.cliente_telefono, cotizacion.cliente_email, cotizacion.cliente_direccion]
    );
    const clienteId = result.insertId;

    await conn.query('UPDATE cotizaciones SET cliente_id = ? WHERE id = ?', [clienteId, req.params.id]);
    await conn.query(
      `INSERT INTO cotizacion_historial (cotizacion_id, usuario_id, accion, comentario)
       VALUES (?, ?, 'cliente_guardado', 'Cliente registrado a partir de los datos de la cotizacion')`,
      [req.params.id, req.user.id]
    );

    await conn.commit();
    const actualizada = await cargarCotizacionCompleta(req.params.id);
    res.json(actualizada);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

router.patch('/:id/estado', requirePermiso('cotizaciones.cambiar_estado'), async (req, res, next) => {
  try {
    const { estado, comentario } = req.body;
    if (!ESTADOS.includes(estado)) {
      return res.status(400).json({ error: `Estado invalido. Usa uno de: ${ESTADOS.join(', ')}` });
    }

    const [[actual]] = await pool.query('SELECT estado FROM cotizaciones WHERE id = ?', [req.params.id]);
    if (!actual) return res.status(404).json({ error: 'Cotizacion no encontrada' });

    await pool.query('UPDATE cotizaciones SET estado = ? WHERE id = ?', [estado, req.params.id]);
    await pool.query(
      `INSERT INTO cotizacion_historial (cotizacion_id, usuario_id, accion, estado_anterior, estado_nuevo, comentario)
       VALUES (?, ?, 'cambio_estado', ?, ?, ?)`,
      [req.params.id, req.user.id, actual.estado, estado, comentario || null]
    );

    const cotizacion = await cargarCotizacionCompleta(req.params.id);
    res.json(cotizacion);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
