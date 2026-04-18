/**
 * Genera una imagen con IA usando Pollinations.ai (gratis, sin API key)
 * y la guarda en public/images/
 *
 * USO:
 *   node src/utils/generateImage.js "prompt aquí" "archivo.png"
 *   node src/utils/generateImage.js "prompt aquí" "archivo.png" 512 512
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

async function generateImage(prompt, filename, options = {}) {
  const {
    width = 512,
    height = 512,
    seed = Math.floor(Math.random() * 10000),
    outputDir = path.join(__dirname, '../../public/images'),
  } = options;

  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, filename);

  return new Promise((resolve, reject) => {
    console.log(`Generando imagen...`);
    console.log(`   Prompt: "${prompt}"`);
    console.log(`   Tamano: ${width}x${height}`);
    console.log(`   Archivo: ${outputPath}`);

    function download(downloadUrl) {
      https.get(downloadUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          console.log(`   Redirect -> ${response.headers.location}`);
          download(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }

        const file = fs.createWriteStream(outputPath);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          const size = fs.statSync(outputPath).size;
          console.log(`   Guardada: ${outputPath} (${(size / 1024).toFixed(1)} KB)`);
          resolve(outputPath);
        });
      }).on('error', reject);
    }

    download(url);
  });
}

if (require.main === module) {
  const prompt = process.argv[2] || 'test image';
  const filename = process.argv[3] || 'test.png';
  const width = parseInt(process.argv[4]) || 512;
  const height = parseInt(process.argv[5]) || 512;

  generateImage(prompt, filename, { width, height })
    .then(() => console.log('Listo'))
    .catch(err => console.error('Error:', err.message));
}

module.exports = { generateImage };
