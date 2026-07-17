const express = require('express');
const pool = require('../config/db');
const { requireAuth, requirePermiso } = require('../middleware/auth');
const { PERMISOS, CLAVES_VALIDAS } = require('../constants/permisos');

const router = express.Router();
router.use(requireAuth, requirePermiso('roles.gestionar'));

function validarPermisos(permisos) {
  if (!Array.isArray(permisos)) return 'permisos debe ser una lista';
  const invalidos = permisos.filter((p) => !CLAVES_VALIDAS.includes(p));
  if (invalidos.length) return `Permisos invalidos: ${invalidos.join(', ')}`;
  return null;
}

async function cargarRolConPermisos(id) {
  const [[rol]] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
  if (!rol) return null;
  const [permisosRows] = await pool.query('SELECT permiso FROM rol_permisos WHERE rol_id = ?', [id]);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM usuarios WHERE rol_id = ?', [id]);
  return { ...rol, permisos: permisosRows.map((r) => r.permiso), usuarios_asignados: total };
}

router.get('/permisos-disponibles', (req, res) => {
  res.json(PERMISOS);
});

router.get('/', async (req, res, next) => {
  try {
    const [roles] = await pool.query('SELECT * FROM roles ORDER BY es_sistema DESC, nombre');
    const conPermisos = await Promise.all(roles.map((r) => cargarRolConPermisos(r.id)));
    res.json(conPermisos);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const rol = await cargarRolConPermisos(req.params.id);
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });
    res.json(rol);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { nombre, descripcion, permisos = [] } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre del rol es requerido' });

    const errorPermisos = validarPermisos(permisos);
    if (errorPermisos) return res.status(400).json({ error: errorPermisos });

    await conn.beginTransaction();
    const [result] = await conn.query(
      'INSERT INTO roles (nombre, descripcion, es_sistema) VALUES (?, ?, 0)',
      [nombre, descripcion || null]
    );
    const id = result.insertId;
    for (const permiso of permisos) {
      await conn.query('INSERT INTO rol_permisos (rol_id, permiso) VALUES (?, ?)', [id, permiso]);
    }
    await conn.commit();

    const rol = await cargarRolConPermisos(id);
    res.status(201).json(rol);
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un rol con ese nombre' });
    }
    next(err);
  } finally {
    conn.release();
  }
});

router.put('/:id', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { nombre, descripcion, permisos } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre del rol es requerido' });

    const [[actual]] = await conn.query('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    if (!actual) return res.status(404).json({ error: 'Rol no encontrado' });
    if (actual.es_sistema) {
      return res.status(409).json({ error: 'El rol Administrador no se puede modificar' });
    }

    if (permisos !== undefined) {
      const errorPermisos = validarPermisos(permisos);
      if (errorPermisos) return res.status(400).json({ error: errorPermisos });
    }

    await conn.beginTransaction();
    await conn.query('UPDATE roles SET nombre = ?, descripcion = ? WHERE id = ?', [nombre, descripcion || null, req.params.id]);

    if (permisos !== undefined) {
      await conn.query('DELETE FROM rol_permisos WHERE rol_id = ?', [req.params.id]);
      for (const permiso of permisos) {
        await conn.query('INSERT INTO rol_permisos (rol_id, permiso) VALUES (?, ?)', [req.params.id, permiso]);
      }
    }
    await conn.commit();

    const rol = await cargarRolConPermisos(req.params.id);
    res.json(rol);
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un rol con ese nombre' });
    }
    next(err);
  } finally {
    conn.release();
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [[actual]] = await pool.query('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    if (!actual) return res.status(404).json({ error: 'Rol no encontrado' });
    if (actual.es_sistema) {
      return res.status(409).json({ error: 'El rol Administrador no se puede eliminar' });
    }

    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM usuarios WHERE rol_id = ?', [req.params.id]);
    if (total > 0) {
      return res.status(409).json({ error: 'No se puede eliminar: hay usuarios con este rol asignado' });
    }

    await pool.query('DELETE FROM roles WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
