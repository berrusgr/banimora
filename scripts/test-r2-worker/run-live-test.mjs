import http from 'node:http';

const DEV_TEST_URL = 'http://localhost:5173/?r2test=1';
const LISTEN_PORT = 4789;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/report') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        console.log('\n=== Canlı R2 Test Sonuçları (Maskeli) ===');
        let allPassed = true;
        for (const item of parsed.steps ?? []) {
          const icon = item.ok ? '✔' : '✖';
          if (!item.ok) allPassed = false;
          console.log(`${icon} ${item.step}: ${item.detail}`);
        }
        if (parsed.objectKey) {
          console.log('\n--- Elle Temizlik Bilgisi (R2: banimora-media) ---');
          console.log(`objectKey : ${parsed.objectKey}`);
          console.log(`SHA-256   : ${parsed.sha256}`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        process.exitCode = allPassed ? 0 : 1;
        server.close();
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(LISTEN_PORT, '127.0.0.1', () => {
  console.log('Banimora R2 Worker Canlı Testi (GitHub OAuth - Yalnızca DEV)');
  console.log('------------------------------------------------------------');
  console.log('1. Başka bir terminalde "npm run dev" çalıştığından emin olun.');
  console.log(`2. Tarayıcıda şu adresi açın: ${DEV_TEST_URL}`);
  console.log('3. GitHub OAuth oturumunuzla "10 Canlı R2 Testini Çalıştır" düğmesine basın.');
  console.log('   (Sonuçlar hem tarayıcıda hem de otomatik olarak bu terminalde görünecektir.)');
});
