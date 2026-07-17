const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const MAX_SIZE = 400;

// PDFKit solo soporta PNG y JPEG. Normalizamos cualquier logo subido
// (WEBP, SVG, JPG, PNG) a un PNG de tamaño acotado, para que siempre
// se pueda incrustar en el PDF de la cotizacion sin fallar en silencio.
async function normalizarLogo(uploadsDir, filename) {
  const inputPath = path.join(uploadsDir, filename);
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const outputFilename = `${base}.png`;
  const outputPath = path.join(uploadsDir, outputFilename);

  if (outputFilename === filename) {
    const tempPath = path.join(uploadsDir, `${base}.tmp.png`);
    await sharp(inputPath)
      .resize(MAX_SIZE, MAX_SIZE, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toFile(tempPath);
    fs.renameSync(tempPath, outputPath);
  } else {
    await sharp(inputPath)
      .resize(MAX_SIZE, MAX_SIZE, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toFile(outputPath);
    fs.unlinkSync(inputPath);
  }

  return outputFilename;
}

module.exports = { normalizarLogo };
