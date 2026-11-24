const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const viewports = [
  { name: '360x800', w: 360, h: 800 },
  { name: '390x844', w: 390, h: 844 },
  { name: '430x932', w: 430, h: 932 },
  { name: '768x1024', w: 768, h: 1024 },
  { name: '1280x900', w: 1280, h: 900 },
  { name: '1440x900', w: 1440, h: 900 }
];

function sendCommand(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function run() {
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  function getNewTarget() {
    return new Promise((resolve, reject) => {
      http.get('http://localhost:9222/json/list', res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const list = JSON.parse(data);
          resolve(list[0]);
        });
      }).on('error', reject);
    });
  }

  const target = await getNewTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  await new Promise(resolve => ws.addEventListener('open', resolve));
  await sendCommand(ws, 'Page.enable');
  await sendCommand(ws, 'DOM.enable');

  const pages = ['home', 'ai'];
  const testResults = [];

  for (const pageName of pages) {
    console.log(`\n=== Testing Page: ${pageName.toUpperCase()} ===`);
    const url = `http://localhost:5173/?tab=${pageName}`;
    await sendCommand(ws, 'Page.navigate', { url });
    await new Promise(r => setTimeout(r, 1200));

    for (const vp of viewports) {
      // Set device viewport
      await sendCommand(ws, 'Emulation.setDeviceMetricsOverride', {
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: 1,
        mobile: vp.w <= 768
      });

      await new Promise(r => setTimeout(r, 400));

      // Evaluate scrollWidth vs innerWidth
      const evalResult = await sendCommand(ws, 'Runtime.evaluate', {
        expression: `JSON.stringify({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          scrollHeight: document.documentElement.scrollHeight,
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
          overflowDiff: document.documentElement.scrollWidth - window.innerWidth
        })`,
        returnByValue: true
      });

      const metrics = JSON.parse(evalResult.result.value);
      const passed = !metrics.hasOverflow;
      testResults.push({ page: pageName, viewport: vp.name, ...metrics, passed });

      console.log(`  [${vp.name}] scrollWidth: ${metrics.scrollWidth}px | innerWidth: ${metrics.innerWidth}px | Overflow: ${passed ? 'AUCUN (OK)' : `DÉBORDEMENT de ${metrics.overflowDiff}px (FAIL)`}`);

      // Capture screenshot for official targets
      if (vp.name === '390x844') {
        const shot = await sendCommand(ws, 'Page.captureScreenshot', { format: 'png' });
        const filePath = path.join(__dirname, '..', 'docs', 'screenshots', 'mobile', `${pageName}.png`);
        fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
        console.log(`    -> Mobile screenshot saved to ${pageName}.png`);
      }
      if (vp.name === '1280x900' || vp.name === '1440x900') {
        const shot = await sendCommand(ws, 'Page.captureScreenshot', { format: 'png' });
        const filePath = path.join(__dirname, '..', 'docs', 'screenshots', 'desktop', `${pageName}.png`);
        fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
        console.log(`    -> Desktop screenshot (${vp.name}) saved to ${pageName}.png`);
      }
    }
  }

  ws.close();
  chrome.kill();

  fs.writeFileSync(path.join(__dirname, 'viewport_test_report.json'), JSON.stringify(testResults, null, 2), 'utf8');
  console.log('\n=== All 12 Responsive Viewport Validations Complete! ===');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
