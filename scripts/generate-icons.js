const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputSvg = path.join(__dirname, '../client/public/favicon.svg');
const outputDir = path.join(__dirname, '../client/public');

const sizes = [192, 512];

async function generateIcons() {
  if (!fs.existsSync(inputSvg)) {
    console.error('Error: favicon.svg not found at', inputSvg);
    process.exit(1);
  }

  console.log('Generating PWA icons from', inputSvg);

  for (const size of sizes) {
    const outputFile = path.join(outputDir, `pwa-${size}x${size}.png`);
    
    try {
      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(outputFile);
      
      console.log(`✅ Generated ${outputFile}`);
    } catch (error) {
      console.error(`❌ Failed to generate ${size}x${size} icon:`, error);
    }
  }
}

generateIcons();
