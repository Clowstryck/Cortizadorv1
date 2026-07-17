const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function obtenerPermisos(rolId) {
  const [rows] = await pool.query('SELECT permiso FROM rol_permisos WHERE rol_id = ?', [rolId]);
  return rows.map((r) => r.permiso);
}

router.post('/login', async (req, res, next) => {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    const [rows] = await pool.query(
      `SELECT u.*, r.nombre AS rol_nombre
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE u.usuario = ? AND u.activo = 1`,
      [usuario]
    );
    const encontrado = rows[0];
    if (!encontrado) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const valido = await bcrypt.compare(password, encontrado.password_hash);
    if (!valido) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const token = jwt.sign(
      { id: encontrado.id, nombre: encontrado.nombre, email: encontrado.email, rol_id: encontrado.rol_id, rol_nombre: encontrado.rol_nombre },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    const permisos = await obtenerPermisos(encontrado.rol_id);

    res.json({
      token,
      usuario: {
        id: encontrado.id, nombre: encontrado.nombre, email: encontrado.email,
        rol_id: encontrado.rol_id, rol_nombre: encontrado.rol_nombre, permisos,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [[rol]] = await pool.query('SELECT nombre FROM roles WHERE id = ?', [req.user.rol_id]);
    const permisos = await obtenerPermisos(req.user.rol_id);
    res.json({
      usuario: { ...req.user, rol_nombre: rol?.nombre || req.user.rol_nombre, permisos },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
