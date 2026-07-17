const jwt = require('jsonwebtoken');
const pool = require('../config/db');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No se proporciono token de autenticacion' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

// Consulta en vivo (no desde el JWT) si el rol del usuario tiene la
// clave de permiso indicada, para que los cambios a un rol apliquen
// de inmediato sin esperar a que el usuario vuelva a iniciar sesion.
function requirePermiso(clave) {
  return async (req, res, next) => {
    try {
      const [[fila]] = await pool.query(
        'SELECT 1 FROM rol_permisos WHERE rol_id = ? AND permiso = ? LIMIT 1',
        [req.user.rol_id, clave]
      );
      if (!fila) {
        return res.status(403).json({ error: 'No tienes permisos para esta accion' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireAuth, requirePermiso };
