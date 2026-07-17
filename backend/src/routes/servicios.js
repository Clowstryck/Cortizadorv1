const express = require('express');
const pool = require('../config/db');
const { requireAuth, requirePermiso } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', requirePermiso('servicios.ver'), async (req, res, next) => {
  try {
    const { categoria_id, q, incluir_inactivos } = req.query;
    let sql = `
      SELECT s.*, c.clave AS categoria_clave, c.nombre AS categoria_nombre
      FROM servicios s
      JOIN categorias_servicio c ON c.id = s.categoria_id
      WHERE 1 = 1
    `;
    const params = [];

    if (!incluir_inactivos) {
      sql += ' AND s.activo = 1';
    }
    if (categoria_id) {
      sql += ' AND s.categoria_id = ?';
      params.push(categoria_id);
    }
    if (q) {
      sql += ' AND (s.nombre LIKE ? OR s.descripcion LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    sql += ' ORDER BY c.nombre, s.nombre';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requirePermiso('servicios.ver'), async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM servicios WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', requirePermiso('servicios.crear'), async (req, res, next) => {
  try {
    const { categoria_id, nombre, descripcion, precio_unitario, unidad, atributos } = req.body;
    if (!categoria_id || !nombre || precio_unitario === undefined) {
      return res.status(400).json({ error: 'categoria_id, nombre y precio_unitario son requeridos' });
    }

    const [result] = await pool.query(
      `INSERT INTO servicios (categoria_id, nombre, descripcion, precio_unitario, unidad, atributos)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        categoria_id,
        nombre,
        descripcion || null,
        precio_unitario,
        unidad || 'pieza',
        atributos ? JSON.stringify(atributos) : null,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM servicios WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requirePermiso('servicios.editar'), async (req, res, next) => {
  try {
    const { categoria_id, nombre, descripcion, precio_unitario, unidad, atributos, activo } = req.body;
    if (!categoria_id || !nombre || precio_unitario === undefined) {
      return res.status(400).json({ error: 'categoria_id, nombre y precio_unitario son requeridos' });
    }

    await pool.query(
      `UPDATE servicios
       SET categoria_id = ?, nombre = ?, descripcion = ?, precio_unitario = ?, unidad = ?, atributos = ?, activo = ?
       WHERE id = ?`,
      [
        categoria_id,
        nombre,
        descripcion || null,
        precio_unitario,
        unidad || 'pieza',
        atributos ? JSON.stringify(atributos) : null,
        activo === undefined ? 1 : activo,
        req.params.id,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM servicios WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requirePermiso('servicios.eliminar'), async (req, res, next) => {
  try {
    const [used] = await pool.query(
      'SELECT id FROM cotizacion_detalle WHERE servicio_id = ? LIMIT 1',
      [req.params.id]
    );
    if (used.length) {
      // Ya fue usado en alguna cotizacion: se desactiva en vez de borrar para no romper el historial.
      await pool.query('UPDATE servicios SET activo = 0 WHERE id = ?', [req.params.id]);
      return res.json({ ok: true, desactivado: true });
    }
    await pool.query('DELETE FROM servicios WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
