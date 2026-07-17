-- =====================================================================
-- Migracion: roles con permisos configurables, en vez del ENUM fijo
-- usuarios.rol ('admin', 'ventas').
-- =====================================================================

USE cotizador;

CREATE TABLE roles (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(255),
  es_sistema  TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE rol_permisos (
  rol_id  INT UNSIGNED NOT NULL,
  permiso VARCHAR(100) NOT NULL,
  PRIMARY KEY (rol_id, permiso),
  CONSTRAINT fk_rol_permisos_rol FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO roles (nombre, descripcion, es_sistema) VALUES
  ('Administrador', 'Acceso total al sistema. Rol protegido, no editable.', 1),
  ('Ventas', 'Rol por defecto para el equipo de ventas.', 0);

INSERT INTO rol_permisos (rol_id, permiso)
SELECT (SELECT id FROM roles WHERE nombre = 'Administrador'), permiso FROM (
  SELECT 'clientes.ver' AS permiso UNION ALL SELECT 'clientes.crear' UNION ALL SELECT 'clientes.editar' UNION ALL SELECT 'clientes.eliminar'
  UNION ALL SELECT 'servicios.ver' UNION ALL SELECT 'servicios.crear' UNION ALL SELECT 'servicios.editar' UNION ALL SELECT 'servicios.eliminar'
  UNION ALL SELECT 'cotizaciones.ver' UNION ALL SELECT 'cotizaciones.crear' UNION ALL SELECT 'cotizaciones.editar' UNION ALL SELECT 'cotizaciones.cambiar_estado'
  UNION ALL SELECT 'empresas.ver' UNION ALL SELECT 'empresas.gestionar'
  UNION ALL SELECT 'usuarios.gestionar' UNION ALL SELECT 'roles.gestionar'
  UNION ALL SELECT 'reportes.ver'
) t;

INSERT INTO rol_permisos (rol_id, permiso)
SELECT (SELECT id FROM roles WHERE nombre = 'Ventas'), permiso FROM (
  SELECT 'clientes.ver' AS permiso UNION ALL SELECT 'clientes.crear' UNION ALL SELECT 'clientes.editar'
  UNION ALL SELECT 'servicios.ver'
  UNION ALL SELECT 'cotizaciones.ver' UNION ALL SELECT 'cotizaciones.crear' UNION ALL SELECT 'cotizaciones.editar' UNION ALL SELECT 'cotizaciones.cambiar_estado'
  UNION ALL SELECT 'empresas.ver'
  UNION ALL SELECT 'reportes.ver'
) t;

ALTER TABLE usuarios ADD COLUMN rol_id INT UNSIGNED NULL AFTER rol;

UPDATE usuarios SET rol_id = (SELECT id FROM roles WHERE nombre = 'Administrador') WHERE rol = 'admin';
UPDATE usuarios SET rol_id = (SELECT id FROM roles WHERE nombre = 'Ventas') WHERE rol = 'ventas';

ALTER TABLE usuarios
  MODIFY COLUMN rol_id INT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles(id),
  DROP COLUMN rol;
