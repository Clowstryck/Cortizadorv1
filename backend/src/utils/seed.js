// Crea el usuario administrador inicial.
// Uso: node src/utils/seed.js "Nombre Admin" nombreusuario "contraseñaSegura" [email@opcional.com]
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function main() {
  const [, , nombre, usuario, password, email] = process.argv;
  if (!nombre || !usuario || !password) {
    console.error('Uso: node src/utils/seed.js "Nombre Admin" nombreusuario "contraseña" [email@opcional.com]');
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 10);
  try {
    const [[rolAdmin]] = await pool.query('SELECT id FROM roles WHERE nombre = ?', ['Administrador']);
    if (!rolAdmin) {
      throw new Error('No existe el rol "Administrador". Ejecuta primero database/schema.sql (o la migracion de roles).');
    }
    await pool.query(
      'INSERT INTO usuarios (nombre, usuario, email, password_hash, rol_id) VALUES (?, ?, ?, ?, ?)',
      [nombre, usuario, email || null, password_hash, rolAdmin.id]
    );
    console.log(`Usuario admin creado: ${usuario}`);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.error('Ya existe un usuario con ese nombre de usuario');
    } else {
      console.error(err);
    }
  } finally {
    await pool.end();
  }
}

main();
