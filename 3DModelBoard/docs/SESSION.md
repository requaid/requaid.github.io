# 세션 핸드오프 — 3DModelBoard

다른 머신에서 이 작업을 이어받을 때 읽는 문서입니다. 이 파일은 리포에 커밋되어 git으로 이동합니다.

## 현재 상태 (2026-04-24)

**구현 완료** (전체 신규 정적 사이트)
- 페이지: `index.html` (목록) / `view.html` (뷰어) / `submit.html` (글쓰기) / `settings.html` (설정)
- JS 모듈: `js/config.js`, `sanitize.js`, `idb.js`, `post-index.js`, `header.js`, `ui.js`, `viewer-core.js`, `viewer-vrm.js`, `viewer-motion.js`, `motion-procedural.js`, `motion-files.js`, `bone-map.js`, `drag-drop.js`, `thumbnail.js`, `github-api.js`, `list.js`, `view.js`, `submit.js`, `settings.js`
- 스타일: `css/style.css`
- 데이터: `posts/posts.json = []`, `assets/placeholder.svg`
- 문서: `README.md`, `docs/USER.md`·`AUTHOR.md` (간결 기술), `docs/BEGINNER-USER.md`·`BEGINNER-AUTHOR.md` (2026-04-24 추가, 비개발자·깃허브 초보용 상세)

**추가 구현 (2026-04-24 후반)** — **썸네일 모드 확장**
- 자동 생성 2가지: `auto-full`(전신 3:4 portrait) / `auto-head`(두상 1:1, 헤드 본 기준 프레이밍).
- 사용자 직접 등록 2가지: `upload`(이미지 파일) / `url`(외부 HTTPS URL).
- `upload`/`url` 모드는 "두상(1:1)" 토글로 리스트 표시 비율 선택.
- 헤드 본 없는 모델은 자동 전신 폴백.
- `meta.json` / `posts.json` 스키마 업그레이드: `thumbnail`이 객체 `{type, path|url, aspect, mode}`. 기존 문자열은 `normalizeThumbnail`에서 `{type:'path', aspect:'square', mode:'legacy'}`로 역호환.
- 리스트 CSS: `.card-thumb.aspect-portrait { aspect-ratio: 3/4 }` 추가. 두상 썸네일은 1:1, 전신은 세로로.
- `js/viewer-core.js`에 `ctx.frameHead()` / `ctx.frameFullBody()` 추가 (헤드 본 월드위치 + 바운딩 박스 기반 거리 계산, 렌더러 1-프레임 동기 캡처 보장).
- `sanitize.js`의 `isValidHttpsBgURL`을 `isValidHttpsImageURL`로 일반화 + 별칭 하위호환.

**추가 구현 (2026-04-24)** — **게시물 배경 기능**
- `submit.html` 4번 섹션에 라디오(없음/이미지 업로드/외부 URL) + 미리보기.
- 이미지는 `posts/<id>/background.<ext>` 로 PR 업로드 / IDB에 Blob 보관. 외부 URL은 `meta.background.url` 로 저장.
- 뷰어에 `.viewer-bg` DOM 레이어 추가, 배경 있을 시 `scene.background = null` 로 투명화.
- CSP `img-src` 에 `https:` 추가(외부 URL 배경용). referrer no-referrer 유지.
- URL 검증: HTTPS 강제 + localhost/사설망(10/192.168/172.16-31) 차단.
- 크기 한도: 5MB.
- 구 `posts.json`(background 필드 없음)은 정규화에서 자연스레 `null` → 회귀 없음.

**로컬 검증** — `python -m http.server 8000` 로 전 페이지 200 OK 확인 (배경 기능 포함).

**배포 검증** — 아직 안 함. Pages 배포 후 실제 URL에서 1~3번 시나리오 + 배경 이미지 업로드/외부 URL 재확인 필요.

## 핵심 설계 결정 (바꾸기 전에 이유 먼저 확인)

- **저장 하이브리드**: `posts.json` + IndexedDB. 병합 순서 = remote + local, createdAt desc.
- **쓰기 = PR 자동 생성**: fork → branch → contents PUT → pulls. Octokit 안 씀, ~150 LoC 자체 fetch 래퍼(`js/github-api.js`).
- **PAT 저장 안 함** — 세션 메모리 `window.__tokenMem`만. 새로고침/탭 종료로 소멸. 의도된 동작.
- **CDN = jsdelivr 불변 버전 핀** — `esm.sh` 거부(동적 트랜스파일러 supply chain 위험).
- **CSP meta** — `script-src 'self' https://cdn.jsdelivr.net`, `object-src 'none'`, `form-action 'self'`, `connect-src` 화이트리스트. `img-src`는 `'self' data: blob: https:` (외부 URL 배경용, 2026-04-24 완화).
- **XSS 방지** — `textContent`/`setAttribute`만. `innerHTML` 미사용. 경로 화이트리스트 `^posts/<slug>/...$`, 배경 이미지 경로는 별도 `BG_PATH_WHITELIST`, 외부 URL은 `isValidHttpsBgURL`(https + 사설망 차단).
- **파일 검증** — 확장자 + 매직바이트(VRM=`glTF`, PMX=`PMX `, VMD=`Vocaloid Motion Data`, PNG/JPEG/WebP 헤더).
- **크기 상한** — 모델 PR 25MB / 로컬 100MB, 모션 10MB, 썸네일 2MB, 배경 5MB.
- **Frame-busting** — `js/config.js` 최상단 `window.top !== window.self` 체크(meta CSP의 frame-ancestors는 무효).
- **썸네일** — 자동(전신 3:4 / 두상 1:1) · 업로드(두상 토글) · 외부 HTTPS URL. 헤드 본 기반 카메라 프레이밍 → 리스트는 `.card-thumb.aspect-square|aspect-portrait`로 비율 다르게.
- **배경 렌더링** — Three.js `scene.background` 대신 canvas 뒤 DOM 레이어(`.viewer-bg`). renderer `alpha:true` 기존 설정 활용. 배경 있을 시 `scene.background = null`. 이미지는 리포 또는 외부 HTTPS URL 둘 다 지원.
- **내장 모션** — idle/walk/run/dance 프로시저럴 클립. VRM humanoid 본 이름 + PMX 일본어 본 매핑(`bone-map.js`).

## 사용자 선호 (세션 중 관찰된 것)

- 한국어 응답·한국어 UI 라벨.
- 보안에 민감함. 공개 리포 전제를 명시적으로 요청함.
- 문서 분리 선호(USER/AUTHOR). 통합 README 말고 역할별.
- 설치 가이드 수준까지 상세 문서 요구.

## 남은 작업 / 다음 스텝 후보

- [ ] 실제 GitHub Pages 배포 후 end-to-end 테스트 (fork→PR 플로우 실제 PAT로 · 배경 이미지/URL 포함)
- [ ] 샘플 게시물 1건 PR로 올려서 `posts.json`에 실데이터 반영 (현재 `[]`)
- [ ] 브라우저 호환성 실측 (iOS Safari WebGL 2 필요)
- [ ] 사용자가 추가 요구 시: 태그 클라우드, 조회수, VRMA 포맷, 배경 블러/밝기 조절 등 (플랜 §비포함 — 요청 시에만)

## 참조 경로

- 원본 포팅 소스: `D:\MJJ\git\vrmViewer\view.skin.php` (PHP/Gnuboard 스킨에서 뷰어 로직만 포팅)
- 플랜: `C:\Users\mjj\.claude\plans\d-mjj-git-3dmodelboard-cuddly-matsumoto.md` (이 머신 한정 — 플랜 사본은 본 문서에 요약됨)

## 다른 머신에서 이어받는 방법

```bash
# 1. 이 리포 clone
git clone https://github.com/<owner>/3DModelBoard.git
cd 3DModelBoard

# 2. Claude Code 실행
claude

# 3. 첫 프롬프트로 이 문서 읽게 하기
> docs/SESSION.md 읽고 현재 상태·결정 사항 파악한 다음 이어서 작업 진행
```
