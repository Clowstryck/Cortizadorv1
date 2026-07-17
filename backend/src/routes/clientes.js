const express = require('express');
const pool = require('../config/db');
const { requireAuth, requirePermiso } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', requirePermiso('clientes.ver'), async (req, res, next) => {
  try {
    const { q } = req.query;
    let sql = 'SELECT * FROM clientes';
    const params = [];
    if (q) {
      sql += ' WHERE nombre LIKE ? OR empresa LIKE ? OR email LIKE ?';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    sql += ' ORDER BY nombre';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requirePermiso('clientes.ver'), async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', requirePermiso('clientes.crear'), async (req, res, next) => {
  try {
    const { nombre, empresa, rfc, telefono, email, direccion, notas } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

    const [result] = await pool.query(
      `INSERT INTO clientes (nombre, empresa, rfc, telefono, email, direccion, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, empresa || null, rfc || null, telefono || null, email || null, direccion || null, notas || null]
    );
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requirePermiso('clientes.editar'), async (req, res, next) => {
  try {
    const { nombre, empresa, rfc, telefono, email, direccion, notas } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

    await pool.query(
      `UPDATE clientes SET nombre = ?, empresa = ?, rfc = ?, telefono = ?, email = ?, direccion = ?, notas = ?
       WHERE id = ?`,
      [nombre, empresa || null, rfc || null, telefono || null, email || null, direccion || null, notas || null, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requirePermiso('clientes.eliminar'), async (req, res, next) => {
  try {
    const [used] = await pool.query(
      'SELECT id FROM cotizaciones WHERE cliente_id = ? LIMIT 1',
      [req.params.id]
    );
    if (used.length) {
      return res.status(409).json({ error: 'No se puede eliminar: el cliente tiene cotizaciones asociadas' });
    }
    await pool.query('DELETE FROM clientes WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
