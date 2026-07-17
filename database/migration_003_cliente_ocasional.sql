-- =====================================================================
-- Migracion: permitir cotizaciones sin cliente registrado (walk-in).
-- cliente_id pasa a ser opcional; si no se usa, se guardan los datos
-- del cliente directo en la cotizacion (cliente_nombre, etc.), y luego
-- se puede "guardar como cliente" para registrarlo en el catalogo.
-- =====================================================================

USE cotizador;

ALTER TABLE cotizaciones
  MODIFY COLUMN cliente_id INT UNSIGNED NULL,
  ADD COLUMN cliente_nombre    VARCHAR(200) AFTER cliente_id,
  ADD COLUMN cliente_empresa   VARCHAR(200) AFTER cliente_nombre,
  ADD COLUMN cliente_telefono  VARCHAR(30)  AFTER cliente_empresa,
  ADD COLUMN cliente_email     VARCHAR(150) AFTER cliente_telefono,
  ADD COLUMN cliente_direccion VARCHAR(300) AFTER cliente_email,
  ADD CONSTRAINT chk_cotizaciones_cliente_presente CHECK (cliente_id IS NOT NULL OR cliente_nombre IS NOT NULL);
