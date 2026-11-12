# 플레이스토어 출시 절차

안드로이드 앱은 `android/` 에 있어요. 외부 라이브러리 없는 WebView 앱이고, 웹 파일과 글꼴을 앱 안에 넣어서 인터넷 없이 동작해요.
코드를 main 이나 `feat/**` 브랜치에 푸시하면 GitHub Actions(**Android build**)가 자동으로 빌드해요.

| 결과물 (Actions → 실행 기록 → Artifacts) | 용도 |
|---|---|
| `holdem-manager-debug-apk` | 내 폰에 바로 설치해서 테스트 |
| `holdem-manager-release-aab` | 플레이스토어 업로드용 (업로드 키를 등록해야 서명됨) |

## 1. 내 폰에서 먼저 테스트
1. Actions → 최근 **Android build** 실행 → `holdem-manager-debug-apk` 다운로드 → 압축 풀기
2. APK 파일을 폰으로 옮겨서 설치 (출처를 알 수 없는 앱 설치 허용 필요)
3. 확인할 것: 타이머 알림음 · 진동, 화면 꺼짐 방지, 뒤로 가기(창 닫기 → 앱 종료), 앱을 닫았다 열어도 기록 유지

## 2. 업로드 키 만들기 (한 번만, 내 PC에서)
JDK가 있는 PC에서 실행하세요. **이 파일과 비밀번호를 잃어버리면 앱 업데이트가 어려워지니** 안전한 곳에 백업하세요.

```bash
keytool -genkeypair -v -keystore holdem-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Windows PowerShell 에서 base64 로 바꾸기:

```bash
[Convert]::ToBase64String([IO.File]::ReadAllBytes("holdem-upload.jks")) | Set-Clipboard
```

macOS / Linux:

```bash
base64 -w0 holdem-upload.jks
```

## 3. GitHub 에 키 등록
저장소 → Settings → Secrets and variables → Actions → New repository secret

| 이름 | 값 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | 위에서 만든 base64 문자열 |
| `ANDROID_KEYSTORE_PASSWORD` | keystore 비밀번호 |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | 키 비밀번호 (keytool 에서 따로 안 정했으면 keystore 비밀번호와 같음) |

등록 후 Actions → Android build → **Run workflow** 를 누르면 서명된 AAB 가 나와요.

## 4. 플레이스토어 콘솔
1. [Play Console](https://play.google.com/console) 개발자 계정 만들기 (등록비 25달러, 본인 인증)
2. 앱 만들기 → 앱 이름 `docs/store-listing.md` 참고, 무료, 앱
3. **앱 콘텐츠** 작성
   - 개인정보처리방침 URL: `docs/store-listing.md` 의 문구를 GitHub Pages 등에 올린 주소
   - 데이터 보안: 수집 없음 · 공유 없음
   - 콘텐츠 등급(IARC): `docs/store-listing.md` 의 답변 가이드 참고
   - 광고: 없음 / 타깃 연령: 18세 이상 권장 (카드 게임 도구)
4. **스토어 등록정보**: 설명은 `docs/store-listing.md`, 이미지는 `docs/store/`
   - 앱 아이콘 512×512: `icons/icon-512.png`
   - 그래픽 이미지 1024×500: `docs/store/feature-graphic.png`
   - 휴대전화 스크린샷: `docs/store/phone-*.png`
   - 태블릿 스크린샷: `docs/store/tablet-*.png`
5. **테스트 → 비공개 테스트**에 AAB 업로드 → 테스터 이메일 등록
   - 2023년 11월 이후 만든 개인 계정은 **테스터 12명 이상이 14일 동안** 참여해야 프로덕션 출시를 신청할 수 있어요 (콘솔에 표시되는 현재 기준을 확인하세요).
6. 조건을 채우면 **프로덕션** 출시 신청

## 버전 올리기
- `versionCode` 는 Actions 실행 번호로 자동으로 올라가요.
- 보이는 버전(`versionName`)을 바꾸려면 `android/app/build.gradle.kts` 의 `versionName` 을 수정하세요.

## 패키지 이름
`com.minani99.holdemmanager` 로 정해 두었어요. **첫 업로드 후에는 바꿀 수 없으니** 바꾸려면 업로드 전에
`android/app/build.gradle.kts` 의 `namespace` · `applicationId` 와 Java 패키지 폴더를 함께 바꾸세요.

## 로컬에서 빌드하기 (선택)
Android Studio 또는 Android SDK + JDK 17 이 있으면:

```bash
node tools/build-android.js
```

```bash
cd android && ./gradlew assembleDebug
```
