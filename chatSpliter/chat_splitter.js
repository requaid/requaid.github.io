#!/usr/bin/env node
/**
 * 채팅 파일 분할 프로그램
 * 카카오톡, LINE 등 메신저 백업 텍스트 파일을
 * 타임스탬프 기준으로 분할 저장합니다.
 *
 * 사용법:
 *   node chat_splitter.js                              # 대화형 모드
 *   node chat_splitter.js chat.txt -m month            # 월별 분할
 *   node chat_splitter.js chat.txt -m nmonth -n 3      # 분기별 분할
 *   node chat_splitter.js chat.txt -m year --max-chars 200000
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const readline = require('readline');

// ─── 정규식 ──────────────────────────────────────────────────────────────────

// 카카오톡 날짜 구분선
// "2023년 1월 5일 목요일" 또는 "-------- 2023년 1월 5일 목요일 --------"
const RE_KAKAO_DATE = /^-*\s*(\d{4})년\s+(\d{1,2})월\s+(\d{1,2})일\s+\S*요일\s*-*$/;

// 카카오톡 메시지 줄 (타임스탬프 포함 여부로 신뢰도 확인용)
const RE_KAKAO_MSG = /^\[.+?\]\s+\[(오전|오후)\s+\d{1,2}:\d{2}\]/;

// 카카오톡 구형/PC 인라인 타임스탬프
// "2023년 01월 01일 오전 09:05, 홍길동 : 안녕"
const RE_KAKAO_INLINE = /^(\d{4})년\s+(\d{1,2})월\s+(\d{1,2})일\s+(오전|오후)\s+\d{1,2}:\d{2},/;

// LINE 날짜 구분선  "2023.01.05 Sunday"
const RE_LINE_DATE = /^(\d{4})\.(\d{2})\.(\d{2})\s+\S+$/;

// ISO 타임스탬프  "2023-01-05 09:05"
const RE_ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})[T\s]/;

// ─── 인코딩 ───────────────────────────────────────────────────────────────────

/**
 * BOM 제거 후 파일을 읽습니다. UTF-8(BOM 포함/미포함)만 지원합니다.
 * EUC-KR 파일은 iconv-lite 없이 처리하기 어려우므로, 미리 UTF-8 변환을 권장합니다.
 */
function readFileLines(filePath) {
  let buf = fs.readFileSync(filePath);

  // UTF-8 BOM 제거
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    buf = buf.slice(3);
  }

  // EUC-KR / CP949 휴리스틱 감지 (0x80~0xFE 연속 바이트)
  let encoding = 'utf8';
  try {
    const text = buf.toString('utf8');
    // 치환 문자(U+FFFD)가 많으면 EUC-KR 가능성 있음
    const replacements = (text.match(/\uFFFD/g) || []).length;
    if (replacements > 5) {
      encoding = 'euc-kr (자동 감지됨 — iconv-lite 설치 필요)';
      console.error(
        '\n⚠️  파일이 EUC-KR 인코딩인 것 같습니다.\n' +
        '   다음 명령어로 iconv-lite를 설치하면 자동 처리됩니다:\n' +
        '     npm install iconv-lite\n' +
        '   또는 파일을 UTF-8로 미리 변환하세요.\n'
      );
    }
    return { lines: text.split(/\r?\n/), encoding };
  } catch {
    throw new Error('파일을 읽을 수 없습니다: ' + filePath);
  }
}

// iconv-lite가 설치된 경우 EUC-KR 지원
function readFileLinesWithIconvFallback(filePath) {
  let buf = fs.readFileSync(filePath);

  // UTF-8 BOM 제거
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    buf = buf.slice(3);
  }

  // UTF-8로 먼저 시도
  const utf8 = buf.toString('utf8');
  const replacements = (utf8.match(/\uFFFD/g) || []).length;

  if (replacements <= 5) {
    return { lines: utf8.split(/\r?\n/), encoding: 'utf-8' };
  }

  // iconv-lite 시도
  try {
    const iconv = require('iconv-lite');
    for (const enc of ['euc-kr', 'cp949']) {
      try {
        const decoded = iconv.decode(buf, enc);
        if (!(decoded.match(/\uFFFD/g) || []).length) {
          return { lines: decoded.split(/\r?\n/), encoding: enc };
        }
      } catch { /* skip */ }
    }
  } catch {
    // iconv-lite 없음
  }

  // 그냥 UTF-8로 반환 (일부 문자 깨짐 가능)
  console.error('⚠️  인코딩을 정확히 판별하지 못했습니다. UTF-8로 처리합니다.');
  return { lines: utf8.split(/\r?\n/), encoding: 'utf-8 (추정)' };
}

// ─── 형식 감지 ────────────────────────────────────────────────────────────────

function detectFormat(lines) {
  const sample = lines.slice(0, 200);
  let kakaoDate = 0, kakaoMsg = 0, kakaoInline = 0, line = 0, iso = 0;

  for (const l of sample) {
    const s = l.trim();
    if (RE_KAKAO_DATE.test(s))   kakaoDate++;
    if (RE_KAKAO_MSG.test(s))    kakaoMsg++;
    if (RE_KAKAO_INLINE.test(s)) kakaoInline++;
    if (RE_LINE_DATE.test(s))    line++;
    if (RE_ISO_DATE.test(s))     iso++;
  }

  const scores = {
    kakao:        kakaoDate * 10 + kakaoMsg,
    kakao_inline: kakaoInline * 10,
    line:         line * 10,
    iso:          iso * 5,
  };

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : 'kakao';
}

const FORMAT_NAMES = {
  kakao:        '카카오톡 (날짜 구분선 방식)',
  kakao_inline: '카카오톡 (타임스탬프 인라인 방식)',
  line:         'LINE',
  iso:          'ISO 타임스탬프 (범용)',
};

// ─── 파싱 ─────────────────────────────────────────────────────────────────────

/**
 * 각 줄에 날짜를 붙여 { date: Date|null, text: string }[] 반환
 */
function parseLines(lines /*, fmt */) {
  const result = [];
  let current = null;

  for (const raw of lines) {
    const s = raw.trim();
    let m;

    if ((m = s.match(RE_KAKAO_DATE))) {
      current = new Date(+m[1], +m[2] - 1, +m[3]);
    } else if ((m = s.match(RE_KAKAO_INLINE))) {
      current = new Date(+m[1], +m[2] - 1, +m[3]);
    } else if ((m = s.match(RE_LINE_DATE))) {
      current = new Date(+m[1], +m[2] - 1, +m[3]);
    } else if ((m = s.match(RE_ISO_DATE))) {
      current = new Date(+m[1], +m[2] - 1, +m[3]);
    }

    result.push({ date: current, text: raw });
  }

  return result;
}

// ─── 기간 키 ──────────────────────────────────────────────────────────────────

function periodKey(date, mode, n = 1) {
  if (!date) return '__header__';

  const y  = date.getFullYear();
  const mo = date.getMonth() + 1;
  const d  = date.getDate();

  if (mode === 'year')   return `${y}`;
  if (mode === 'month')  return `${y}-${String(mo).padStart(2, '0')}`;
  if (mode === 'day')    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (mode === 'nmonth') {
    const start = Math.floor((mo - 1) / n) * n + 1;
    const end   = Math.min(start + n - 1, 12);
    return `${y}-${String(start).padStart(2, '0')}to${String(end).padStart(2, '0')}`;
  }
  if (mode === 'nday') {
    const jan1 = new Date(y, 0, 1);
    const dayOfYear = Math.floor((date - jan1) / 86400000);
    const groupStart = Math.floor(dayOfYear / n) * n;
    const startDate = new Date(y, 0, 1 + groupStart);
    const endDate   = new Date(y, 0, Math.min(1 + groupStart + n - 1,
      (new Date(y + 1, 0, 1) - jan1) / 86400000));
    const fmt = d2 => `${String(d2.getMonth()+1).padStart(2,'0')}-${String(d2.getDate()).padStart(2,'0')}`;
    return `${y}-${fmt(startDate)}to${fmt(endDate)}`;
  }
  return String(date);
}

// ─── 그룹화 ───────────────────────────────────────────────────────────────────

function groupByPeriod(parsed, mode, n = 1) {
  const header = [];
  const groups = new Map();   // 순서 보장
  let headerDone = false;

  for (const { date, text } of parsed) {
    if (!date && !headerDone) {
      header.push(text);
    } else {
      headerDone = true;
      const key = periodKey(date, mode, n);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(text);
    }
  }

  // 키 정렬
  const sorted = new Map([...groups.entries()].sort());
  return { header, groups: sorted };
}

// ─── 파일 저장 ────────────────────────────────────────────────────────────────

function splitContent(headerText, lines, maxChars) {
  const prefix = headerText ? headerText + '\n\n' : '';
  const chunks = [];
  let buf = [];
  let curLen = prefix.length;

  for (const line of lines) {
    const need = line.length + 1; // +1 for \n
    if (buf.length && curLen + need > maxChars) {
      chunks.push(prefix + buf.join('\n'));
      buf = [];
      curLen = prefix.length;
    }
    buf.push(line);
    curLen += need;
  }
  if (buf.length) chunks.push(prefix + buf.join('\n'));
  return chunks;
}

function writeGroups(header, groups, outputDir, baseName, maxChars) {
  fs.mkdirSync(outputDir, { recursive: true });
  const written = [];

  for (const [key, lines] of groups) {
    const content = lines.join('\n');

    if (maxChars && content.length > maxChars) {
      const chunks = splitContent('', lines, maxChars);
      chunks.forEach((chunk, i) => {
        const fname = `${baseName}_${key}_${i + 1}.txt`;
        const fpath = path.join(outputDir, fname);
        fs.writeFileSync(fpath, chunk, 'utf8');
        written.push({ fname, chars: chunk.length });
        console.log(`  저장: ${fname}  (${chunk.length.toLocaleString()} 글자)`);
      });
    } else {
      const fname = `${baseName}_${key}.txt`;
      const fpath = path.join(outputDir, fname);
      fs.writeFileSync(fpath, content, 'utf8');
      written.push({ fname, chars: content.length });
      console.log(`  저장: ${fname}  (${content.length.toLocaleString()} 글자)`);
    }
  }
  return written;
}

// ─── readline 유틸 ────────────────────────────────────────────────────────────

function createRl() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, ans => resolve(ans.trim().replace(/^["']|["']$/g, ''))));
}

async function askMenu(rl, title, options) {
  console.log(`\n${title}:`);
  options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));
  while (true) {
    const ans = await ask(rl, `번호 선택 (1-${options.length}): `);
    const n = parseInt(ans, 10);
    if (!isNaN(n) && n >= 1 && n <= options.length) return n - 1;
    console.log(`  1~${options.length} 사이의 번호를 입력하세요.`);
  }
}

// ─── 대화형 모드 ──────────────────────────────────────────────────────────────

const MAX_CHARS_PRESETS = [
  { name: 'Claude.ai',   chars: 200_000 },
  { name: 'ChatGPT',     chars: 100_000 },
  { name: '네이버 블로그', chars: 10_000 },
  { name: '직접 입력',   chars: null    },
  { name: '제한 없음',   chars: 0       },
];

async function interactiveMode() {
  const rl = createRl();

  console.log();
  console.log('╔══════════════════════════════════════╗');
  console.log('║      채팅 파일 분할 프로그램           ║');
  console.log('╚══════════════════════════════════════╝');

  // 1. 입력 파일
  let inputFile;
  while (true) {
    inputFile = await ask(rl, '\n분할할 파일 경로를 입력하세요: ');
    if (!inputFile) { console.log('  파일 경로를 입력해 주세요.'); continue; }
    if (fs.existsSync(inputFile) && fs.statSync(inputFile).isFile()) break;
    console.log(`  파일을 찾을 수 없습니다: ${inputFile}`);
  }

  // 2. 파일 읽기
  let lines, encoding;
  try {
    ({ lines, encoding } = readFileLinesWithIconvFallback(inputFile));
  } catch (e) {
    console.error(`\n  오류: ${e.message}`);
    rl.close();
    return;
  }
  console.log(`  인코딩: ${encoding}  /  총 ${lines.length.toLocaleString()}줄`);

  // 3. 형식 감지
  const fmt = detectFormat(lines);
  console.log(`  감지된 형식: ${FORMAT_NAMES[fmt] || fmt}`);

  // 4. 분할 기준
  const modeIdx = await askMenu(rl, '분할 기준 선택', ['년도별', '월별', '일별', 'N개월 단위', 'N일 단위']);
  const modes = ['year', 'month', 'day', 'nmonth', 'nday'];
  const mode = modes[modeIdx];

  let n = 1;
  if (mode === 'nmonth') {
    while (true) {
      const raw = await ask(rl, '  N 값 입력 (예: 3 → 분기별, 6 → 반기별) [기본: 3]: ') || '3';
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num >= 1 && num <= 12) { n = num; break; }
      console.log('  1~12 사이의 정수를 입력하세요.');
    }
  }
  if (mode === 'nday') {
    while (true) {
      const raw = await ask(rl, '  N 값 입력 (예: 7 → 주간, 14 → 2주, 30 → 약 월) [기본: 7]: ') || '7';
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num >= 1 && num <= 365) { n = num; break; }
      console.log('  1~365 사이의 정수를 입력하세요.');
    }
  }

  // 5. 최대 글자수
  console.log('\n최대 글자수 제한 (초과 파일은 _1, _2, ... 로 추가 분할)');
  const presetLabels = MAX_CHARS_PRESETS.map(p =>
    p.chars ? `${p.name}  (${p.chars.toLocaleString()}자)` : p.name
  );
  const presetIdx = await askMenu(rl, '최대 글자수 기준', presetLabels);
  const preset = MAX_CHARS_PRESETS[presetIdx];

  let maxChars;
  if (preset.chars === null) {
    while (true) {
      const raw = await ask(rl, '  최대 글자수 입력: ');
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num > 0) { maxChars = num; break; }
      console.log('  1 이상의 정수를 입력하세요.');
    }
  } else {
    maxChars = preset.chars > 0 ? preset.chars : null;
  }

  // 6. 출력 폴더
  const inputPath = path.parse(inputFile);
  const defaultOut = path.join(inputPath.dir, inputPath.name + '_split');
  const outRaw = await ask(rl, `\n출력 폴더 경로 (기본: ${defaultOut}): `);
  const outputDir = outRaw || defaultOut;

  rl.close();

  // 7. 처리
  console.log('\n처리 중...');
  const parsed = parseLines(lines);
  const { header, groups } = groupByPeriod(parsed, mode, n);

  const periodLabel = { year: '년도', month: '월', day: '일', nmonth: `${n}개월 단위`, nday: `${n}일 단위` }[mode];
  console.log(`  분할 기간 수: ${groups.size}개 (${periodLabel})`);
  console.log();

  const written = writeGroups(header, groups, outputDir, inputPath.name, maxChars);
  const totalChars = written.reduce((s, w) => s + w.chars, 0);

  console.log(`\n완료!  ${written.length}개 파일  /  총 ${totalChars.toLocaleString()} 글자`);
  console.log(`출력 폴더: ${path.resolve(outputDir)}`);
}

// ─── CLI 모드 ─────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
채팅 파일 분할 프로그램

사용법:
  node chat_splitter.js [파일] [옵션]

옵션:
  -m, --mode <모드>       분할 기준: year | month | day | nmonth | nday
  -n, --n <숫자>          nmonth/nday 모드의 N 값 (기본: 3)
  -o, --output <폴더>     출력 폴더 (기본: <파일명>_split/)
  --max-chars <숫자>      최대 글자수; 초과 시 _1/_2/... 분할 (0=무제한)
  -h, --help              도움말

분할 모드:
  year    년도별 분할
  month   월별 분할
  day     일별 분할
  nmonth  N개월 단위 분할
  nday    N일 단위 분할

예시:
  node chat_splitter.js                              # 대화형 모드
  node chat_splitter.js chat.txt -m month
  node chat_splitter.js chat.txt -m nmonth -n 3
  node chat_splitter.js chat.txt -m year --max-chars 200000
  node chat_splitter.js chat.txt -m month -o ./out
`);
}

function parseArgs(argv) {
  const args = { input: null, mode: null, n: 3, output: null, maxChars: 0 };
  const arr = argv.slice(2);
  let i = 0;
  while (i < arr.length) {
    const a = arr[i];
    if (a === '-h' || a === '--help') { printHelp(); process.exit(0); }
    else if (a === '-m' || a === '--mode')        { args.mode      = arr[++i]; }
    else if (a === '-n' || a === '--n')           { args.n         = parseInt(arr[++i], 10); }
    else if (a === '-o' || a === '--output')      { args.output    = arr[++i]; }
    else if (a === '--max-chars')                 { args.maxChars  = parseInt(arr[++i], 10); }
    else if (!a.startsWith('-'))                  { args.input     = a; }
    i++;
  }
  return args;
}

function cliMode(args) {
  if (!fs.existsSync(args.input) || !fs.statSync(args.input).isFile()) {
    console.error(`오류: 파일을 찾을 수 없습니다 — ${args.input}`);
    process.exit(1);
  }

  const VALID_MODES = ['year', 'month', 'day', 'nmonth', 'nday'];
  if (!VALID_MODES.includes(args.mode)) {
    console.error(`오류: 올바른 -m 모드를 지정하세요 (${VALID_MODES.join(' | ')})`);
    process.exit(1);
  }

  let lines, encoding;
  try {
    ({ lines, encoding } = readFileLinesWithIconvFallback(args.input));
  } catch (e) {
    console.error(`오류: ${e.message}`);
    process.exit(1);
  }
  console.log(`인코딩: ${encoding}  /  총 ${lines.length.toLocaleString()}줄`);

  const fmt = detectFormat(lines);
  console.log(`감지된 형식: ${FORMAT_NAMES[fmt] || fmt}`);

  const parsed = parseLines(lines);
  const { header, groups } = groupByPeriod(parsed, args.mode, args.n);
  console.log(`분할 기간 수: ${groups.size}`);

  const ip = path.parse(args.input);
  const outputDir = args.output || path.join(ip.dir, ip.name + '_split');
  const maxChars  = args.maxChars > 0 ? args.maxChars : null;

  console.log();
  const written = writeGroups(header, groups, outputDir, ip.name, maxChars);
  const total   = written.reduce((s, w) => s + w.chars, 0);

  console.log(`\n완료!  ${written.length}개 파일  /  총 ${total.toLocaleString()} 글자`);
  console.log(`출력 폴더: ${path.resolve(outputDir)}`);
}

// ─── 진입점 ───────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv);

if (!args.input) {
  interactiveMode().catch(e => {
    console.error('\n오류:', e.message);
    process.exit(1);
  });
} else {
  cliMode(args);
}
