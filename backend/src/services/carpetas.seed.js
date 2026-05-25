// Árbol SGC estándar basado en ISO 9001:2015 para IES de FP
// Se carga automáticamente al crear un centro nuevo
const ARBOL_SGC = [
  { codigo: '4', nombre: '4. Sistema de Gestión de Calidad', hijos: [
    { codigo: '4.1', nombre: '4.1 Contexto de la organización' },
    { codigo: '4.2', nombre: '4.2 Control de documentos', hijos: [
      { codigo: 'f-4.2', nombre: 'Formatos' },
    ]},
  ]},
  { codigo: '5', nombre: '5. Liderazgo y Dirección', hijos: [
    { codigo: '5.1', nombre: '5.1 Liderazgo y compromiso' },
    { codigo: '5.4', nombre: '5.4 Objetivos de calidad', hijos: [
      { codigo: 'f-5.4', nombre: 'Formatos' },
    ]},
  ]},
  { codigo: '6', nombre: '6. Gestión de Recursos', hijos: [
    { codigo: '6.1', nombre: '6.1 Gestión de riesgos' },
    { codigo: '6.2', nombre: '6.2 Recursos Humanos', hijos: [
      { codigo: 'f-6.2', nombre: 'Formatos' },
      { codigo: 'i-6.2', nombre: 'Instrucciones' },
    ]},
    { codigo: '6.3', nombre: '6.3 Infraestructura y equipamiento' },
  ]},
  { codigo: '7', nombre: '7. Operación / Realización del servicio', hijos: [
    { codigo: '7.1', nombre: '7.1 Planificación docente', hijos: [
      { codigo: 'f-7.1', nombre: 'Formatos de planificación' },
    ]},
    { codigo: '7.2', nombre: '7.2 Procesos relacionados con el alumnado', hijos: [
      { codigo: 'f-7.2', nombre: 'Formatos' },
      { codigo: 'i-7.2', nombre: 'Instrucciones' },
    ]},
    { codigo: '7.5', nombre: '7.5 Proceso de enseñanza-aprendizaje', hijos: [
      { codigo: 'f-7.5', nombre: 'Formatos de aula' },
      { codigo: 'p-7.5', nombre: 'Procedimientos' },
    ]},
    { codigo: 'prs', nombre: 'Procesos (prs-)', hijos: [
      { codigo: 'prs-0', nombre: 'Política y calidad' },
      { codigo: 'prs-1', nombre: 'Procesos estratégicos' },
      { codigo: 'prs-2', nombre: 'Procesos de apoyo' },
    ]},
    { codigo: 'pf', nombre: 'Proyecto Funcional (pf-)', hijos: [
      { codigo: 'pf-00', nombre: 'Proyecto funcional general' },
      { codigo: 'pf-02', nombre: 'Plan de orientación' },
      { codigo: 'pf-04', nombre: 'Plan de convivencia' },
      { codigo: 'pf-05', nombre: 'Reglamento de régimen interior' },
    ]},
  ]},
  { codigo: '8', nombre: '8. Medición, Análisis y Mejora', hijos: [
    { codigo: '8.2', nombre: '8.2 Seguimiento y medición', hijos: [
      { codigo: 'f-8.2', nombre: 'Formatos de seguimiento' },
      { codigo: 'i-8.2', nombre: 'Auditorías' },
    ]},
    { codigo: '8.5', nombre: '8.5 Mejora continua' },
  ]},
  { codigo: 'Anexos', nombre: 'Anexos y permisos', hijos: [
    { codigo: 'Anexo-I',   nombre: 'Anexo I — Ausencias por enfermedad' },
    { codigo: 'Anexo-II',  nombre: 'Anexo II — Permisos Servicio Provincial' },
    { codigo: 'Anexo-III', nombre: 'Anexo III — Permisos dirección del centro' },
    { codigo: 'Anexo-IV',  nombre: 'Anexo IV — Permisos sin retribución' },
  ]},
];

function insertarArbol(db, id_centro, nodos, parent_id = null, orden = 0) {
  for (let i = 0; i < nodos.length; i++) {
    const nodo = nodos[i];
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO carpetas (id_centro, parent_id, nombre, codigo, orden)
      VALUES (?, ?, ?, ?, ?)
    `).run(id_centro, parent_id, nodo.nombre, nodo.codigo ?? null, i);

    if (nodo.hijos?.length) {
      insertarArbol(db, id_centro, nodo.hijos, lastInsertRowid, 0);
    }
  }
}

module.exports = { ARBOL_SGC, insertarArbol };
