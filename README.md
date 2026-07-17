# Cotizador

Sistema de cotizacion para servicios de CCTV, alarmas, cerca electrica, software y mantenimientos.

- **Frontend:** Vue 3 + Vite + Tailwind CSS v4
- **Backend:** Node.js + Express
- **Base de datos:** MySQL (administrada con MySQL Workbench)

## Estructura del proyecto

```
Cotizador/
  backend/     API REST (Express + mysql2 + JWT + PDFKit)
  frontend/    App Vue 3 (Vite + Tailwind + Vue Router + Pinia)
  database/    schema.sql para crear la base de datos
```

## 1. Base de datos (MySQL Workbench)

1. Abre MySQL Workbench y conecta a tu servidor local.
2. Abre el archivo [`database/schema.sql`](database/schema.sql) y ejecutalo completo (crea la base `cotizador`,
   todas las tablas y los datos semilla de categorias: CCTV, Alarmas, Cerca Electrica, Software, Mantenimiento, Otros).

Si ya tenias la base de datos creada de una version anterior, ejecuta tambien, en orden, estas migraciones
(cada una es segura de correr una sola vez, sin perder tus datos):

1. [`database/migration_001_logo_config.sql`](database/migration_001_logo_config.sql) — agrega logo/datos de empresa, titulo y condiciones de pago.
2. [`database/migration_002_empresas.sql`](database/migration_002_empresas.sql) — convierte la configuracion unica en un catalogo de **empresas** (multi-negocio).
3. [`database/migration_003_cliente_ocasional.sql`](database/migration_003_cliente_ocasional.sql) — permite cotizar sin un cliente registrado (walk-in).
4. [`database/migration_004_aplica_iva.sql`](database/migration_004_aplica_iva.sql) — permite activar/desactivar el IVA por cotizacion.
5. [`database/migration_005_roles_permisos.sql`](database/migration_005_roles_permisos.sql) — reemplaza el rol fijo (`admin`/`ventas`) por roles con permisos configurables.

## 2. Backend

```bash
cd backend
npm install
copy .env.example .env      # en PowerShell: Copy-Item .env.example .env
```

Edita `.env` con tus datos de conexion a MySQL (`DB_USER`, `DB_PASSWORD`, etc.). Los datos de cada empresa
(nombre, logo, direccion, condiciones de pago, etc.) ya no van en `.env` — se administran desde la app, en
**Empresas** (solo visible para usuarios `admin`), donde puedes dar de alta tantas empresas/marcas como necesites.

Crea el primer usuario administrador:

```bash
node src/utils/seed.js "Tu Nombre" admin@empresa.com "unaContraseñaSegura"
```

Levanta la API:

```bash
npm run dev
```

La API queda disponible en `http://localhost:4000/api` (revisa `http://localhost:4000/api/health`).

## 3. Frontend

```bash
cd frontend
npm install
copy .env.example .env      # en PowerShell: Copy-Item .env.example .env
npm run dev
```

Abre la URL que muestra Vite (por defecto `http://localhost:5173`) e inicia sesion con el usuario admin creado en el paso anterior.

## Modulos incluidos

- **Autenticacion** con JWT. Cada usuario tiene un **rol con permisos configurables** (ver "Roles y permisos" abajo).
- **Roles y permisos** (requiere permiso `roles.gestionar`): crea los roles que necesites (ej. "Instalador",
  "Supervisor") y marca exactamente que puede hacer cada uno — ver/crear/editar/eliminar clientes, servicios
  y cotizaciones, cambiar estado de cotizaciones, ver reportes, gestionar empresas, etc. El rol **Administrador**
  viene con todos los permisos y es un rol de sistema: no se puede editar ni eliminar, para garantizar que
  siempre haya al menos un usuario con acceso total. El menu lateral se ajusta automaticamente segun los
  permisos del usuario que inicio sesion.
- **Usuarios** (requiere permiso `usuarios.gestionar`): alta, edicion (incluye cambiar de rol o resetear
  contraseña) y desactivacion de usuarios.
- **Clientes**: alta, edicion, busqueda y eliminacion (bloqueada si el cliente ya tiene cotizaciones).
- **Catalogo de servicios** por categoria (CCTV, Alarma, Cerca Electrica, Software, Mantenimiento, Otros),
  con atributos especificos por categoria (ej. canales de CCTV, metros lineales de cerca electrica, etc.).
- **Empresas** (solo `admin`): catalogo de empresas/marcas a nombre de las cuales se puede cotizar. Cada
  una tiene su propio nombre, eslogan, direccion, telefono, RFC, condiciones de pago y vigencia por
  defecto, y su propio logo (PNG/JPG/WEBP/SVG). Util si el mismo sistema cotiza para varias empresas o
  lineas de negocio distintas.
- **Cotizador**: arma cotizaciones eligiendo primero **con que empresa se emite**, luego el cliente y las
  lineas del catalogo o personalizadas, con calculo en vivo de subtotal, descuento, IVA y total. Al elegir
  la empresa se precargan su vigencia y condiciones de pago por defecto (editables antes de guardar). El
  cliente puede ser uno ya registrado o uno **sin registrar** (se captura nombre/empresa/telefono/email/
  direccion directo en la cotizacion); desde el detalle de la cotizacion se puede "Guardar como cliente"
  para darlo de alta en el catalogo sin volver a escribir los datos. Tambien se puede activar/desactivar
  el cobro de **IVA por cotizacion** (util cuando el cliente no requiere factura con IVA).
- **Cotizaciones**: listado con filtros por estado/folio/cliente, detalle, cambio de estado
  (borrador → enviada → aprobada/rechazada/cancelada), historial de cambios y descarga de PDF con el
  logo y datos de la empresa emisora, titulo, tabla de partidas, totales, notas y condiciones de pago.
- **Dashboard**: totales por estado, por categoria de servicio, por mes y top clientes.

## Notas

- La tasa de IVA se controla con la variable `IVA_RATE` en `backend/.env` (por defecto `0.16`) y aplica igual para todas las empresas.
- Los logos se guardan en `backend/uploads/` (fuera de git) y se sirven en `http://localhost:4000/uploads/<archivo>`.
  Se aceptan PNG/JPG/WEBP/SVG, pero se normalizan a PNG automaticamente al subirlos (PDFKit, la libreria que genera
  el PDF, solo soporta PNG/JPEG) — asi el logo siempre aparece en la cotizacion sin importar el formato original.
- Una empresa que ya tiene cotizaciones asociadas no se puede borrar (se desactiva en su lugar) para no romper el historial.
- Un rol que ya tiene usuarios asignados no se puede borrar, por la misma razon.
- Los permisos disponibles estan definidos en [`backend/src/constants/permisos.js`](backend/src/constants/permisos.js);
  agregar un permiso nuevo requiere codigo (no es editable desde la UI), pero que roles lo tengan si es 100% configurable.
- `node src/utils/seed.js "Nombre" email password` crea siempre un usuario con el rol **Administrador**.
