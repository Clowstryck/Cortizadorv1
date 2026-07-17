-- =====================================================================
-- Migracion: logo/datos de empresa configurables + titulo y condiciones
-- de pago por cotizacion.
-- Ejecutar solo si tu base de datos "cotizador" ya existia antes de este
-- cambio (instalaciones nuevas ya incluyen esto en schema.sql).
-- =====================================================================

USE cotizador;

ALTER TABLE usuarios
  ADD COLUMN telefono VARCHAR(30) AFTER email;

ALTER TABLE cotizaciones
  ADD COLUMN titulo VARCHAR(255) AFTER total,
  ADD COLUMN condiciones_pago TEXT AFTER titulo;

CREATE TABLE IF NOT EXISTS configuracion (
  id                       TINYINT UNSIGNED PRIMARY KEY DEFAULT 1,
  empresa_nombre           VARCHAR(150) NOT NULL DEFAULT 'Mi Empresa',
  empresa_eslogan          VARCHAR(200),
  empresa_subeslogan       VARCHAR(255),
  direccion                VARCHAR(300),
  telefono                 VARCHAR(30),
  email                    VARCHAR(150),
  rfc                      VARCHAR(20),
  logo_path                VARCHAR(255),
  condiciones_pago_default TEXT,
  vigencia_dias_default    INT UNSIGNED NOT NULL DEFAULT 15,
  updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_configuracion_single_row CHECK (id = 1)
) ENGINE=InnoDB;

INSERT IGNORE INTO configuracion (id, empresa_nombre, empresa_eslogan, empresa_subeslogan, condiciones_pago_default, vigencia_dias_default)
VALUES (
  1,
  'Mi Empresa',
  'SERVICIOS TECNICOS EN INSTALACIONES Y REDES',
  'Instalacion, mantenimiento y soporte de sistemas de seguridad electronica y redes',
  'Contado / Transferencia / 50% anticipo y 50% al finalizar',
  15
);
