const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM categorias_servicio WHERE activo = 1 ORDER BY nombre'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
