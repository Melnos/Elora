const { spawn } = require('child_process');
const http = require('http');

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const viewports = [
  { name: '360x800', w: 360, h: 800 },
  { name: '390x844', w: 390, h: 844 },
  { name: '430x932', w: 430, h: 932 },
  { name: '768x1024', w: 768, h: 1024 },
  { name: '1280x900', w: 1280, h: 900 },
  { name: '1440x900', w: 1440, h: 900 }
];

async function run() {
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  function getVersion() {
    return new Promise((resolve, reject) => {
      http.get('http://localhost:9222/json/version', res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });
  }

  try {
    const version = await getVersion();
    const wsUrl = version.webSocketDebuggerUrl;
    console.log('Connected to Chrome DevTools Protocol at', wsUrl);

    // Using WebSocket
    const WebSocket = global.WebSocket || require('ws');
    // If ws is not installed, we can still use Chrome screenshot CLI
  } catch(e) {
    console.log('Direct CDP check note:', e.message);
  } finally {
    chrome.kill();
  }
}

run();
