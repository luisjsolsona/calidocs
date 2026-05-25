const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
const fs   = require('fs');
const path = require('path');

// Genera un archivo .docx a partir de texto plano con la cabecera institucional del centro
// opts: { modulo, ciclo, version, estado } opcionales para la cabecera
async function generarDocx(contenido, nombre, centro, outputPath, opts = {}) {
  const lineas = contenido.split('\n');
  const children = [];

  const version = opts.version || '1.0';
  const estado  = opts.estado  || 'Borrador';

  // Cabecera institucional
  children.push(
    new Paragraph({
      children: [new TextRun({ text: centro?.nombre || 'Centro Educativo', bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `SGC — ${nombre}`, size: 22, color: '555555' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: [
          opts.modulo ? `Módulo: ${opts.modulo}` : null,
          opts.ciclo  ? `Ciclo: ${opts.ciclo}`   : null,
        ].filter(Boolean).join('  |  '),
        size: 18, color: '555555',
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Año académico: ${centro?.año_academico || ''}  |  Rev. ${version}  |  Estado: ${estado}`, size: 18, color: '888888' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  );

  // Contenido generado por la IA línea a línea
  for (const linea of lineas) {
    const texto = linea.trim();
    if (!texto) {
      children.push(new Paragraph({ text: '' }));
      continue;
    }
    // Detecta cabeceras (líneas que empiezan con # o son todo mayúsculas cortas)
    if (texto.startsWith('# ')) {
      children.push(new Paragraph({ text: texto.slice(2), heading: HeadingLevel.HEADING_1 }));
    } else if (texto.startsWith('## ')) {
      children.push(new Paragraph({ text: texto.slice(3), heading: HeadingLevel.HEADING_2 }));
    } else if (texto.startsWith('### ')) {
      children.push(new Paragraph({ text: texto.slice(4), heading: HeadingLevel.HEADING_3 }));
    } else if (texto.startsWith('- ') || texto.startsWith('* ')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: texto.slice(2) })],
        bullet: { level: 0 },
      }));
    } else if (/^\d+\.\s/.test(texto)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: texto })],
        numbering: { reference: 'numbered', level: 0 },
      }));
    } else {
      children.push(new Paragraph({ children: [new TextRun({ text: texto })] }));
    }
  }

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'numbered',
        levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }],
      }],
    },
    sections: [{
      properties: {},
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

module.exports = { generarDocx };
