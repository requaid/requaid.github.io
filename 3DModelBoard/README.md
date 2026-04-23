# 3D Model Board

GitHub Pages(github.io)에서 동작하는 VRM/MMD 모델 뷰어 게시판입니다.

- 게시판에 3D 모델을 올리고 목록·상세 페이지로 공유합니다.
- 뷰어에서 내장 모션(스탠딩/걷기/달리기/춤추기)을 재생·정지할 수 있습니다.
- VMD/BVH 모션 파일을 뷰어 화면에 드래그&드롭하면 즉시 모델에 적용됩니다.
- 게시물은 두 가지 경로로 저장됩니다:
  - **리포지토리**: PR로 공유해 모두에게 공개
  - **내 브라우저(IndexedDB)**: 로컬 전용, 자기 기기에서만 보임

> **공개성 유의** — 리포에 올라간 모든 파일은 영구 공개됩니다. 실명/이메일/민감 정보를 업로드하지 마세요.

---

## 📖 매뉴얼

사용자 유형에 따라 읽어야 할 문서가 다릅니다.

| 유형 | 문서 | 내용 |
| --- | --- | --- |
| 🔍 **구경만 하는 분 (리더)** | **[docs/USER.md](docs/USER.md)** | 목록·뷰어·모션 조작·드래그&드롭·개인용 로컬 저장 |
| ✍ **작성자 / 운영자** | **[docs/AUTHOR.md](docs/AUTHOR.md)** | PAT 발급·글쓰기·PR 플로우·운영 체크리스트·보안 메모 |

---

## 🛠 설치 가이드 (운영자)

### 1. 리포지토리 준비

이 프로젝트를 자신의 GitHub 계정으로 fork 또는 복사합니다.

```bash
git init
git add .
git commit -m "init: 3d model board"
git branch -M main
git remote add origin https://github.com/<username>/3DModelBoard.git
git push -u origin main
```

### 2. GitHub Pages 활성화

- GitHub 리포 → **Settings → Pages**
- Source: **Deploy from a branch**, Branch: **`main` / `(root)`** 선택 후 Save.
- 잠시 후 `https://<username>.github.io/3DModelBoard/` 주소로 접속 가능.

### 3. Branch Protection (권장)

- **Settings → Branches → Add rule**
- Branch name pattern: `main`
- ✅ Require a pull request before merging
- ✅ Require approvals (1명 이상)
- ✅ Disallow force pushes

### 4. 로컬 개발·테스트

정적 파일만 있으므로 빌드가 필요 없습니다.

```bash
cd 3DModelBoard
python -m http.server 8000
# 또는
npx http-server -p 8000 -c-1
```

브라우저에서 `http://localhost:8000/` 열기.

> ⚠ `file://` 직접 열기는 ES Modules·fetch 제한으로 **동작하지 않습니다.** 반드시 HTTP 서버로 띄우세요.

### 5. 첫 사용 전 설정

- 리더는 별도 설정 없이 바로 사용 가능. ([docs/USER.md](docs/USER.md) 참고)
- 글을 쓰거나 운영하려면 **settings.html**에서 리포 정보와 PAT를 입력해야 합니다. 자세한 순서는 [docs/AUTHOR.md](docs/AUTHOR.md#1-준비-단계)를 보세요.

---

## 📦 지원 포맷

| 종류 | 확장자 | 처리기 |
| --- | --- | --- |
| 모델 | `.vrm` | `@pixiv/three-vrm` (VRMLoaderPlugin) |
| 모델 | `.pmx`, `.pmd` | `three/addons/loaders/MMDLoader` |
| 모션 | `.vmd` | MMDLoader.loadAnimation(blob URL) + VRM 본 매핑 |
| 모션 | `.bvh` | `three/addons/loaders/BVHLoader` |

---

## 🔒 보안 요점

- PAT는 세션 메모리에만 보관(새로고침·탭 종료 시 소멸).
- CDN은 `cdn.jsdelivr.net` 불변 버전 경로만, CSP로 `script-src` 잠금.
- 사용자 콘텐츠는 `textContent` / `setAttribute`로만 주입(`innerHTML` 미사용).
- 파일은 확장자 + 매직바이트 이중 검증.
- Frame-busting으로 clickjacking 방어.

자세한 내용과 운영자 체크리스트는 [docs/AUTHOR.md §5](docs/AUTHOR.md#5-보안-메모)를 참고하세요.

---

## 📂 폴더 구조 (요약)

```
3DModelBoard/
├── index.html · view.html · submit.html · settings.html
├── css/style.css
├── js/*.js                # 페이지 진입점·뷰어·GitHub 클라이언트 등
├── posts/posts.json       # 게시물 인덱스
├── posts/<slug>/          # PR로 추가되는 게시물 폴더
├── assets/placeholder.svg
└── docs/
    ├── USER.md            # 리더용 매뉴얼
    └── AUTHOR.md          # 작성자·운영자용 매뉴얼
```

전체 파일 구조는 [docs/AUTHOR.md §8](docs/AUTHOR.md#8-폴더-구조)를 참고하세요.

---

## 📝 크레딧 / 라이선스

- three.js — MIT
- @pixiv/three-vrm — MIT
- MMDLoader / BVHLoader (three.js examples/jsm) — MIT
- 본 프로젝트 자체 코드는 리포의 라이선스에 따릅니다.
