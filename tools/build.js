// 배포 파일 만들기: node tools/build.js
//   dist/holdem-manager.html : 파일 하나짜리 (카톡/USB로 태블릿에 보내서 크롬으로 바로 열기)
//   dist/web/                : 웹 호스팅용 폴더 (Netlify Drop · GitHub Pages 등에 그대로 올리기)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('index.html');
const icon = 'data:image/svg+xml;base64,' + Buffer.from(read('icons/icon.svg')).toString('base64');
html = html
  .replace(/\s*<link rel="manifest"[^>]*>/, '')
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${icon}">`)
  .replace('<link rel="stylesheet" href="css/style.css">', () => `<style>\n${read('css/style.css')}\n</style>`)
  .replace('<script src="js/engine.js"></script>', () => `<script>\n${read('js/engine.js')}\n</script>`)
  .replace('<script src="js/app.js"></script>', () => `<script>\n${read('js/app.js')}\n</script>`);

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'holdem-manager.html');
fs.writeFileSync(out, html);
console.log(`dist/holdem-manager.html (${(html.length / 1024).toFixed(0)} KB)`);

const WEB_FILES = ['index.html', 'manifest.webmanifest', 'sw.js', 'css/style.css', 'js/engine.js', 'js/app.js', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];
const web = path.join(root, 'dist', 'web');
fs.rmSync(web, { recursive: true, force: true });
WEB_FILES.forEach((f) => {
  fs.mkdirSync(path.dirname(path.join(web, f)), { recursive: true });
  fs.copyFileSync(path.join(root, f), path.join(web, f));
});
console.log(`dist/web/ (${WEB_FILES.length}개 파일)`);
