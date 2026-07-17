require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const { notFound, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const clientesRoutes = require('./routes/clientes');
const categoriasRoutes = require('./routes/categorias');
const serviciosRoutes = require('./routes/servicios');
const cotizacionesRoutes = require('./routes/cotizaciones');
const cotizacionesPdfRoutes = require('./routes/cotizacionesPdf');
const reportesRoutes = require('./routes/reportes');
const empresasRoutes = require('./routes/empresas');
const rolesRoutes = require('./routes/roles');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/cotizaciones', cotizacionesRoutes);
app.use('/api/cotizaciones', cotizacionesPdfRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/roles', rolesRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API de cotizador escuchando en http://localhost:${PORT}`);
});
