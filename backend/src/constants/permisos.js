// Catalogo fijo de permisos que el sistema entiende. Los roles (tabla
// "roles" + "rol_permisos") deciden que subconjunto tiene cada uno; el
// catalogo en si no es editable desde la app.
const PERMISOS = [
  { clave: 'clientes.ver', grupo: 'Clientes', label: 'Ver clientes' },
  { clave: 'clientes.crear', grupo: 'Clientes', label: 'Crear clientes' },
  { clave: 'clientes.editar', grupo: 'Clientes', label: 'Editar clientes' },
  { clave: 'clientes.eliminar', grupo: 'Clientes', label: 'Eliminar clientes' },

  { clave: 'servicios.ver', grupo: 'Servicios', label: 'Ver catalogo de servicios' },
  { clave: 'servicios.crear', grupo: 'Servicios', label: 'Crear servicios' },
  { clave: 'servicios.editar', grupo: 'Servicios', label: 'Editar servicios' },
  { clave: 'servicios.eliminar', grupo: 'Servicios', label: 'Eliminar servicios' },

  { clave: 'cotizaciones.ver', grupo: 'Cotizaciones', label: 'Ver cotizaciones' },
  { clave: 'cotizaciones.crear', grupo: 'Cotizaciones', label: 'Crear cotizaciones' },
  { clave: 'cotizaciones.editar', grupo: 'Cotizaciones', label: 'Editar cotizaciones' },
  { clave: 'cotizaciones.cambiar_estado', grupo: 'Cotizaciones', label: 'Cambiar estado de cotizaciones' },

  { clave: 'empresas.ver', grupo: 'Empresas', label: 'Ver empresas' },
  { clave: 'empresas.gestionar', grupo: 'Empresas', label: 'Crear, editar y eliminar empresas' },

  { clave: 'usuarios.gestionar', grupo: 'Usuarios', label: 'Administrar usuarios' },
  { clave: 'roles.gestionar', grupo: 'Roles', label: 'Administrar roles y permisos' },

  { clave: 'reportes.ver', grupo: 'Reportes', label: 'Ver dashboard y reportes' },
];

const CLAVES_VALIDAS = PERMISOS.map((p) => p.clave);

module.exports = { PERMISOS, CLAVES_VALIDAS };
