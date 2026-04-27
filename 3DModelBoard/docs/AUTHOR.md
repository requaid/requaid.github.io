# 작성·운영자 매뉴얼

게시물을 **리포지토리에 PR로 공유**하거나, 이 게시판을 **직접 운영**하려는 분을 위한 문서입니다.
단순히 구경만 하실 분은 [사용 매뉴얼 (USER.md)](USER.md)을 참고하세요.

---

## 1. 준비 단계

### 1-1. 내 fork 리포 만들기

게시판 리포(`<owner>/3DModelBoard`) 페이지에서 **Fork** 버튼 → 자신의 계정으로 fork 생성.
PR 플로우는 *당신의 fork에 파일을 커밋 → upstream 리포로 PR* 흐름입니다.

> 게시판 자체를 새로 띄우는 경우(= 자기가 owner)에는 별도 fork 없이 본인 리포에 직접 쓸 수 있지만, 구현상 코드는 동일하게 fork 경로를 사용합니다.

### 1-2. Fine-grained PAT 발급

GitHub → Settings → **Developer settings → Personal access tokens → Fine-grained tokens** → **Generate new token**:

| 항목 | 값 |
| --- | --- |
| Token name | `3dmodelboard-post` 등 식별 가능한 이름 |
| Expiration | 7일~90일 (짧을수록 안전) |
| Repository access | **Only select repositories** → 당신의 `3DModelBoard` fork **1개만** |
| Contents | **Read and write** |
| Pull requests | **Read and write** |
| Metadata | Read-only (자동 포함) |

다른 권한은 절대 주지 마세요. 토큰 노출 시 피해 범위를 이 리포 하나로 한정하기 위함입니다.

### 1-3. 설정 페이지 (`settings.html`) 입력

1. **리포지토리 카드**
   - Upstream Owner: 게시판 원본 리포 owner (PR이 들어갈 곳)
   - Repository 이름: `3DModelBoard`
   - Base 브랜치: `main`
2. **작성자 카드**: 닉네임(실명 금지). 공개 리포에 영구 기록됩니다.
3. **PAT 카드**: 위에서 발급한 토큰 붙여넣고 **[연결 테스트]** → 사용자명이 표시되면 OK.

> 🔒 토큰은 **세션 메모리에만** 보관됩니다. 탭을 닫거나 새로고침하면 사라지므로 **글쓰기 직전에 다시 입력**하세요. 의도된 보안 동작입니다.

---

## 2. 글쓰기 (`submit.html`)

1. **모델 파일 선택/드롭** — `.vrm`, `.pmx`, `.pmd`, 최대 100MB
   - 선택 즉시 오른쪽에 미리보기 로드.
   - 파일 크기 25MB 초과 → PR 버튼 **비활성화**, 로컬 저장만 가능.
   - **PMX/PMD 텍스처 번들** — PMX/PMD를 선택하면 "텍스처 번들" 섹션이 노출됩니다. **폴더 업로드**(`<input webkitdirectory>` 로 PMX와 `tex/` 폴더를 함께 선택) 또는 **ZIP 업로드** 중 선택 가능. 합 25MB 이하, 허용 확장자 `.bmp/.png/.jpg/.jpeg/.tga/.dds/.spa/.sph`. 번들 없이 로드하면 회색 모델로 표시됩니다.
   - 로딩에 45초 이상 걸리면 **타임아웃 에러 모달**이 뜹니다. 모달의 [📋 로그 복사]로 원인 로그(UA, 요약, 스택, 최근 콘솔)를 클립보드에 복사해 관리자에게 전달할 수 있습니다.
2. **메타 입력** — 제목(필수), 작성자, 태그(쉼표 구분, 최대 8개), 설명.
3. **썸네일** — 4가지 모드 중 선택
   - **자동 — 전신샷**: 모델 전체가 보이도록 세로 3:4 비율로 캡처(기본값). 리스트에서 세로 긴 카드로 보임.
   - **자동 — 두상**: 머리 본을 기준으로 카메라가 자동 이동해 1:1 두상 캡처. 머리 본이 없는 모델은 자동 전신으로 폴백.
   - **이미지 업로드**: PNG/JPG/WebP(최대 2MB). "두상(1:1)" 체크로 정사각 크롭, 미체크는 세로 3:4.
   - **외부 URL**: HTTPS 이미지 URL. 같은 "두상(1:1)" 토글로 리스트 표시 비율 결정. 리포에 파일을 업로드하지 않고 `meta.thumbnail = {type:'url', url}`만 저장.
   - `📷 다시 찍기` 버튼은 자동 모드에서 현재 카메라 각도로 재캡처.
4. **저장 방식**
   - **💾 내 브라우저에 저장** — IndexedDB. 공개되지 않으며 다른 사용자에게 안 보임. 쿠키/데이터 삭제 시 사라짐.
   - **🚀 PR로 공유하기** — PAT가 있어야 활성화. 아래 PR 플로우 실행.

### 2-1. PR 플로우 내부 동작

```
[사용자] → [submit.js]
   │
   ├─ 1. getAuthUser()              → 토큰 유효성 + 로그인 이름 확인
   ├─ 2. ensureFork(owner/repo)    → fork 없으면 생성 (첫 생성 시 최대 30초)
   ├─ 3. getBranchSha(main)        → base commit SHA
   ├─ 4. createBranch(post/<slug>-<ts>)
   ├─ 5. putFile(posts/<slug>/model.<ext>, base64)
   ├─ 5b. (PMX/PMD 번들) putFile(posts/<slug>/textures/<rel>, base64) × N
   ├─ 6. putFile(posts/<slug>/thumbnail.png, base64)
   ├─ 7. putFile(posts/<slug>/meta.json, base64)   ← textureBundlePaths 포함
   ├─ 8. getFileContent(posts/posts.json)
   ├─ 9. putFile(posts/posts.json, append한 배열)
   └─10. createPullRequest(upstream:main ← fork:post/<slug>-<ts>)
          → PR URL 화면에 표시
```

- 전 과정이 클라이언트 JS에서만 일어납니다. 서버는 없습니다.
- 실패 시 마지막 실패 단계의 status 코드가 로그창에 표시됩니다. 이미 커밋된 파일은 fork 브랜치에 남으므로 필요 시 GitHub 웹에서 브랜치를 삭제하거나 PR 생성만 수동으로 다시 하세요.
- Rate limit 잔량은 응답 헤더(`X-RateLimit-Remaining`)로 체크합니다. 0이면 요청이 중단되고 안내 토스트가 뜹니다.

### 2-2. 실패 시 흔한 원인

| 로그 메시지 | 원인 / 대응 |
| --- | --- |
| `401` / `Bad credentials` | PAT 만료 또는 오타. 재발급 후 재입력. |
| `403` / `rate limit` | 1시간 단위 리셋. 잠시 대기. |
| `404` on fork 단계 | upstream owner/repo 이름 오타. 설정 페이지에서 확인. |
| `422` on PR 생성 | 동일 브랜치로 열린 PR이 이미 있음. fork에서 브랜치 지우고 재시도. |
| 모델 업로드 자체가 안 됨 | 파일 크기 25MB 초과. 로컬 저장으로 전환하거나 모델 최적화. |

---

## 3. 설정 페이지 상세 (`settings.html`)

- 리포·작성자 값은 `IndexedDB settings` 스토어에 저장됩니다. 브라우저 단위 보존.
- PAT는 **저장되지 않습니다**(메모리 변수만). 새 탭에서 작업하려면 각 탭마다 다시 넣으세요.
- **[연결 테스트]** 버튼은 `GET /user` 한 번을 호출합니다. 권한 충분 여부는 실제 PR 시도 때 드러납니다.

---

## 4. 운영자 체크리스트 (리포 owner)

이 게시판을 자기 이름으로 띄워 다른 사람의 PR을 받게 된다면:

- [ ] **Branch protection** — `Settings → Branches → Add rule` 에서 `main`에:
  - Require a pull request before merging
  - Require approvals (최소 1명)
  - Disallow force pushes
- [ ] **Actions 자동 배포/자동 머지 금지** — 외부 PR이 CI 권한을 갖지 않게.
- [ ] **Dependabot Alerts / Secret Scanning** 활성화.
- [ ] **PR 본문·메타데이터 수동 리뷰** — 실명/이메일/저작권 위반 모델/민감 정보가 포함된 PR은 머지 전 거절·수정 요청.
- [ ] **대용량 바이너리 관리** — `.vrm`, `.pmx`는 리포 크기를 빠르게 부풀립니다. 기준(예: 5MB)을 정해 그 이상은 로컬 저장으로 유도. Git LFS는 GitHub Pages에서 바이너리로 서빙되지 않으므로 쓰지 마세요.
- [ ] **Pages 캐시** — 머지된 PR이 바로 반영되지 않으면 Actions 빌드 로그 또는 Pages 빌드 상태 확인.

---

## 5. 보안 메모

(자세한 근거는 [PLAN 문서](../../../../Users/mjj/.claude/plans/d-mjj-git-3dmodelboard-cuddly-matsumoto.md)의 §8 참고 — 아래는 요점)

- **PAT 저장 안 함** — localStorage/sessionStorage/IndexedDB/쿠키 어디에도 쓰지 않음. 세션 JS 변수만.
- **벤더 자체 번들** — Babylon/babylon-mmd/fflate는 `vendor/` 디렉터리에 **esbuild로 사전 빌드된 자체 번들**을 커밋해 사용합니다. 외부 CDN을 런타임에 부르지 않으므로 CSP `script-src 'self'` 만으로 충분.
- **CSP** — 각 HTML `<meta http-equiv="Content-Security-Policy">`로 `script-src 'self'`, `object-src 'none'`, `form-action 'self'`, `connect-src` 화이트리스트.
- **XSS 방지** — 사용자 콘텐츠는 `textContent`/`setAttribute`로만. `innerHTML` 미사용.
- **경로 화이트리스트** — 썸네일/모델 경로는 `^posts/<slug>/...$` 정규식으로만 허용. 임의 URL 차단.
- **파일 매직바이트 검증** — 확장자 외에 VRM=`glTF`, PMX=`PMX `, VMD=`Vocaloid Motion Data`, PNG/JPEG/WebP 헤더 확인. 통과 못 하면 로드 거부.
- **크기 상한** — 모델(PR 25MB / 로컬 100MB), 모션 10MB, 썸네일 2MB.
- **Frame-busting** — `window.top !== window.self`이면 즉시 이탈. (`frame-ancestors`는 meta CSP에서 무효라 JS로 처리)
- **Referrer 차단** — `<meta name="referrer" content="no-referrer">`로 PAT가 referrer 헤더로 새지 않게.
- **자체 GitHub 클라이언트** — Octokit 같은 대형 의존성 제거. 필요한 REST만 ~150줄 fetch 래퍼로 직접 호출.

### 공격 시나리오 & 방어

| 위협 | 방어 |
| --- | --- |
| PAT 유출 (XSS) | innerHTML 미사용 + 토큰이 DOM 근처에 없음 + 세션 메모리만 + CSP |
| PAT 유출 (Referrer/로그) | referrer no-referrer, 로그/토스트에 토큰 문자열 미포함 |
| 악성 CDN 응답 | 자체 vendor 번들 + CSP script-src 'self' (런타임 외부 호출 0건) |
| iframe 내장 공격 | JS frame-busting |
| 스팸 PR | Branch protection + 수동 리뷰 |
| 악성 모델 파일 | 매직바이트 + 크기 상한 + try/catch로 파서 예외 격리 |

---

## 6. 게시물 수동 편집 / 삭제

PR로 올라간 게시물을 나중에 수정하거나 지우려면:

- **삭제**: `posts/posts.json`에서 해당 엔트리 제거 + `posts/<slug>/` 폴더 삭제 → 새 PR로 머지.
- **썸네일만 교체**: `posts/<slug>/thumbnail.png` 덮어쓰기 → 커밋.
- **슬러그 변경**: 폴더명 + `posts.json`의 `id`/`modelPath`/`thumbnail` 필드 동시 수정.

무단 삭제 시 직접 커밋 권한이 없으면 PR로만 가능합니다.

---

## 7. 로컬 개발

```bash
cd 3DModelBoard
python -m http.server 8000     # 또는 npx http-server -p 8000 -c-1
```

브라우저 `http://localhost:8000/` 열기.

> `file://` 직접 열기는 ES Modules·fetch 제한으로 동작하지 않습니다.

로컬에서 PR 플로우까지 테스트하려면 PAT를 `localhost`에서 입력하게 됩니다. 신뢰할 수 있는 로컬 머신에서만 수행하세요.

### 7-1. vendor 번들 빌드 (의존성 변경 시에만)

`vendor/core-entry.js`, `vendor/loaders-entry.js`, `vendor/mmd-entry.js`, `vendor/fflate-entry.js` 는 **리포에 커밋된 산출물**입니다. 평소 개발에는 빌드가 필요 없습니다.

다음 경우에만 다시 빌드:
- `package.json` 의 `@babylonjs/core` / `@babylonjs/loaders` / `babylon-mmd` / `fflate` 버전을 올렸을 때
- `build/*-entry.js` 의 selective import 목록을 수정했을 때

```bash
npm install
npm run build:vendor   # esbuild → vendor/*.js 갱신
```

> ⚠️ `build/mmd-entry.js` 를 `export * from 'babylon-mmd';` 로 되돌리지 마세요. 전체 export는 Bullet WASM 워커 모듈을 끌어들여 번들 크기·CSP·초기화 비용이 모두 폭증합니다. 필요한 export만 명시적으로 재export 하는 디시플린을 유지합니다.

---

## 8. 폴더 구조

```
3DModelBoard/
├── index.html · view.html · submit.html · settings.html
├── css/style.css
├── vendor/                 esbuild로 미리 번들된 의존성 (커밋됨)
│   ├── core-entry.js       @babylonjs/core 9.2 (필요 export만)
│   ├── loaders-entry.js    @babylonjs/loaders 9.2 (GLTF)
│   ├── mmd-entry.js        babylon-mmd 1.2 (Pmx/Pmd/Vmd 로더 + SDEF + DxBmp)
│   └── fflate-entry.js     fflate 0.8 (unzipSync)
├── build/                  esbuild 입력 entry (재빌드 시에만 사용)
│   └── *-entry.js
├── js/
│   ├── config.js           리포/제한/경로 화이트리스트 + frame-busting
│   ├── sanitize.js         XSS 방지 DOM 헬퍼·경로 검증·매직바이트
│   ├── idb.js              IndexedDB 래퍼 (v2: textureBundle 마이그레이션)
│   ├── post-index.js       posts.json + 로컬 병합 + textureBundlePaths 정규화
│   ├── header.js · ui.js   상단 네비·토스트
│   ├── viewer-core.js      Babylon Engine/Scene/ArcRotateCamera + 라이트
│   ├── viewer-models.js    VRM/PMX/PMD 통합 로더 (loadVRM/loadMMD)
│   ├── vrm-adapter.js      GLB 헤더 파싱 + VRMC_vrm/VRM 휴머노이드 본 추출
│   ├── viewer-motion.js    Babylon AnimationGroup 래퍼
│   ├── motion-procedural.js idle/walk/run/dance 클립 빌더 (Quaternion Animation)
│   ├── motion-files.js     VMD(babylon-mmd VmdLoader) + BVH 자체 파서
│   ├── drag-drop.js        dropzone 카운터/필터
│   ├── thumbnail.js        스냅샷·이미지 정규화 (engine.canvas.toDataURL)
│   ├── github-api.js       fetch 기반 GitHub REST 래퍼 + PR 플로우 (텍스처 번들 다중 PUT)
│   └── list.js · view.js · submit.js · settings.js
├── posts/
│   ├── posts.json          게시물 인덱스 (배열)
│   └── <slug>/             게시물별 폴더
│       ├── meta.json       (textureBundlePaths 포함)
│       ├── model.<ext>
│       ├── textures/       PMX/PMD 텍스처 번들 (선택)
│       └── thumbnail.png
├── assets/placeholder.svg
└── docs/USER.md · docs/AUTHOR.md
```

---

## 9. 지원 포맷

| 종류 | 확장자 | 처리기 |
| --- | --- | --- |
| 모델 | `.vrm` | Babylon `GLTFFileLoader` + 자체 VRMC_vrm/VRM 확장 파서 (휴머노이드 본 매핑) |
| 모델 | `.pmx`, `.pmd` | `babylon-mmd` `PmxLoader` / `PmdLoader` (`pluginOptions.mmdmodel.referenceFiles` 로 텍스처 번들 해석) |
| 모션 | `.vmd` | `babylon-mmd` `VmdLoader` → boneTracks 를 Babylon `Animation` 으로 변환 (PMX/PMD 전용) |
| 모션 | `.bvh` | 자체 파서 (~120 LoC, HIERARCHY/MOTION 토큰화 → 본별 Quaternion Animation, VRM/PMX 양쪽) |

내장 모션(스탠딩/걷기/달리기/춤추기)은 VRM humanoid 또는 PMX 표준 본 이름(`センター`, `上半身`, `左腕` 등)에 맞춰 Babylon `Animation` 객체로 프로시저럴 생성되어 `AnimationGroup` 으로 묶입니다. 해당 본이 없는 모델은 상태바에 "본을 찾을 수 없음"이 표시되고 적용되지 않습니다.

> MToon 셰이더는 미지원 — VRM 머티리얼은 Babylon GLTF 로더가 만든 PBR 폴백으로 표시됩니다. Bullet WASM 물리도 미사용 (정지/절차적 모션 위주이므로 부트 비용·CSP 복잡도 회피). VRM에 VMD 직접 적용은 MVP 범위 외(리타게터 미연동).
