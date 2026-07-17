const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../config/db');
const { requireAuth, requirePermiso } = require('../middleware/auth');
const { normalizarLogo } = require('../utils/logo');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('El logo debe ser una imagen (PNG, JPG, WEBP o SVG)'));
    }
    cb(null, true);
  },
});

router.use(requireAuth);

router.get('/', requirePermiso('empresas.ver'), async (req, res, next) => {
  try {
    const { incluir_inactivas } = req.query;
    const sql = incluir_inactivas
      ? 'SELECT * FROM empresas ORDER BY nombre'
      : 'SELECT * FROM empresas WHERE activo = 1 ORDER BY nombre';
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requirePermiso('empresas.ver'), async (req, res, next) => {
  try {
    const [[empresa]] = await pool.query('SELECT * FROM empresas WHERE id = ?', [req.params.id]);
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json(empresa);
  } catch (err) {
    next(err);
  }
});

router.post('/', requirePermiso('empresas.gestionar'), upload.single('logo'), async (req, res, next) => {
  try {
    const {
      nombre, eslogan, subeslogan, direccion, telefono, email, rfc,
      condiciones_pago_default, vigencia_dias_default,
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la empresa es requerido' });
    }

    const logoPath = req.file ? await normalizarLogo(UPLOADS_DIR, req.file.filename) : null;

    const [result] = await pool.query(
      `INSERT INTO empresas
         (nombre, eslogan, subeslogan, direccion, telefono, email, rfc, logo_path, condiciones_pago_default, vigencia_dias_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        eslogan || null,
        subeslogan || null,
        direccion || null,
        telefono || null,
        email || null,
        rfc || null,
        logoPath,
        condiciones_pago_default || null,
        vigencia_dias_default || 15,
      ]
    );

    const [[empresa]] = await pool.query('SELECT * FROM empresas WHERE id = ?', [result.insertId]);
    res.status(201).json(empresa);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requirePermiso('empresas.gestionar'), upload.single('logo'), async (req, res, next) => {
  try {
    const {
      nombre, eslogan, subeslogan, direccion, telefono, email, rfc,
      condiciones_pago_default, vigencia_dias_default, activo,
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la empresa es requerido' });
    }

    const [[actual]] = await pool.query('SELECT logo_path FROM empresas WHERE id = ?', [req.params.id]);
    if (!actual) return res.status(404).json({ error: 'Empresa no encontrada' });

    let logoPath = actual.logo_path;
    if (req.file) {
      if (actual.logo_path) {
        fs.unlink(path.join(UPLOADS_DIR, actual.logo_path), () => {});
      }
      logoPath = await normalizarLogo(UPLOADS_DIR, req.file.filename);
    }

    await pool.query(
      `UPDATE empresas
       SET nombre = ?, eslogan = ?, subeslogan = ?, direccion = ?, telefono = ?, email = ?, rfc = ?,
           logo_path = ?, condiciones_pago_default = ?, vigencia_dias_default = ?, activo = ?
       WHERE id = ?`,
      [
        nombre,
        eslogan || null,
        subeslogan || null,
        direccion || null,
        telefono || null,
        email || null,
        rfc || null,
        logoPath,
        condiciones_pago_default || null,
        vigencia_dias_default || 15,
        activo === undefined ? 1 : activo,
        req.params.id,
      ]
    );

    const [[empresa]] = await pool.query('SELECT * FROM empresas WHERE id = ?', [req.params.id]);
    res.json(empresa);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requirePermiso('empresas.gestionar'), async (req, res, next) => {
  try {
    const [used] = await pool.query(
      'SELECT id FROM cotizaciones WHERE empresa_id = ? LIMIT 1',
      [req.params.id]
    );
    if (used.length) {
      await pool.query('UPDATE empresas SET activo = 0 WHERE id = ?', [req.params.id]);
      return res.json({ ok: true, desactivada: true });
    }

    const [[actual]] = await pool.query('SELECT logo_path FROM empresas WHERE id = ?', [req.params.id]);
    await pool.query('DELETE FROM empresas WHERE id = ?', [req.params.id]);
    if (actual?.logo_path) {
      fs.unlink(path.join(UPLOADS_DIR, actual.logo_path), () => {});
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
