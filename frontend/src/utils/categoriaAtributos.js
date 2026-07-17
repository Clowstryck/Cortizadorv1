// Campos especificos por categoria de servicio, guardados en la columna JSON "atributos".
export const CAMPOS_POR_CATEGORIA = {
  cctv: [
    { key: 'resolucion', label: 'Resolucion', type: 'text', placeholder: 'ej. 4MP' },
    { key: 'canales', label: 'Canales', type: 'number' },
    { key: 'almacenamiento_dias', label: 'Almacenamiento (dias)', type: 'number' },
  ],
  alarma: [
    { key: 'zonas', label: 'Zonas', type: 'number' },
    { key: 'tipo_monitoreo', label: 'Tipo de monitoreo', type: 'text', placeholder: 'ej. 24/7' },
    { key: 'conectividad', label: 'Conectividad', type: 'text', placeholder: 'ej. GSM, IP' },
  ],
  cerca_electrica: [
    { key: 'metros_lineales', label: 'Metros lineales', type: 'number' },
    { key: 'hilos', label: 'Numero de hilos', type: 'number' },
    { key: 'voltaje', label: 'Voltaje', type: 'text', placeholder: 'ej. 9000V' },
  ],
  software: [
    { key: 'tipo_licencia', label: 'Tipo de licencia', type: 'text', placeholder: 'ej. anual, perpetua' },
    { key: 'usuarios', label: 'Usuarios', type: 'number' },
  ],
  mantenimiento: [
    { key: 'periodicidad', label: 'Periodicidad', type: 'text', placeholder: 'ej. mensual, trimestral' },
    { key: 'incluye_refacciones', label: 'Incluye refacciones', type: 'checkbox' },
  ],
  otro: [],
}

export function camposPara(claveCategoria) {
  return CAMPOS_POR_CATEGORIA[claveCategoria] || []
}
