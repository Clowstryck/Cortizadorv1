-- =====================================================================
-- Migracion: permitir habilitar o deshabilitar el cobro de IVA por
-- cada cotizacion (algunos clientes no requieren factura con IVA).
-- =====================================================================

USE cotizador;

ALTER TABLE cotizaciones
  ADD COLUMN aplica_iva TINYINT(1) NOT NULL DEFAULT 1 AFTER descuento_total;
