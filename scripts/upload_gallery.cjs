const fs = require('fs');
const { execSync } = require('child_process');

const files = [
  'desktop/home.png',
  'desktop/ai.png',
  'desktop/progress.png',
  'desktop/planner.png',
  'desktop/knowledge.png',
  'desktop/opportunities.png',
  'mobile/home.png',
  'mobile/ai.png',
  'mobile/progress.png',
  'mobile/planner.png',
  'mobile/knowledge.png',
  'mobile/opportunities.png'
];

const results = {};

for (const file of files) {
  const filePath = 'docs/screenshots/' + file;
  try {
    const cmd = `curl.exe -s -F "file=@${filePath}" https://tmpfiles.org/api/v1/upload`;
    const output = execSync(cmd, { encoding: 'utf8' });
    const json = JSON.parse(output);
    if (json && json.data && json.data.url) {
      const pageUrl = json.data.url;
      const directUrl = pageUrl.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
      results[file] = { pageUrl, directUrl };
      console.log(`${file} => ${directUrl}`);
    }
  } catch (err) {
    console.error(`Error uploading ${file}:`, err.message);
  }
}

fs.writeFileSync('scripts/upload_results.json', JSON.stringify(results, null, 2), 'utf8');
console.log('Upload complete!');
