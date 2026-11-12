// 안드로이드 앱에 넣을 웹 파일 준비: node tools/build-android.js
//   android/app/src/main/assets/www/ 에 웹 파일을 복사하고, CDN 글꼴 대신 앱에 넣은 Pretendard를 써요.
//   (인터넷 없이도 같은 글꼴로 보이게) 그다음 android/ 에서 ./gradlew assembleDebug 또는 bundleRelease.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'www');
const FILES = ['index.html', 'css/style.css', 'js/engine.js', 'js/app.js', 'icons/icon.svg', 'icons/icon-192.png'];

fs.rmSync(out, { recursive: true, force: true });
FILES.forEach((f) => {
  fs.mkdirSync(path.dirname(path.join(out, f)), { recursive: true });
  fs.copyFileSync(path.join(root, f), path.join(out, f));
});

fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
fs.copyFileSync(path.join(root, 'android', 'fonts', 'PretendardVariable.woff2'), path.join(out, 'fonts', 'PretendardVariable.woff2'));
fs.writeFileSync(path.join(out, 'fonts', 'pretendard.css'),
  "/* Pretendard (c) Kil Hyung-jin, SIL Open Font License 1.1 — android/fonts/OFL.txt */\n" +
  "@font-face{font-family:'Pretendard Variable';font-weight:45 920;font-style:normal;font-display:swap;" +
  "src:url('PretendardVariable.woff2') format('woff2-variations');}\n");

const indexPath = path.join(out, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const before = html;
html = html
  .replace(/\s*<link rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net"[^>]*>/, '')
  .replace(/<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/gh\/orioncactus\/pretendard[^"]*">/, '<link rel="stylesheet" href="fonts/pretendard.css">')
  .replace(/\s*<link rel="manifest"[^>]*>/, '');
if (html === before || /cdn\.jsdelivr/.test(html)) throw new Error('index.html 의 글꼴 링크를 바꾸지 못했어요. tools/build-android.js 를 확인하세요.');
fs.writeFileSync(indexPath, html);
console.log(`android/app/src/main/assets/www/ (${FILES.length + 2}개 파일)`);
