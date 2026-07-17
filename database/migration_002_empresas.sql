-- =====================================================================
-- Migracion: soporte multi-empresa (varias marcas/negocios, cada una
-- con su propio logo y datos) en vez de una configuracion global unica.
--
-- Requisito: debes haber ejecutado antes migration_001_logo_config.sql
-- (o tener ya la tabla "configuracion" de una version anterior).
-- Instalaciones nuevas no necesitan esta migracion: schema.sql ya
-- incluye la tabla "empresas" desde el inicio.
-- =====================================================================

USE cotizador;

CREATE TABLE IF NOT EXISTS empresas (
  id                       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre                   VARCHAR(150) NOT NULL,
  eslogan                  VARCHAR(200),
  subeslogan               VARCHAR(255),
  direccion                VARCHAR(300),
  telefono                 VARCHAR(30),
  email                    VARCHAR(150),
  rfc                      VARCHAR(20),
  logo_path                VARCHAR(255),
  condiciones_pago_default TEXT,
  vigencia_dias_default    INT UNSIGNED NOT NULL DEFAULT 15,
  activo                   TINYINT(1) NOT NULL DEFAULT 1,
  created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Migra la fila unica de "configuracion" como la primera empresa.
INSERT INTO empresas (nombre, eslogan, subeslogan, direccion, telefono, email, rfc, logo_path, condiciones_pago_default, vigencia_dias_default)
SELECT empresa_nombre, empresa_eslogan, empresa_subeslogan, direccion, telefono, email, rfc, logo_path, condiciones_pago_default, vigencia_dias_default
FROM configuracion WHERE id = 1;

ALTER TABLE cotizaciones
  ADD COLUMN empresa_id INT UNSIGNED NULL AFTER folio;

UPDATE cotizaciones
  SET empresa_id = (SELECT MIN(id) FROM empresas)
  WHERE empresa_id IS NULL;

ALTER TABLE cotizaciones
  MODIFY COLUMN empresa_id INT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_cotizaciones_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id);

CREATE INDEX idx_cotizaciones_empresa ON cotizaciones(empresa_id);

DROP TABLE IF EXISTS configuracion;
