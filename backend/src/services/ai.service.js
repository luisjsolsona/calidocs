const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Detecta el tipo de documento y la sección ISO a partir del nombre
function analizarNombre(nombre) {
  const n = nombre.toLowerCase();
  let tipo = 'otro';
  let seccion = '';
  let descripcion = '';

  if      (n.startsWith('f-'))   { tipo = 'formato';        descripcion = 'Formato/formulario rellenable'; }
  else if (n.startsWith('i-'))   { tipo = 'instruccion';    descripcion = 'Instrucción de trabajo paso a paso'; }
  else if (n.startsWith('p-'))   { tipo = 'procedimiento';  descripcion = 'Procedimiento documentado'; }
  else if (n.startsWith('prs-')) { tipo = 'proceso';        descripcion = 'Mapa/ficha de proceso'; }
  else if (n.startsWith('pf'))   { tipo = 'proyecto';       descripcion = 'Documento del Proyecto Funcional'; }
  else if (n.startsWith('anexo')) { tipo = 'anexo';         descripcion = 'Anexo informativo'; }

  // Detecta sección ISO por número (e.g., f-6.2-a-01 → sección 6.2)
  const matchSec = nombre.match(/[fpir]+-?(\d+\.\d+)/i);
  if (matchSec) {
    const num = matchSec[1];
    const mapaSecciones = {
      '4.1': 'Contexto de la organización',
      '4.2': 'Control de la información documentada',
      '5.1': 'Liderazgo y compromiso de la dirección',
      '5.4': 'Objetivos de calidad',
      '6.1': 'Gestión de riesgos y oportunidades',
      '6.2': 'Gestión de Recursos Humanos y personal docente',
      '6.3': 'Infraestructura y equipamiento del centro',
      '7.1': 'Planificación y organización docente',
      '7.2': 'Procesos relacionados con el alumnado (matrícula, FCT, evaluación)',
      '7.5': 'Proceso de enseñanza-aprendizaje en el aula',
      '8.2': 'Seguimiento, medición y auditoría interna',
      '8.3': 'Control de no conformidades',
      '8.5': 'Mejora continua',
    };
    seccion = mapaSecciones[num] || `Sección ISO ${num}`;
  }

  return { tipo, descripcion, seccion };
}

async function generarDocumento(nombre, centro) {
  const { tipo, descripcion, seccion } = analizarNombre(nombre);

  const prompt = `Eres un experto en Sistemas de Gestión de Calidad (SGC) para institutos de Formación Profesional (IES) bajo la norma ISO 9001:2015.

Genera el contenido completo de un documento SGC con las siguientes características:
- Nombre del documento: "${nombre}"
- Tipo: ${descripcion || tipo}
- Sección ISO relacionada: ${seccion || 'General SGC'}
- Centro educativo: ${centro?.nombre || 'IES'}
- Año académico: ${centro?.año_academico || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)}

INSTRUCCIONES:
1. El documento debe ser práctico y directamente utilizable por el equipo de calidad del IES
2. Adapta el contenido al contexto educativo de FP (ciclos formativos, FCT, evaluaciones, departamentos)
3. Incluye todos los apartados propios del tipo de documento:
   - Si es FORMATO: diseña los campos del formulario con etiquetas claras
   - Si es INSTRUCCIÓN: lista los pasos numerados y detallados
   - Si es PROCEDIMIENTO: incluye objeto, alcance, responsables, desarrollo y registros
   - Si es PROCESO: incluye ficha con entradas, salidas, indicadores y responsable
4. Usa lenguaje formal pero claro, en español

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con el contenido del documento en texto estructurado (con secciones, listas, tablas en texto plano). No incluyas explicaciones previas ni posteriores.`;

  const message = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  return {
    contenido: message.content[0].text,
    tipo,
    seccion,
    tokens_usados: message.usage.input_tokens + message.usage.output_tokens,
  };
}

module.exports = { generarDocumento, analizarNombre };
