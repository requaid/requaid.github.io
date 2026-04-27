# 세션 핸드오프 — 3DModelBoard

다른 머신에서 이 작업을 이어받을 때 읽는 문서입니다. 이 파일은 리포에 커밋되어 git으로 이동합니다.

## 현재 상태 (2026-04-26)

**구현 완료** (전체 신규 정적 사이트)
- 페이지: `index.html` (목록) / `view.html` (뷰어) / `submit.html` (글쓰기) / `settings.html` (설정)
- JS 모듈: `js/config.js`, `sanitize.js`, `idb.js`, `post-index.js`, `header.js`, `ui.js`, `viewer-core.js`, `viewer-models.js`, `vrm-adapter.js`, `viewer-motion.js`, `motion-procedural.js`, `motion-files.js`, `bone-map.js`, `drag-drop.js`, `thumbnail.js`, `github-api.js`, `list.js`, `view.js`, `submit.js`, `settings.js`
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

**추가 구현 (2026-04-25)** — **초보자 가이드에 PMX 텍스처 제약 · 에러 모달 안내 반영**
- `docs/BEGINNER-USER.md` §6 문제 해결표에 "로딩이 45초 후 타임아웃 → 에러 팝업 자동 표시", "[📋 로그 복사] 버튼 사용법", "PMX/PMD 로컬 업로드 시 회색/흰색 단색 표시는 사양" 3개 행 추가. §9 용어 사전에 "에러 팝업 / 에러 모달", "타임아웃" 항목 추가.
- `docs/BEGINNER-AUTHOR.md` §8-1 모델 파일 섹션에 PMX/PMD 텍스처 별도 파일 참조 특성 + 단일 파일 업로드 한계 블록쿼트, 45초 타임아웃 안내 추가. §12-1 오류 코드 표에 `모델 타임아웃 (45초 초과)`, `MMDLoader 내부 API 변경 감지` 2개 행 추가. §12-6 신설 — 에러 모달 구성 요소·[📋 로그 복사] 운영자 문의 절차·clipboard 폴백 안내. §14 용어 사전에 "에러 모달", "타임아웃", "LoadingManager" 추가.

**추가 구현 (2026-04-26)** — **three.js → Babylon.js 엔진 이관 + PMX 텍스처 번들 지원**
- 엔진 교체: three.js 0.161 + @pixiv/three-vrm 3.1 → `@babylonjs/core` 9.2 + `@babylonjs/loaders` 9.2 + `babylon-mmd` 1.2 + `fflate` 0.8. MMDLoader 사실상 유지보수 종료(private `_getParser` 의존)인 점이 주된 동기. PMX 텍스처 번들도 같이 들어감.
- **vendor 번들 빌드 파이프라인 신설** — CDN+importmap 경로는 babylon-mmd의 bare-specifier 서브패스 + peer-dep 싱글톤 문제로 불가. esbuild로 `build/<core|loaders|mmd|fflate>-entry.js` 4개 엔트리를 `--bundle --format=esm --splitting --target=es2022 --minify`로 묶어 `vendor/` 에 커밋. 정적 사이트 철학은 유지(소비측은 npm install 불필요, 단지 `node_modules/`만 .gitignore). 빌드 명령: `npm run build:vendor`. 개발용은 `npm run build:vendor:dev`(소스맵).
- `vendor/mmd-entry.js` 는 babylon-mmd 전체 export 대신 PMX/PMD/VMD Loader, ReferenceFileResolver, RegisterDxBmpTextureLoader, SdefInjector, MmdStandardMaterialBuilder 만 셀렉티브 임포트. babylon-mmd `index.js`가 끌어오는 WASM 워커 코드(`Runtime/Optimized/...`)에 top-level `self.` 참조가 있어 ESM 로드 시점에 깨지므로 의도적으로 배제.
- `js/viewer-core.js` 재작성: `Engine` + `Scene` + `ArcRotateCamera`(alpha=-π/2, beta=π/2.2, fov=30°) + `HemisphericLight`/`DirectionalLight` + `MeshBuilder.CreateLineSystem` 그리드. `preserveDrawingBuffer:true` 로 canvas `toDataURL` 스냅샷 보존. ResizeObserver → `engine.resize()`. `ctx.frameHead()`/`ctx.frameFullBody()`는 `getHierarchyBoundingVectors(true)` 기반으로 재구성.
- `js/vrm-adapter.js` 신규 — Babylon GLTF 확장 등록 우회. GLB 헤더(magic `0x46546C67`, JSON chunk type `0x4E4F534A`)를 직접 파싱해 `extensions.VRMC_vrm`(1.0) / `extensions.VRM`(0.x) 둘 다에서 `humanBones` 추출, glTF node 인덱스 → 노드 이름 매핑 → 로드 후 `scene.getTransformNodeByName` + `skeleton.bones` 매칭으로 `humanoid.getBoneNode(name)` 인터페이스 제공. **MToon 셰이더는 미지원**(PBRMaterial 폴백, 게시판 용도엔 허용).
- `js/viewer-models.js` 신규 — `loadVRM(ctx, blob, onProgress)` / `loadMMD(ctx, blob, { ext, onProgress, referenceFiles })`. MMD 경로는 첫 호출 시 `ensureMMDRegistered`: `registerSceneLoaderPlugin(new PmxLoader())` + `new PmdLoader()` + `RegisterDxBmpTextureLoader()` + `SdefInjector.OverrideEngineCreateEffect(engine)`. `tposeSnapshot` 은 모델 모든 후손 + 스켈레톤 본의 `rotationQuaternion.clone()` 을 Map<node, Quat>으로 보관. `unloadCurrent` 가 이전 모델 dispose.
- `js/bone-map.js` 확장 — 기존 `PMX_BONE_MAP` / `MMD_TO_VRM_BONE` / `HUMANOID_BONES` 유지. 신규 `buildMMDHumanoidFromBones(skeletons)` 가 PMX 일본어 본 → 휴머노이드 이름 매핑으로 `getBoneNode(humanoidName)` 인터페이스 노출. `getBoneNode(ctx, name)` 헬퍼 추가.
- `js/motion-procedural.js` 재작성 — `THREE.QuaternionKeyframeTrack` → Babylon `Animation(target='rotationQuaternion', ANIMATIONTYPE_QUATERNION, LOOPMODE_CYCLE)`. 본별 `restQ.multiply(deltaQ)` 로 T-포즈 보존. 4개 클립(idle 2s/walk 1s/run 0.6s/dance 4s) 키프레임 동일.
- `js/viewer-motion.js` 재작성 — `THREE.AnimationMixer` → `AnimationGroup`. `playBuiltIn(name)`/`playClip(group, label)`/`pause()`/`resume()`/`reset()`/`stopCurrent()` 공개 API 호환 유지. `ownsGroup` 플래그로 빌트인 클립만 dispose.
- `js/motion-files.js` 재작성 — VMD: `babylon-mmd VmdLoader.loadAsync` → `IMmdAnimation.boneTracks` 를 직접 순회하여 본별 Quaternion(rot)+Vector3(pos) Animation 생성, `addTargetedAnimation` 으로 그룹에 적재. **VMD는 PMX/PMD에서만**(VRM은 본 리타게팅 미구현). BVH: 80~120 LoC 자체 파서 — HIERARCHY 트리(JOINT/End Site/CHANNELS) + MOTION(Frames:/Frame Time:) → joint 이름을 `bvhKeyToHumanoid` 휴리스틱으로 휴머노이드 본에 매핑 → eulerToQuat로 회전 키만 적재(VRM·PMX 양쪽 가능).
- `js/thumbnail.js` 재작성 — `renderer.domElement.toDataURL` → `engine.getRenderingCanvas().toDataURL`. `captureFromRenderer` → `captureFromViewer(ctx)` 로 이름 변경. 크롭/리사이즈 캔버스 2D 로직은 동일 유지.
- **PMX 텍스처 번들** — `submit.html` 모델 섹션에 라디오(없음/폴더/ZIP) + 폴더는 `<input webkitdirectory>`, ZIP은 `fflate.unzipSync` 해제 → `webkitRelativePath` 주입한 `File[]` → `loadMMD(..., { referenceFiles })`. 합계 25MB, `.bmp/.png/.jpg/.tga/.dds/.spa/.sph` 만 허용.
- `js/idb.js` v1→v2 — `localPosts.textureBundle: [{name, blob, size}]` 필드 추가. `onupgradeneeded` 에 oldVersion 가드 + cursor 마이그레이션.
- `js/github-api.js` `submitPostPR` — 모델 업로드 직후 `textureBundle` 루프 → `posts/<id>/textures/<safeRel>` 다중 PUT, `meta.textureBundlePaths` 에 경로 리스트 기록.
- `js/post-index.js` 정규화 — `normalizeTextureBundlePaths` 가 `^textures/...\.(bmp|png|jpg|jpeg|tga|dds|spa|sph)$` 화이트리스트 + `..` 차단 + 100개 상한.
- `js/view.js` 원격 분기 — `loadTextureBundle(post)` 가 `posts/<id>/` 베이스 + 각 `textureBundlePaths` 항목 fetch → `File[]` 조립 후 `loadMMD` 에 전달. 로컬은 IDB의 `textureBundle` 직접 사용.
- `js/sanitize.js` `checkMagicBytes` — TGA(헤더 모호 → 길이만 확인), BMP(`BM`), DDS(`DDS `), SPA/SPH(BMP 헤더와 동일) 케이스 추가.
- **CSP 강화** — vendor가 `'self'` 에 있으므로 `https://cdn.jsdelivr.net` 전부 제거. `index.html`/`settings.html`은 `script-src 'self'` (인라인 스크립트 미사용). `submit.html`/`view.html`은 importmap 인라인 때문에 `'unsafe-inline'` 유지.
- `js/viewer-vrm.js` 제거.
- 검증: 정적 서버 + 프리뷰에서 4개 vendor 엔트리 모두 핵심 export 노출 확인 (`Engine`/`ImportMeshAsync`/`AnimationGroup`/`PmxLoader`/`VmdLoader`/`RegisterDxBmpTextureLoader`/`SdefInjector`/`GLTFFileLoader`/`unzipSync`). 페이지 4종 콘솔 에러 0.
- 비포함(차기): MToon 셰이더 / Bullet WASM 물리 / VRMA(VRM Animation) 포맷 / VRM 0.x BlendShape 제어 / VRM+VMD 자동 리타게팅.

**추가 구현 (2026-04-24 심야)** — **PMX 텍스처 404 해결 · 에러 모달 · 버전 가드**
- `js/viewer-vrm.js` 로컬 Blob 분기에 전용 `THREE.LoadingManager` 주입. `setURLModifier` 화이트리스트(절대 URL: http/https/data/blob 통과, 상대 경로: 투명 1px PNG data URL로 치환) → 단일 파일 업로드 PMX/PMD 로드 시 텍스처 404 요청이 발생하지 않아 "무한 로딩" 해소. `meshBuilder.manager`/`textureLoader.manager`/`tgaLoader.manager`도 함께 주입(존재 시). 원격 URL 분기는 미변경(리포 posts/ 텍스처 함께 커밋된 게시물 회귀 없음).
- `js/viewer-vrm.js` 상단에 `typeof loader._getParser !== 'function'` 가드 추가. 향후 three.js 버전 업 시 private API 이름 변경을 무한 로딩 대신 명확한 에러로 안내.
- 신규 `js/error-log.js` — console.error/warn 후킹 + `window.error`/`unhandledrejection` 수집, 50개 링 버퍼. `withTimeout(promise, ms, label)` 유틸과 `formatForClipboard({summary, detail})` 포함.
- 신규 `js/error-modal.js` — `showErrorModal({title, summary, detail, hint, onClose})`. [📋 로그 복사] 버튼은 `navigator.clipboard.writeText` 실패 시 `<textarea> + execCommand('copy')` 폴백. 성공/실패 모두 기존 `toastOk`/`toastError`로 피드백. 관리자 문의 안내 문구 고정 포함.
- `js/view.js`/`js/submit.js` — 모델 로딩 호출을 `withTimeout(..., 45000, '모델')`로 감싸고, 기존 `showOverlay('모델 로딩 실패: ...')`와 미리보기 overlay 텍스트를 `showErrorModal`로 교체. PMX/PMD 실패 시 `hint` 문구가 다음 작업(텍스처 번들 업로드)의 동기를 사용자에게 안내.
- `js/list.js` — `installErrorLog()` + 목록 로드 실패 catch에 `showErrorModal`.
- `css/style.css` — `.error-modal-backdrop`(z-index 100) / `.error-modal` / `.error-stack` 규칙 추가. `.toast-host`(z-index 1000)보다 아래라 복사 토스트가 모달 위에 표시.

**로컬 검증** — `python -m http.server 8000` 로 전 페이지 200 OK 확인 (배경 기능 포함).

**배포 검증** — 아직 안 함. Pages 배포 후 실제 URL에서 1~3번 시나리오 + 배경 이미지 업로드/외부 URL 재확인 필요.

## 핵심 설계 결정 (바꾸기 전에 이유 먼저 확인)

- **저장 하이브리드**: `posts.json` + IndexedDB. 병합 순서 = remote + local, createdAt desc.
- **쓰기 = PR 자동 생성**: fork → branch → contents PUT → pulls. Octokit 안 씀, ~150 LoC 자체 fetch 래퍼(`js/github-api.js`).
- **PAT 저장 안 함** — 세션 메모리 `window.__tokenMem`만. 새로고침/탭 종료로 소멸. 의도된 동작.
- **vendor 번들** — Babylon/babylon-mmd/fflate를 `vendor/`에 esbuild로 번들링하여 커밋. CDN+importmap은 babylon-mmd의 bare-specifier 서브패스 + peer-dep 싱글톤 충돌로 불가. `npm install && npm run build:vendor` 로 재생성. 2026-04-26부터 jsdelivr CDN 의존 제거.
- **CSP meta** — `script-src 'self'` (인라인 importmap 쓰는 view/submit만 `'unsafe-inline'`), `object-src 'none'`, `form-action 'self'`, `connect-src` 화이트리스트. `img-src`는 `'self' data: blob: https:`. 2026-04-26부터 `https://cdn.jsdelivr.net` 전부 제거.
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

# 2. (vendor/를 손볼 일이 있을 때만) 의존성 설치
npm install
npm run build:vendor   # vendor/ 재생성, 평소엔 커밋된 결과물을 그대로 사용

# 3. Claude Code 실행
claude

# 4. 첫 프롬프트로 이 문서 읽게 하기
> docs/SESSION.md 읽고 현재 상태·결정 사항 파악한 다음 이어서 작업 진행
```

## vendor 빌드 노트 (재생성이 필요할 때)

- 입력: `build/<core|loaders|mmd|fflate>-entry.js` 4개 + `package.json` 의 `devDependencies` 핀.
- 명령: `npm run build:vendor` (production, 미니파이) / `npm run build:vendor:dev` (소스맵).
- 출력: `vendor/*.js` 약 1000여 개(splitting 청크 포함). **이 디렉터리는 커밋한다**(소비자에게 npm install을 강요하지 않기 위해).
- WASM 워커 코드(top-level `self.` 참조)가 들어가지 않도록 `build/mmd-entry.js` 는 babylon-mmd 의 PmxLoader/PmdLoader/VmdLoader/Reference\*/RegisterDxBmpTextureLoader/SdefInjector/MmdStandardMaterialBuilder 만 셀렉티브 임포트한다. **`export * from 'babylon-mmd'` 로 되돌리지 말 것** — `Runtime/Optimized` 전체가 끌려와 ESM 로드 단계에서 즉사한다.
- esbuild 0.24.x 의 known dev-server vulnerability(GHSA-67mh-4wv8-2f99)는 CLI 빌드만 사용하므로 영향 없음.
