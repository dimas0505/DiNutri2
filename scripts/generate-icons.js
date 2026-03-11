/**
 * scripts/generate-icons.js
 *
 * Script de documentação e geração de ícones PNG para o PWA DiNutri.
 *
 * Uso:
 *   node scripts/generate-icons.js
 *
 * Pré-requisitos:
 *   npm install sharp
 *
 * Este script converte client/public/icon.svg nos PNGs necessários para o PWA,
 * garantindo que cada ícone tenha fundo roxo (#8A2BE2) preenchendo toda a área
 * sem borda/padding branco, compatível com o padrão maskable do PWA.
 *
 * Alternativamente, abra client/public/generate-icons.html no browser para
 * gerar e baixar os PNGs sem dependências extras.
 */

const path = require('path');
const fs = require('fs');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SVG_SOURCE = path.join(__dirname, '../client/public/icon.svg');
const OUTPUT_DIR = path.join(__dirname, '../client/public');

async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error(
      'Dependency "sharp" not found.\n' +
      'Install with: npm install sharp\n\n' +
      'Alternative: open client/public/generate-icons.html in the browser.'
    );
    process.exit(1);
  }

  if (!fs.existsSync(SVG_SOURCE)) {
    console.error(`SVG source not found: ${SVG_SOURCE}`);
    process.exit(1);
  }

  console.log('Generating DiNutri PWA icons...\n');

  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    await sharp(SVG_SOURCE)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✔ icon-${size}x${size}.png`);
  }

  console.log('\nIcons successfully generated in', OUTPUT_DIR);
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
