-- =====================================================================
-- Migracion: login por nombre de usuario en vez de email.
-- El email pasa a ser opcional (solo informativo); el campo "usuario"
-- es el que se usa para iniciar sesion.
-- =====================================================================

USE cotizador;

ALTER TABLE usuarios
  MODIFY COLUMN email VARCHAR(150) NULL,
  ADD COLUMN usuario VARCHAR(100) NULL AFTER nombre;

-- Genera un nombre de usuario a partir del email existente (o del nombre
-- si no tuviera email), evitando duplicados.
UPDATE usuarios SET usuario = SUBSTRING_INDEX(email, '@', 1) WHERE usuario IS NULL AND email IS NOT NULL;
UPDATE usuarios SET usuario = CONCAT(LOWER(REPLACE(nombre, ' ', '')), id) WHERE usuario IS NULL;

ALTER TABLE usuarios
  MODIFY COLUMN usuario VARCHAR(100) NOT NULL,
  ADD CONSTRAINT uq_usuarios_usuario UNIQUE (usuario);
