-- =====================================================================
-- Sistema de Cotizacion - Esquema de base de datos
-- Motor: MySQL 8.x (usar con MySQL Workbench)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS cotizador
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cotizador;

-- ---------------------------------------------------------------------
-- Roles (con permisos configurables) y catalogo de permisos otorgados
-- por rol. "Administrador" es un rol de sistema (es_sistema=1): no se
-- puede editar ni eliminar, y siempre tiene todos los permisos, para
-- garantizar que siempre exista al menos un rol con acceso total.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Usuarios del sistema (equipo de ventas / administracion)
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(150) NOT NULL,
  usuario       VARCHAR(100) NOT NULL UNIQUE,
  email         VARCHAR(150),
  telefono      VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,
  rol_id        INT UNSIGNED NOT NULL,
  activo        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------
CREATE TABLE clientes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(200) NOT NULL,
  empresa     VARCHAR(200),
  rfc         VARCHAR(20),
  telefono    VARCHAR(30),
  email       VARCHAR(150),
  direccion   VARCHAR(300),
  notas       TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Categorias de servicio (CCTV, alarma, cerca electrica, software, etc.)
-- ---------------------------------------------------------------------
CREATE TABLE categorias_servicio (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clave       VARCHAR(50) NOT NULL UNIQUE,
  nombre      VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255),
  icono       VARCHAR(50),
  activo      TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Catalogo de servicios/productos
-- 'atributos' guarda campos especificos por categoria en JSON, por ejemplo:
--   CCTV:           { "resolucion": "4MP", "canales": 8, "almacenamiento_dias": 30 }
--   Alarma:         { "zonas": 8, "tipo_monitoreo": "24/7", "conectividad": "GSM" }
--   Cerca electrica:{ "metros_lineales": 100, "hilos": 6, "voltaje": "9000V" }
--   Software:       { "tipo_licencia": "anual", "usuarios": 5 }
--   Mantenimiento:  { "periodicidad": "mensual", "incluye_refacciones": false }
-- ---------------------------------------------------------------------
CREATE TABLE servicios (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  categoria_id     INT UNSIGNED NOT NULL,
  nombre           VARCHAR(200) NOT NULL,
  descripcion      TEXT,
  precio_unitario  DECIMAL(12,2) NOT NULL DEFAULT 0,
  unidad           VARCHAR(50) NOT NULL DEFAULT 'pieza',
  atributos        JSON,
  activo           TINYINT(1) NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_servicios_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias_servicio(id)
) ENGINE=InnoDB;

CREATE INDEX idx_servicios_categoria ON servicios(categoria_id);

-- ---------------------------------------------------------------------
-- Empresas (catalogo de marcas/negocios a nombre de los cuales se
-- pueden emitir cotizaciones -- cada una con su propio logo y datos).
-- ---------------------------------------------------------------------
CREATE TABLE empresas (
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

INSERT INTO empresas (nombre, eslogan, subeslogan, condiciones_pago_default, vigencia_dias_default)
VALUES (
  'Mi Empresa',
  'SERVICIOS TECNICOS EN INSTALACIONES Y REDES',
  'Instalacion, mantenimiento y soporte de sistemas de seguridad electronica y redes',
  'Contado / Transferencia / 50% anticipo y 50% al finalizar',
  15
);

-- ---------------------------------------------------------------------
-- Cotizaciones (encabezado)
-- cliente_id es NULL cuando la cotizacion se hizo para un cliente sin
-- registrar (walk-in); en ese caso se usan los campos cliente_* como
-- una copia libre de sus datos, capturados directo en la cotizacion.
-- ---------------------------------------------------------------------
CREATE TABLE cotizaciones (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  folio           VARCHAR(30) NOT NULL UNIQUE,
  empresa_id      INT UNSIGNED NOT NULL,
  cliente_id      INT UNSIGNED NULL,
  cliente_nombre    VARCHAR(200),
  cliente_empresa   VARCHAR(200),
  cliente_telefono  VARCHAR(30),
  cliente_email     VARCHAR(150),
  cliente_direccion VARCHAR(300),
  usuario_id      INT UNSIGNED NOT NULL,
  fecha_emision   DATE NOT NULL,
  validez_dias    INT UNSIGNED NOT NULL DEFAULT 15,
  estado          ENUM('borrador', 'enviada', 'aprobada', 'rechazada', 'cancelada') NOT NULL DEFAULT 'borrador',
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  descuento_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  aplica_iva      TINYINT(1) NOT NULL DEFAULT 1,
  iva             DECIMAL(12,2) NOT NULL DEFAULT 0,
  total           DECIMAL(12,2) NOT NULL DEFAULT 0,
  titulo          VARCHAR(255),
  condiciones_pago TEXT,
  notas           TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cotizaciones_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  CONSTRAINT fk_cotizaciones_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  CONSTRAINT fk_cotizaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT chk_cotizaciones_cliente_presente CHECK (cliente_id IS NOT NULL OR cliente_nombre IS NOT NULL)
) ENGINE=InnoDB;

CREATE INDEX idx_cotizaciones_empresa ON cotizaciones(empresa_id);
CREATE INDEX idx_cotizaciones_cliente ON cotizaciones(cliente_id);
CREATE INDEX idx_cotizaciones_estado ON cotizaciones(estado);
CREATE INDEX idx_cotizaciones_fecha ON cotizaciones(fecha_emision);

-- ---------------------------------------------------------------------
-- Detalle / lineas de la cotizacion
-- servicio_id puede ser NULL para permitir lineas personalizadas
-- ---------------------------------------------------------------------
CREATE TABLE cotizacion_detalle (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cotizacion_id   INT UNSIGNED NOT NULL,
  servicio_id     INT UNSIGNED NULL,
  descripcion     VARCHAR(300) NOT NULL,
  cantidad        DECIMAL(10,2) NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(12,2) NOT NULL DEFAULT 0,
  descuento_pct   DECIMAL(5,2) NOT NULL DEFAULT 0,
  subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
  orden           INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_detalle_cotizacion FOREIGN KEY (cotizacion_id)
    REFERENCES cotizaciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_servicio FOREIGN KEY (servicio_id)
    REFERENCES servicios(id)
) ENGINE=InnoDB;

CREATE INDEX idx_detalle_cotizacion ON cotizacion_detalle(cotizacion_id);

-- ---------------------------------------------------------------------
-- Historial de cambios de la cotizacion (auditoria)
-- ---------------------------------------------------------------------
CREATE TABLE cotizacion_historial (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cotizacion_id   INT UNSIGNED NOT NULL,
  usuario_id      INT UNSIGNED NULL,
  accion          VARCHAR(50) NOT NULL,
  estado_anterior VARCHAR(30),
  estado_nuevo    VARCHAR(30),
  comentario      TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_historial_cotizacion FOREIGN KEY (cotizacion_id)
    REFERENCES cotizaciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_historial_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE INDEX idx_historial_cotizacion ON cotizacion_historial(cotizacion_id);

-- =====================================================================
-- Datos semilla: categorias de servicio
-- =====================================================================
INSERT INTO categorias_servicio (clave, nombre, descripcion, icono) VALUES
  ('cctv',            'CCTV',                 'Camaras de videovigilancia y sistemas de monitoreo', 'camera'),
  ('alarma',          'Alarmas',              'Sistemas de alarma y deteccion de intrusion',        'bell'),
  ('cerca_electrica', 'Cerca Electrica',      'Cercas electricas perimetrales',                     'zap'),
  ('software',        'Software',             'Licencias y desarrollo de software',                 'code'),
  ('mantenimiento',   'Mantenimiento',        'Servicios de mantenimiento preventivo y correctivo', 'wrench'),
  ('otro',            'Otros Servicios',      'Servicios generales no clasificados',                'box');

-- =====================================================================
-- Datos semilla: roles y permisos
-- "Administrador" es un rol de sistema con todos los permisos (protegido
-- contra edicion/eliminacion). "Ventas" es un rol editable con un
-- subconjunto operativo tipico del equipo de ventas.
-- =====================================================================
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
