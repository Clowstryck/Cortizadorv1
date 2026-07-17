const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { requireAuth, requirePermiso } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requirePermiso('usuarios.gestionar'));

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.nombre, u.usuario, u.email, u.telefono, u.rol_id, r.nombre AS rol_nombre, u.activo, u.created_at
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       ORDER BY u.nombre`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { nombre, usuario, email, password, telefono, rol_id } = req.body;
    if (!nombre || !usuario || !password || !rol_id) {
      return res.status(400).json({ error: 'Nombre, usuario, contraseña y rol son requeridos' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, usuario, email, password_hash, telefono, rol_id) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, usuario, email || null, password_hash, telefono || null, rol_id]
    );
    res.status(201).json({ id: result.insertId, nombre, usuario, email: email || null, rol_id });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese nombre de usuario' });
    }
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { nombre, usuario, email, telefono, rol_id, activo, password } = req.body;
    const fields = [];
    const values = [];

    if (nombre !== undefined) { fields.push('nombre = ?'); values.push(nombre); }
    if (usuario !== undefined) { fields.push('usuario = ?'); values.push(usuario); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email || null); }
    if (telefono !== undefined) { fields.push('telefono = ?'); values.push(telefono); }
    if (rol_id !== undefined) { fields.push('rol_id = ?'); values.push(rol_id); }
    if (activo !== undefined) { fields.push('activo = ?'); values.push(activo); }
    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      fields.push('password_hash = ?');
      values.push(password_hash);
    }
    if (!fields.length) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    values.push(req.params.id);
    await pool.query(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese nombre de usuario' });
    }
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
