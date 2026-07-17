const express = require('express');
const pool = require('../config/db');
const { requireAuth, requirePermiso } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/resumen', requirePermiso('reportes.ver'), async (req, res, next) => {
  try {
    const [porEstado] = await pool.query(
      `SELECT estado, COUNT(*) AS cantidad, COALESCE(SUM(total), 0) AS monto
       FROM cotizaciones GROUP BY estado`
    );

    const [porCategoria] = await pool.query(
      `SELECT cat.nombre AS categoria, COUNT(d.id) AS lineas, COALESCE(SUM(d.subtotal), 0) AS monto
       FROM cotizacion_detalle d
       JOIN servicios s ON s.id = d.servicio_id
       JOIN categorias_servicio cat ON cat.id = s.categoria_id
       JOIN cotizaciones c ON c.id = d.cotizacion_id
       WHERE c.estado != 'cancelada'
       GROUP BY cat.nombre
       ORDER BY monto DESC`
    );

    const [porMes] = await pool.query(
      `SELECT DATE_FORMAT(fecha_emision, '%Y-%m') AS mes, COUNT(*) AS cantidad, COALESCE(SUM(total), 0) AS monto
       FROM cotizaciones
       WHERE fecha_emision >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       GROUP BY mes
       ORDER BY mes`
    );

    const [topClientes] = await pool.query(
      `SELECT cl.nombre AS cliente, COUNT(c.id) AS cotizaciones, COALESCE(SUM(c.total), 0) AS monto
       FROM cotizaciones c
       JOIN clientes cl ON cl.id = c.cliente_id
       WHERE c.estado != 'cancelada'
       GROUP BY cl.id, cl.nombre
       ORDER BY monto DESC
       LIMIT 10`
    );

    const [[totales]] = await pool.query(
      `SELECT COUNT(*) AS total_cotizaciones,
              COALESCE(SUM(CASE WHEN estado = 'aprobada' THEN total ELSE 0 END), 0) AS total_aprobado,
              COALESCE(SUM(total), 0) AS total_general
       FROM cotizaciones`
    );

    res.json({ totales, porEstado, porCategoria, porMes, topClientes });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
