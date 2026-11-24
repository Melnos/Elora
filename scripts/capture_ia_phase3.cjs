const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const artifactDir = "C:\\Users\\djima\\.gemini\\antigravity\\brain\\0cfc4dcb-aa23-46aa-8ce7-62ac47b8a34e";

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

async function capture() {
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  function getTarget() {
    return new Promise((resolve) => {
      http.get('http://localhost:9223/json/list', res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          const list = JSON.parse(data);
          resolve(list[0]);
        });
      });
    });
  }

  const target = await getTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));

  await sendCommand(ws, 'Page.enable');
  await sendCommand(ws, 'DOM.enable');

  // 1. Desktop IA (1440x900)
  await sendCommand(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  await sendCommand(ws, 'Page.navigate', { url: 'http://localhost:5173' });
  await new Promise(r => setTimeout(r, 2000));

  // Cliquer sur l'onglet IA
  await sendCommand(ws, 'Runtime.evaluate', {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const iaBtn = buttons.find(b => b.textContent && b.textContent.includes('IA'));
      if (iaBtn) iaBtn.click();
    `
  });
  await new Promise(r => setTimeout(r, 1000));

  const desktopShot = await sendCommand(ws, 'Page.captureScreenshot', { format: 'png' });
  const desktopBuf = Buffer.from(desktopShot.data, 'base64');
  fs.writeFileSync('docs/screenshots/desktop/ai.png', desktopBuf);
  fs.writeFileSync(path.join(artifactDir, 'screenshots/desktop/ai.png'), desktopBuf);
  console.log('Desktop IA capture saved!');

  // 2. Mobile IA (390x844)
  await sendCommand(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 1000));

  const mobileShot = await sendCommand(ws, 'Page.captureScreenshot', { format: 'png' });
  const mobileBuf = Buffer.from(mobileShot.data, 'base64');
  fs.writeFileSync('docs/screenshots/mobile/ai.png', mobileBuf);
  fs.writeFileSync(path.join(artifactDir, 'screenshots/mobile/ai.png'), mobileBuf);
  console.log('Mobile IA capture saved!');

  ws.close();
  chrome.kill();
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
