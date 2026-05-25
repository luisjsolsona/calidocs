// Árbol SGC basado en la estructura real de documentación del IES
// 4 carpetas raíz: Formatos, Procedimientos, Procesos, Proyecto Funcional
const ARBOL_SGC = [
  { codigo: 'FA', nombre: 'Formatos aplicables', hijos: [
    { codigo: 'FA-4', nombre: '4. Control de documentos', hijos: [
      { codigo: 'FA-4.2', nombre: '4.2 Hojas de control de documentos y programaciones' },
    ]},
    { codigo: 'FA-5', nombre: '5. Liderazgo', hijos: [
      { codigo: 'FA-5.1', nombre: '5.1 Información para la revisión del SGC' },
      { codigo: 'FA-5.4', nombre: '5.4 Planificación y seguimiento de objetivos de calidad' },
    ]},
    { codigo: 'FA-6', nombre: '6. Gestión de Recursos', hijos: [
      { codigo: 'FA-6.2a', nombre: '6.2.a Ausencias y permisos del profesorado' },
      { codigo: 'FA-6.2b', nombre: '6.2.b Acogida y datos del profesorado' },
    ]},
    { codigo: 'FA-7', nombre: '7. Realización del servicio', hijos: [
      { codigo: 'FA-7.1', nombre: '7.1 Planificación docente y horarios' },
      { codigo: 'FA-7.2', nombre: '7.2 Procesos relacionados con el alumnado', hijos: [
        { codigo: 'FA-7.2a', nombre: '7.2.a Matrícula y gestión académica' },
        { codigo: 'FA-7.2b', nombre: '7.2.b Cartas y correspondencia oficial' },
        { codigo: 'FA-7.2c', nombre: '7.2.c Acción tutorial y orientación' },
        { codigo: 'FA-7.2d', nombre: '7.2.d PEAC' },
        { codigo: 'FA-7.2e', nombre: '7.2.e Vivero de empresas e IOPE' },
      ]},
      { codigo: 'FA-7.3', nombre: '7.3 Diseño y desarrollo curricular' },
      { codigo: 'FA-7.4', nombre: '7.4 Recursos económicos y presupuesto' },
      { codigo: 'FA-7.5', nombre: '7.5 Proceso de enseñanza-aprendizaje', hijos: [
        { codigo: 'FA-7.5a', nombre: '7.5.a Guardias y asistencia profesorado' },
        { codigo: 'FA-7.5b', nombre: '7.5.b Asistencia alumnado' },
        { codigo: 'FA-7.5d', nombre: '7.5.d Bolsa de empleo' },
        { codigo: 'FA-7.5e', nombre: '7.5.e Evaluación y programación didáctica' },
        { codigo: 'FA-7.5f', nombre: '7.5.f Actividades extraescolares' },
        { codigo: 'FA-7.5g', nombre: '7.5.g Reuniones y actas' },
        { codigo: 'FA-7.5h', nombre: '7.5.h Proyectos europeos Erasmus' },
        { codigo: 'FA-7.5i', nombre: '7.5.i Proyectos de trabajo (I+E)' },
      ]},
    ]},
    { codigo: 'FA-8', nombre: '8. Medición, análisis y mejora', hijos: [
      { codigo: 'FA-8.2a', nombre: '8.2.a Satisfacción de grupos de interés (encuestas)' },
      { codigo: 'FA-8.2b', nombre: '8.2.b Auditorías internas' },
      { codigo: 'FA-8.2d', nombre: '8.2.d Seguimiento de programaciones y evaluaciones' },
      { codigo: 'FA-8.5',  nombre: '8.5 Acciones correctivas, reclamaciones y mejora' },
    ]},
  ]},

  { codigo: 'PI', nombre: 'Procedimientos e Instrucciones', hijos: [
    { codigo: 'PI-4', nombre: '4. Control de documentos', hijos: [
      { codigo: 'PI-4.2', nombre: '4.2 Procedimientos de control documental' },
    ]},
    { codigo: 'PI-5', nombre: '5. Liderazgo', hijos: [
      { codigo: 'PI-5.1', nombre: '5.1 Revisión del SGC por la dirección' },
    ]},
    { codigo: 'PI-6', nombre: '6. Gestión de Recursos', hijos: [
      { codigo: 'PI-6.2', nombre: '6.2 Recursos Humanos — permisos y licencias' },
      { codigo: 'PI-6.3', nombre: '6.3 Infraestructura y equipamiento' },
    ]},
    { codigo: 'PI-7', nombre: '7. Realización del servicio', hijos: [
      { codigo: 'PI-7.1', nombre: '7.1 Planificación docente' },
      { codigo: 'PI-7.2', nombre: '7.2 Procesos con el alumnado (tutoría, orientación)' },
      { codigo: 'PI-7.3', nombre: '7.3 Diseño y desarrollo curricular' },
      { codigo: 'PI-7.4', nombre: '7.4 Recursos económicos' },
      { codigo: 'PI-7.5', nombre: '7.5 Enseñanza-aprendizaje, guardias y FCT' },
      { codigo: 'PI-7.6', nombre: '7.6 Gestión de resultados académicos (revisión de calificaciones)' },
    ]},
    { codigo: 'PI-8', nombre: '8. Medición, análisis y mejora', hijos: [
      { codigo: 'PI-8.2', nombre: '8.2 Seguimiento, medición y auditoría' },
      { codigo: 'PI-8.3', nombre: '8.3 Control de no conformidades' },
      { codigo: 'PI-8.5', nombre: '8.5 Acciones correctivas y mejora continua' },
    ]},
  ]},

  { codigo: 'PRS', nombre: 'Procesos', hijos: [
    { codigo: 'prs-0', nombre: 'Mapa de procesos (prs-0.0)' },
    { codigo: 'prs-1', nombre: 'Procesos estratégicos', hijos: [
      { codigo: 'prs-1.1', nombre: '1.1 Dirección estratégica' },
      { codigo: 'prs-1.2', nombre: '1.2 Gestión de la calidad y mejora' },
      { codigo: 'prs-1.3', nombre: '1.3 Comunicación y marketing' },
      { codigo: 'prs-1.4', nombre: '1.4 Relaciones con el entorno' },
      { codigo: 'prs-1.5', nombre: '1.5 Innovación y proyectos' },
    ]},
    { codigo: 'prs-2', nombre: 'Procesos clave (operativos)', hijos: [
      { codigo: 'prs-2.1', nombre: '2.1 Formación Profesional reglada' },
      { codigo: 'prs-2.2', nombre: '2.2 FCT y relación con empresas' },
      { codigo: 'prs-2.3', nombre: '2.3 FP para el Empleo' },
    ]},
    { codigo: 'prs-3', nombre: 'Procesos de soporte', hijos: [
      { codigo: 'prs-3.1', nombre: '3.1 Gestión de recursos humanos' },
      { codigo: 'prs-3.2', nombre: '3.2 Gestión de recursos materiales y económicos' },
    ]},
  ]},

  { codigo: 'PF', nombre: 'Proyecto Funcional', hijos: [
    { codigo: 'pf00', nombre: 'Plan anual de trabajo y proyecto funcional' },
    { codigo: 'pf02', nombre: 'Plan de orientación' },
    { codigo: 'pf04', nombre: 'Plan de convivencia' },
    { codigo: 'pf05', nombre: 'Reglamento de régimen interior' },
    { codigo: 'pf07', nombre: 'Partes interesadas y DAFO' },
    { codigo: 'pf08', nombre: 'Plan de comunicación' },
    { codigo: 'pf-calidad', nombre: 'Política de calidad' },
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
