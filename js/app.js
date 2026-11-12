/* 홀덤 매니저 — 화면 / 상태 관리 */
(function () {
  'use strict';

  const E = window.Engine;
  const KEY = 'holdem-manager:v1';
  const MAX_SEATS = 10;
  const COLORS = ['#f6c350', '#5b9dff', '#3ddc84', '#ff6b73', '#b28cff', '#ff8fc8', '#2fd3c4', '#ff9b4a', '#a3e05c', '#5fd0ff'];

  // ---------------------------------------------------------------- 유틸
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const fmt = (n) => (Math.round(n) || 0).toLocaleString('ko-KR');
  // 금액 표시: 기본은 꺼짐(포인트 'P'). 설정에서 켜면 '원'과 상금 · 손익 · 정산 용어를 써요.
  const money = () => !!(S && S.prefs && S.prefs.money);
  const unit = () => (money() ? '원' : 'P');
  const won = (n) => fmt(n) + unit();
  const W = (withMoney, plain) => (money() ? withMoney : plain);
  const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initial = (name) => (String(name || '?').trim()[0] || '?').toUpperCase();
  const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
  const wide = () => matchMedia('(min-width: 760px)').matches;
  function fmtTime(ms) {
    const t = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    const p = (x) => String(x).padStart(2, '0');
    return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
  }
  function fmtDur(min) {
    const h = Math.floor(min / 60), m = min % 60;
    return h ? `${h}시간${m ? ' ' + m + '분' : ''}` : `${m}분`;
  }
  function fmtMan(v) {
    if (v >= 10000) return (v / 10000).toString().replace(/\.0$/, '') + '만';
    if (v >= 1000) return (v / 1000) + '천';
    return fmt(v);
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const getPath = (o, path) => path.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
  function setPath(o, path, v) {
    const ks = path.split('.'), last = ks.pop();
    ks.reduce((x, k) => x[k], o)[last] = v;
  }

  // ---------------------------------------------------------------- 아이콘
  const I = {
    clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2"/><path d="M9.5 2.5h5"/>',
    table: '<rect x="2" y="6" width="20" height="12" rx="6"/><rect x="6.5" y="9.5" width="11" height="5" rx="2.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.3c2.1.7 3.5 2.8 3.5 5.7"/>',
    settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    play: '<path d="M7.5 5.2v13.6a1 1 0 0 0 1.5.86l11.2-6.8a1 1 0 0 0 0-1.72L9 4.34a1 1 0 0 0-1.5.86z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4.5" width="4.2" height="15" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.2" fill="currentColor" stroke="none"/>',
    next: '<path d="M5 5.5v13l10-6.5z" fill="currentColor"/><path d="M18.5 5v14"/>',
    prev: '<path d="M19 5.5v13L9 12z" fill="currentColor"/><path d="M5.5 5v14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.5 4M16 6h2.5a2.5 2.5 0 0 1-2.5 4"/><path d="M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z"/>',
    chip: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    shuffle: '<path d="M3 7h3c4.5 0 6.5 10 11 10h4"/><path d="M3 17h3c1.7 0 3-1.4 4.2-3.3M13.8 10.3C15 8.4 16.3 7 18 7h3"/><path d="m18 4 3 3-3 3M18 14l3 3-3 3"/>',
    coffee: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5v2.5M12 3.5v2.5"/>',
    grip: '<circle cx="9" cy="6" r="1.4" fill="currentColor"/><circle cx="15" cy="6" r="1.4" fill="currentColor"/><circle cx="9" cy="12" r="1.4" fill="currentColor"/><circle cx="15" cy="12" r="1.4" fill="currentColor"/><circle cx="9" cy="18" r="1.4" fill="currentColor"/><circle cx="15" cy="18" r="1.4" fill="currentColor"/>',
    sound: '<path d="M4 9.5v5h3.5L12 19V5L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>'
  };
  const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;

  // ---------------------------------------------------------------- 블라인드 프리셋
  // 홀덤펍·대회에서 흔히 쓰는 블라인드 진행 (100/200 → 200/300 → 200/400 → 300/600 …)
  const LADDER = [
    [10, 20], [15, 30], [25, 50], [50, 100], [75, 150], [100, 200], [200, 300], [200, 400], [300, 600],
    [400, 800], [500, 1000], [600, 1200], [800, 1600], [1000, 2000], [1200, 2400], [1500, 3000],
    [2000, 4000], [2500, 5000], [3000, 6000], [4000, 8000], [5000, 10000], [6000, 12000], [8000, 16000],
    [10000, 20000], [15000, 30000], [20000, 40000], [25000, 50000], [30000, 60000], [40000, 80000], [50000, 100000]
  ];
  // 모든 프리셋: 시작 스택 ≈ 100BB(딥스택은 200BB), 약 1시간마다 10분 휴식
  const PRESETS = {
    turbo: { label: '터보', min: 10, depth: 100, every: 6, desc: '10분 레벨 · 1시간마다 휴식' },
    standard: { label: '표준', min: 15, depth: 100, every: 4, desc: '15분 레벨 · 1시간마다 휴식' },
    deep: { label: '딥스택', min: 20, depth: 200, every: 3, desc: '20분 레벨 · 1시간마다 휴식' }
  };
  // startBB: 시작 빅블라인드 (0이면 시작 칩의 약 100BB로 자동)
  function buildLevels(key, startChips, startBB) {
    const p = PRESETS[key] || PRESETS.standard;
    const target = startBB > 0 ? startBB : Math.max(1, startChips / p.depth);
    let start = 0, best = Infinity;
    LADDER.forEach(([, bb], i) => { const d = Math.abs(Math.log(bb / target)); if (d < best) { best = d; start = i; } });
    const out = [], count = 20;
    for (let i = 0; i < count && start + i < LADDER.length; i++) {
      const [sb, bb] = LADDER[start + i];
      out.push({ sb, bb, min: p.min });
      if ((i + 1) % p.every === 0 && i < count - 1) out.push({ brk: true, min: 10 });
    }
    return out;
  }

  // ---------------------------------------------------------------- 상태
  function defaultState() {
    return {
      v: 1,
      started: false,
      screen: 'clock',
      game: {
        mode: 'tournament',
        name: '',
        buyIn: { won: 20000, chips: 20000 },
        rebuy: { on: true, won: 20000, chips: 20000, until: 6 },
        addon: { on: false, won: 20000, chips: 20000 },
        cash: { sb: 100, bb: 200 },
        preset: 'standard',
        startBB: 200,
        levels: buildLevels('standard', 20000, 200)
      },
      prefs: { sound: true, vibrate: true, warn: true, wake: true, money: false },
      clock: { level: 0, running: false, remain: 15 * 60000, endsAt: 0, warned: -1 },
      startedAt: 0,
      players: [],
      draft: [],
      seatRandom: true,
      button: 1,
      handNo: 0,
      hand: null,
      undo: [],
      outSeq: 0,
      finished: false
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      const d = defaultState();
      const m = Object.assign(d, s, { game: Object.assign(d.game, s.game), prefs: Object.assign(d.prefs, s.prefs) });
      // 게임 시작 전이고 직접 편집한 구조가 아니면 최신 프리셋으로 다시 만든다
      if (!m.started && m.game.preset !== 'custom') m.game.levels = buildLevels(m.game.preset, m.game.buyIn.chips, m.game.startBB);
      return m;
    } catch (e) { return null; }
  }
  let S = load() || defaultState();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 저장 공간 부족 등 */ }
  }

  // 화면 전용 임시 상태 (저장 안 함)
  const UI = { raiseOpen: false, raiseTo: 0, raiseKey: '', activePot: 0, shownDealt: 0, bustQueue: [], modal: null, resolve: null, resolveValue: null, sheetId: null, npSeat: null, structOpen: false, preview: null };

  // ---------------------------------------------------------------- 파생 값
  const isT = () => S.game.mode === 'tournament';
  const levels = () => S.game.levels;
  const curLevel = () => levels()[S.clock.level] || levels()[levels().length - 1] || { sb: 0, bb: 0, min: 1 };
  const player = (id) => S.players.find((p) => p.id === id);
  function levelNo(i) {
    let n = 0;
    for (let k = 0; k <= i && k < levels().length; k++) if (!levels()[k].brk) n++;
    return n;
  }
  function blindsAt(i) {
    const L = levels();
    for (let k = i; k >= 0; k--) if (L[k] && !L[k].brk) return L[k];
    for (let k = i; k < L.length; k++) if (!L[k].brk) return L[k];
    return { sb: 0, bb: 0 };
  }
  const currentBlinds = () => (isT() ? blindsAt(S.clock.level) : S.game.cash);
  function nextBlindLevel() {
    const L = levels();
    for (let k = S.clock.level + 1; k < L.length; k++) if (!L[k].brk) return L[k];
    return null;
  }
  function clockRemain() {
    const c = S.clock;
    return c.running ? Math.max(0, c.endsAt - Date.now()) : c.remain;
  }
  function msToNextBreak() {
    const L = levels();
    if (curLevel().brk) return 0;
    let ms = clockRemain();
    for (let k = S.clock.level + 1; k < L.length; k++) {
      if (L[k].brk) return ms;
      ms += L[k].min * 60000;
    }
    return null;
  }
  function rebuyOpen() {
    const r = S.game.rebuy;
    if (!isT()) return true;
    if (!r.on) return false;
    return !r.until || levelNo(S.clock.level) <= r.until;
  }
  const chipRatio = () => S.game.buyIn.chips / Math.max(1, S.game.buyIn.won); // 1원당 칩
  const activePlayers = () => S.players.filter((p) => p.status !== 'out');
  const seated = () => S.players.filter((p) => p.status !== 'out' && p.seat).sort((a, b) => a.seat - b.seat);
  const eligible = () => seated().filter((p) => p.status === 'in' && p.stack > 0);
  function freeSeats() {
    const used = new Set(seated().map((p) => p.seat));
    const out = [];
    for (let n = 1; n <= MAX_SEATS; n++) if (!used.has(n)) out.push(n);
    return out;
  }
  const inHand = (id) => !!(S.hand && S.hand.seats[id]);
  function buttonPlayer() {
    const el = eligible();
    if (!el.length) return null;
    return el.find((p) => p.seat >= (S.button || 1)) || el[0];
  }
  function previewPositions() {
    const el = eligible();
    if (el.length < 2) return {};
    const d = buttonPlayer(), i = el.indexOf(d), n = el.length;
    return n === 2 ? { d: d.id, sb: d.id, bb: el[(i + 1) % n].id } : { d: d.id, sb: el[(i + 1) % n].id, bb: el[(i + 2) % n].id };
  }
  function standings() {
    const alive = S.players.filter((p) => p.status !== 'out').sort((a, b) => b.stack - a.stack);
    const out = S.players.filter((p) => p.status === 'out').sort((a, b) => b.outSeq - a.outSeq);
    return alive.concat(out);
  }
  const cashValue = (p) => (p.cashout || 0) + (p.status === 'out' ? 0 : p.stack / chipRatio());
  const cashNet = (p) => Math.round(cashValue(p) - p.invested);
  function ratioText() {
    const g = S.game, per = g.buyIn.won / Math.max(1, g.buyIn.chips);
    return `${won(g.buyIn.won)} → <b>${fmt(g.buyIn.chips)}칩</b> · 1칩 = ${Number(per.toFixed(2)).toLocaleString('ko-KR')}${unit()}`;
  }

  // ---------------------------------------------------------------- 사운드 / 진동 / 화면 유지
  let actx = null;
  function audio() {
    if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  // 효과음: 배음을 겹친 벨(차임) 소리를 잔향과 함께 합성 — 외부 음원 파일 없이 동작
  let bus = null;
  function soundBus() {
    const ctx = audio();
    if (!ctx) return null;
    if (bus) return bus;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    const len = Math.floor(ctx.sampleRate * 2.4), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.4);
    }
    const verb = ctx.createConvolver();
    verb.buffer = ir;
    const wet = ctx.createGain(), dry = ctx.createGain(), input = ctx.createGain();
    wet.gain.value = 0.3;
    dry.gain.value = 0.85;
    input.connect(dry).connect(comp);
    input.connect(verb).connect(wet).connect(comp);
    comp.connect(ctx.destination);
    bus = input;
    return bus;
  }
  function bell(freq, start, opts) {
    const ctx = audio(), dest = soundBus();
    if (!ctx || !dest) return;
    const o = opts || {}, t0 = ctx.currentTime + start, vol = o.vol || 0.22, decay = o.decay || 2;
    const partials = o.soft ? [[1, 1], [2, 0.3], [3, 0.1]] : [[1, 1], [2.01, 0.45], [3.02, 0.2], [4.17, 0.1], [5.43, 0.05]];
    partials.forEach(([ratio, amp], k) => {
      const osc = ctx.createOscillator(), g = ctx.createGain(), d = decay / (1 + k * 0.7);
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol * amp, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      osc.connect(g).connect(dest);
      osc.start(t0);
      osc.stop(t0 + d + 0.05);
    });
  }
  const SND = {
    // 블라인드 업: 맑게 올라가는 차임 (솔-시-레-솔)
    level() {
      [[783.99, 0], [987.77, 0.16], [1174.66, 0.32]].forEach(([f, t]) => bell(f, t, { decay: 2.2 }));
      bell(1567.98, 0.5, { decay: 2.8, vol: 0.15 });
    },
    // 휴식 시작: 부드럽게 내려가는 '딩-동'
    brk() { bell(659.25, 0, { soft: true, decay: 2.4, vol: 0.32 }); bell(523.25, 0.5, { soft: true, decay: 3.2, vol: 0.32 }); },
    // 휴식 끝: 밝게 두 번 울리고 마무리
    resume() { bell(880, 0, { decay: 1.1 }); bell(880, 0.18, { decay: 1.1 }); bell(1318.51, 0.4, { decay: 2.6 }); }
  };
  function vibrate(pattern) {
    if (S.prefs.vibrate && navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* 미지원 */ } }
  }
  let wakeLock = null, wakeBusy = false;
  async function keepAwake() {
    if (!S.started || !S.prefs.wake || wakeLock || wakeBusy || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    wakeBusy = true;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (e) { /* 권한 없음 */ }
    wakeBusy = false;
  }
  function releaseWake() { if (wakeLock) { wakeLock.release(); wakeLock = null; } }
  function toggleFullscreen() {
    const d = document;
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      return;
    }
    const el = d.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return toast('이 브라우저는 전체 화면을 지원하지 않아요');
    const r = req.call(el);
    if (r && r.catch) r.catch(() => toast('전체 화면으로 전환하지 못했어요'));
  }

  // ---------------------------------------------------------------- 타이머
  function resetClock() {
    const first = levels()[0];
    S.clock = { level: 0, running: false, remain: (first ? first.min : 15) * 60000, endsAt: 0, warned: -1 };
  }
  function setRemain(ms) {
    const c = S.clock;
    if (c.running) c.endsAt = Date.now() + ms; else c.remain = ms;
  }
  function gotoLevel(i) {
    const c = S.clock;
    c.level = clamp(i, 0, levels().length - 1);
    c.warned = -1;
    setRemain(levels()[c.level].min * 60000);
  }
  function tick() {
    if (S.started && isT() && S.clock.running) {
      const c = S.clock;
      let rem = c.endsAt - Date.now();
      if (rem <= 0) {
        const wasBrk = !!curLevel().brk;
        let moved = false;
        while (rem <= 0) {
          if (c.level >= levels().length - 1) { c.running = false; c.remain = 0; break; }
          c.level++;
          moved = true;
          rem += levels()[c.level].min * 60000;
        }
        if (c.running) c.endsAt = Date.now() + rem;
        save();
        render();
        if (moved) announceLevel(wasBrk);
        else toast('마지막 레벨이 끝났어요. 설정에서 레벨을 추가하세요', 'warn');
      }
    }
    updateClock();
  }
  function updateClock() {
    const ms = clockRemain();
    const L = curLevel();
    const total = Math.max(1, (L.min || 1) * 60000);
    $$('[data-clock="time"]').forEach((el) => {
      el.textContent = fmtTime(ms);
      el.classList.toggle('paused', !S.clock.running);
    });
    $$('[data-clock="bar"]').forEach((el) => { el.style.width = clamp((ms / total) * 100, 0, 100).toFixed(2) + '%'; });
    $$('[data-clock="elapsed"]').forEach((el) => { el.textContent = fmtTime(Date.now() - (S.startedAt || Date.now())); });
    $$('[data-clock="nextbreak"]').forEach((el) => {
      const nb = msToNextBreak();
      el.textContent = L.brk ? '휴식 중' : nb == null ? '남은 휴식 없음' : '다음 휴식까지 ' + fmtTime(nb);
    });
  }
  function announceLevel(fromBreak) {
    const L = curLevel();
    const resume = !L.brk && fromBreak;   // 휴식이 끝나고 게임 재개
    if (S.prefs.sound) (L.brk ? SND.brk : resume ? SND.resume : SND.level)();
    vibrate(L.brk ? [700, 300, 700] : resume ? [150, 80, 150, 80, 150, 80, 500] : [300, 120, 300, 120, 600]);
    // 화면을 가리지 않는 배너: 터치는 아래 화면으로 그대로 전달되고 6초 뒤 저절로 사라진다
    const nx = nextBlindLevel();
    $$('.announce').forEach((x) => x.remove());
    const el = document.createElement('div');
    el.className = 'announce' + (L.brk ? ' brk' : resume ? ' resume' : '');
    el.setAttribute('role', 'status');
    const no = levelNo(S.clock.level);
    el.innerHTML = L.brk
      ? `<div class="announce-card"><span class="a-ico">${icon('coffee')}</span>
          <div class="a-text"><div class="a-k">BREAK TIME</div><div class="a-s">${nx ? `휴식 후 ${fmt(nx.sb)} / ${fmt(nx.bb)}` : '잠시 쉬어가요'}</div></div>
          <div class="a-v">휴식 ${L.min}분</div></div>`
      : `<div class="announce-card">${resume ? `<span class="a-ico">${icon('play')}</span>` : ''}
          <div class="a-text"><div class="a-k">${resume ? '휴식 끝 · LEVEL ' + no : 'LEVEL ' + no}</div>
            <div class="a-s">${resume ? '자리로 돌아와 게임을 다시 시작하세요' : '블라인드 업 · 다음 핸드부터'}</div></div>
          <div class="a-v">${fmt(L.sb)} / ${fmt(L.bb)}</div></div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 6200);
  }

  // ---------------------------------------------------------------- 모달 / 토스트
  function toast(msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    $('#toast-root').appendChild(el);
    setTimeout(() => el.classList.add('out'), 2300);
    setTimeout(() => el.remove(), 2700);
  }
  function openModal(html, opts) {
    opts = opts || {};
    UI.modal = opts;
    $('#modal-root').innerHTML = `<div class="modal-back" data-action="${opts.locked ? 'noop' : 'modal-close'}"><div class="modal" role="dialog" aria-modal="true" data-action="noop">${html}</div></div>`;
    const f = $('#modal-root [autofocus]');
    if (f) setTimeout(() => { f.focus(); if (f.select) f.select(); }, 60);
  }
  function closeModal() {
    $('#modal-root').innerHTML = '';
    UI.modal = null;
    if (UI.resolve) { const r = UI.resolve; UI.resolve = null; UI.resolveValue = null; r(null); }
  }
  function confirmBox(o) {
    return new Promise((res) => {
      openModal(`<h3 class="m-title">${o.title}</h3>${o.body ? `<p class="m-body">${o.body}</p>` : ''}
        <div class="m-actions"><button class="btn" data-action="m-resolve" data-v="0">${o.cancel || '취소'}</button>
        <button class="btn ${o.danger ? 'btn-red' : 'btn-gold'}" data-action="m-resolve" data-v="1">${o.ok || '확인'}</button></div>`);
      UI.resolve = res;
      UI.resolveValue = null;
    });
  }
  function promptNumber(o) {
    return new Promise((res) => {
      UI.preview = o.preview || null;
      openModal(`<h3 class="m-title">${o.title}</h3>${o.body ? `<p class="m-body">${o.body}</p>` : ''}
        <input class="input big-input" id="pn-input" type="number" inputmode="numeric" min="0" value="${o.value != null ? o.value : ''}" autofocus>
        ${o.quick ? `<div class="chips-row" style="justify-content:center">${o.quick.map((q) => `<button class="chip-opt" data-action="pn-quick" data-v="${q[1]}">${q[0]}</button>`).join('')}</div>` : ''}
        <p class="hint" id="pn-preview" style="text-align:center;margin-top:10px">${o.preview ? o.preview(Number(o.value)) : ''}</p>
        <div class="m-actions"><button class="btn" data-action="m-resolve" data-v="0">취소</button>
        <button class="btn btn-gold" data-action="m-resolve" data-v="1">${o.ok || '확인'}</button></div>`);
      UI.resolve = res;
      UI.resolveValue = () => {
        const inp = $('#pn-input');
        const v = Math.round(Number(inp.value));
        if (inp.value === '' || !Number.isFinite(v) || v < (o.min != null ? o.min : 0)) { toast('올바른 숫자를 입력하세요', 'warn'); return undefined; }
        return v;
      };
    });
  }
  function promptText(o) {
    return new Promise((res) => {
      openModal(`<h3 class="m-title">${o.title}</h3>
        <input class="input" id="pt-input" maxlength="10" value="${esc(o.value || '')}" autofocus style="margin-top:10px">
        <div class="m-actions"><button class="btn" data-action="m-resolve" data-v="0">취소</button>
        <button class="btn btn-gold" data-action="m-resolve" data-v="1">확인</button></div>`);
      UI.resolve = res;
      UI.resolveValue = () => {
        const v = $('#pt-input').value.trim();
        if (!v) { toast('이름을 입력하세요', 'warn'); return undefined; }
        return v;
      };
    });
  }

  // ---------------------------------------------------------------- 렌더링
  let resizeObs = null;
  function render() {
    const app = $('#app');
    const prevMain = $('.main', app);
    const scrollTop = prevMain ? prevMain.scrollTop : 0;
    const key = S.started ? S.screen : 'setup';
    if (!S.started) {
      app.innerHTML = `<div class="shell"><main class="main">${renderSetup()}</main></div>`;
    } else if (UI.focus) {
      app.innerHTML = renderFocus();
    } else {
      app.innerHTML = `<div class="shell">${renderNav()}<main class="main ${key === 'table' ? 'fixed' : ''}">${SCREENS[key]()}</main></div>`;
    }
    const main = $('.main', app);
    if (main && app.dataset.screen === key) main.scrollTop = scrollTop;
    app.dataset.screen = key;
    if (key === 'table') {
      layoutTable();
      const area = $('.table-area');
      if (window.ResizeObserver && area) {
        if (!resizeObs) resizeObs = new ResizeObserver(() => layoutTable());
        resizeObs.disconnect();
        resizeObs.observe(area);
      }
    }
    $$('.act-log').forEach((el) => { el.scrollLeft = el.scrollWidth; });
    updateClock();
  }
  function renderPanelOnly() {
    const panel = $('.panel');
    if (!panel) return render();
    panel.className = 'panel' + (UI.raiseOpen ? ' raise-open' : '');
    panel.innerHTML = renderPanel();
    $$('.act-log').forEach((el) => { el.scrollLeft = el.scrollWidth; });
    layoutTable();
  }

  function renderNav() {
    const items = [['clock', isT() ? '타이머' : '현황', 'clock'], ['table', '테이블', 'table'], ['players', '플레이어', 'users'], ['settings', '설정', 'settings']];
    return `<nav class="nav"><div class="nav-brand">♠</div>${items.map(([k, label, ic]) => `
      <button class="nav-item ${S.screen === k ? 'on' : ''}" data-action="nav" data-screen="${k}">
        <span class="ico-wrap">${icon(ic)}</span>${label}
        ${k === 'table' && S.hand && S.screen !== 'table' ? '<span class="nav-dot"></span>' : ''}
      </button>`).join('')}</nav>`;
  }

  // ----- 공통 폼 조각
  const numField = (label, path, value, attrs) => `<div class="field"><label>${label}</label>
    <input class="input" type="number" inputmode="numeric" min="0" data-bind="${path}" data-num value="${value}" ${attrs || ''}></div>`;
  const toggleRow = (path, title, sub, checked, rerender) => `<label class="toggle-row">
    <div class="t-text"><div class="t-title">${title}</div>${sub ? `<div class="t-sub">${sub}</div>` : ''}</div>
    <span class="switch"><input type="checkbox" data-bind="${path}" ${rerender ? 'data-rerender' : ''} ${checked ? 'checked' : ''}><i></i></span></label>`;

  function renderBuyIn() {
    const g = S.game, t = isT();
    const lockCash = !t && S.started;
    return `<h2 class="sec-title">${t ? '바이인 · 리바이 · 애드온' : '바이인 · 칩 가치'}</h2>
      <div class="grid-2">
        ${numField(`바이인 ${W('금액', '포인트')} (${unit()})`, 'game.buyIn.won', g.buyIn.won, lockCash ? 'disabled' : '')}
        ${numField(t ? '시작 칩' : '바이인 금액당 칩', 'game.buyIn.chips', g.buyIn.chips, lockCash ? 'disabled' : '')}
      </div>
      <p class="hint" style="margin-top:8px" data-derived="ratio">${ratioText()}</p>
      ${lockCash ? '<p class="hint" style="margin-top:4px">게임 중에는 칩 가치를 바꿀 수 없어요 (계산이 틀어지지 않도록).</p>' : ''}
      ${t ? `<div class="divider"></div>
        ${toggleRow('game.rebuy.on', '리바이 허용', '칩을 모두 잃으면 다시 구매할 수 있어요', g.rebuy.on, true)}
        ${g.rebuy.on ? `<div class="sub-fields grid-3">
          ${numField(`리바이 ${W('금액', '포인트')} (${unit()})`, 'game.rebuy.won', g.rebuy.won)}
          ${numField('리바이 칩', 'game.rebuy.chips', g.rebuy.chips)}
          ${numField('가능 레벨 (0=계속)', 'game.rebuy.until', g.rebuy.until)}</div>` : ''}
        ${toggleRow('game.addon.on', '애드온 허용', '정해진 금액으로 칩을 추가 구매해요', g.addon.on, true)}
        ${g.addon.on ? `<div class="sub-fields grid-2">
          ${numField(`애드온 ${W('금액', '포인트')} (${unit()})`, 'game.addon.won', g.addon.won)}
          ${numField('애드온 칩', 'game.addon.chips', g.addon.chips)}</div>` : ''}`
        : '<p class="hint" style="margin-top:6px">캐시 게임은 추가 바이인을 언제든 할 수 있고, 금액도 사람마다 다르게 정할 수 있어요.</p>'}`;
  }

  function structSummary() {
    const L = levels();
    const first = L.find((l) => !l.brk) || { sb: 0, bb: 0 };
    return `<div class="struct-summary">
      <span>레벨 <b>${L.filter((l) => !l.brk).length}</b>개</span>
      <span>휴식 <b>${L.filter((l) => l.brk).length}</b>회</span>
      <span>전체 <b>${fmtDur(sum(L, (l) => l.min))}</b></span>
      <span>시작 <b>${fmt(first.sb)} / ${fmt(first.bb)}</b></span>
      ${S.game.preset === 'custom' ? '<span class="tag gold">직접 편집함</span>' : ''}</div>`;
  }
  function renderStructure(inSettings) {
    const g = S.game;
    const presets = Object.keys(PRESETS).map((k) => `<button class="preset ${g.preset === k ? 'on' : ''}" data-action="preset" data-k="${k}"><b>${PRESETS[k].label}</b><span>${PRESETS[k].desc}</span></button>`).join('');
    const editor = renderLevelEditor();
    return `<h2 class="sec-title">블라인드 구조</h2>
      <div class="preset-grid">${presets}</div>
      <div class="field" style="margin-top:14px"><span class="field-label">시작 블라인드</span>
        <div class="chips-row" style="margin-top:2px">${[[100, '50 / 100'], [200, '100 / 200'], [400, '200 / 400'], [600, '300 / 600'], [0, '자동 (100BB)']].map(([v, t]) => `<button class="chip-opt ${(g.startBB || 0) === v ? 'on' : ''}" data-action="start-bb" data-v="${v}">${t}</button>`).join('')}</div>
        <p class="hint" style="margin-top:6px">시작 칩 ${fmt(g.buyIn.chips)} = 시작 블라인드의 <b>${Math.round(g.buyIn.chips / ((levels().find((l) => !l.brk) || { bb: 1 }).bb))}BB</b> · 가볍게 할 땐 100 / 200 시작이 무난해요</p></div>
      <p class="hint" style="margin-top:8px">홀덤펍·대회에서 많이 쓰는 블라인드 진행이에요 (1시간마다 10분 휴식).</p>
      ${structSummary()}
      ${inSettings ? editor : `<details class="struct-details" ${UI.structOpen ? 'open' : ''}><summary>레벨 자세히 보기 · 편집 ›</summary>${editor}</details>`}`;
  }
  function renderLevelEditor() {
    let no = 0;
    const rows = levels().map((l, i) => {
      const cur = S.started && i === S.clock.level ? 'cur' : '';
      const del = `<button class="lv-del" data-action="lv-del" data-i="${i}" aria-label="삭제">${icon('x')}</button>`;
      const num = (k) => `<input class="input" type="number" inputmode="numeric" min="1" data-lv="${i}" data-k="${k}" value="${l[k]}">`;
      if (l.brk) return `<div class="lv-row brk ${cur}"><span class="lv-no lv-drag" data-i="${i}" aria-label="끌어서 휴식 위치 옮기기">${icon('grip')}</span><span class="brk-label">${icon('coffee')} 휴식</span>${num('min')}${del}</div>`;
      no++;
      return `<div class="lv-row ${cur}"><span class="lv-no">${no}</span>${num('sb')}${num('bb')}${num('min')}${del}</div>`;
    }).join('');
    return `<div class="lv-table"><div class="lv-head"><span style="text-align:center">레벨</span><span>SB</span><span>BB</span><span>분</span><span></span></div>${rows}</div>
      <div class="lv-tools">
        <button class="btn btn-sm" data-action="lv-add">${icon('plus')} 레벨 추가</button>
        <button class="btn btn-sm" data-action="lv-add-break">${icon('coffee')} 휴식 추가</button>
        <button class="btn btn-sm btn-ghost" data-action="lv-bulk">레벨 시간 일괄 변경</button>
      </div>
      <p class="hint" style="margin-top:10px">휴식 줄 왼쪽의 <b>⠿</b> 를 위아래로 끌면 휴식 위치를 옮길 수 있어요.</p>`;
  }
  function renderCashBlinds() {
    const c = S.game.cash;
    const opts = [[100, 200], [200, 400], [500, 1000], [1000, 2000]];
    return `<h2 class="sec-title">블라인드</h2>
      <div class="grid-2">${numField('스몰 블라인드 (SB)', 'game.cash.sb', c.sb)}${numField('빅 블라인드 (BB)', 'game.cash.bb', c.bb)}</div>
      <div class="chips-row">${opts.map(([s, b]) => `<button class="chip-opt ${c.sb === s && c.bb === b ? 'on' : ''}" data-action="cash-blinds" data-sb="${s}" data-bb="${b}">${fmt(s)} / ${fmt(b)}</button>`).join('')}</div>
      ${S.started ? '<p class="hint" style="margin-top:10px">바꾼 블라인드는 다음 핸드부터 적용돼요.</p>' : ''}`;
  }

  // ----- 새 게임 설정
  function draftChips() {
    if (!S.draft.length) return '<div class="empty-note">2명 이상 추가하세요 (최대 10명)</div>';
    return S.draft.map((d, i) => `<span class="draft-chip"><span class="avatar" style="--c:${COLORS[i % COLORS.length]}">${esc(initial(d))}</span>${esc(d)}
      <button data-action="draft-del" data-i="${i}" aria-label="${esc(d)} 삭제">${icon('x')}</button></span>`).join('');
  }
  function renderSetup() {
    const g = S.game;
    const modeCard = (mode, ic, title, sub) => `<button class="mode-card ${g.mode === mode ? 'on' : ''}" data-action="set-mode" data-mode="${mode}">${icon(ic)}<b>${title}</b><span>${sub}</span></button>`;
    return `<div class="setup">
      <header class="setup-hero"><div class="logo-mark">♠</div><h1>홀덤 매니저</h1><p>블라인드 타이머 · 핸드 진행 · 사이드팟 자동 계산</p></header>
      <section class="card">
        <h2 class="sec-title">게임 방식</h2>
        <div class="mode-pick">
          ${modeCard('tournament', 'trophy', '토너먼트', '시간마다 블라인드가 올라가요')}
          ${modeCard('cash', 'chip', '캐시 게임', '고정 블라인드 · 자유 바이인')}
        </div>
        <div class="field"><label>게임 이름 (선택)</label><input class="input" data-bind="game.name" value="${esc(g.name)}" placeholder="예: 금요일 홈게임" maxlength="20"></div>
      </section>
      <section class="card" id="sec-buyin">${renderBuyIn()}</section>
      <section class="card" id="sec-blinds">${isT() ? renderStructure(false) : renderCashBlinds()}</section>
      <section class="card">
        <h2 class="sec-title">플레이어 <span class="count" data-derived="draft-count">${S.draft.length} / ${MAX_SEATS}</span></h2>
        <form class="add-row" data-form="draft-add" autocomplete="off">
          <input class="input" name="pname" placeholder="이름 입력 후 추가" maxlength="10" enterkeyhint="done">
          <button class="btn btn-gold" type="submit">${icon('plus')} 추가</button>
        </form>
        <div class="draft-list" id="draft-list">${draftChips()}</div>
        <div style="margin-top:8px">${toggleRow('seatRandom', '자리 랜덤 배정', '끄면 추가한 순서대로 1번 자리부터 앉아요', S.seatRandom)}</div>
        ${isT() ? '<p class="hint" style="margin-top:6px">블라인드 타이머만 쓸 거면 플레이어 없이 아래 <b>타이머만 쓰기</b>를 누르세요. 플레이어는 나중에 추가해도 돼요.</p>' : ''}
      </section>
      <div class="setup-footer"><div class="footer-row">
        ${isT() ? `<button class="btn btn-lg footer-sub" data-action="start-timer">${icon('clock')} 타이머만 쓰기</button>` : ''}
        <button class="btn btn-gold btn-lg" data-action="start-game">${icon('play')} 게임 시작</button></div></div>
    </div>`;
  }

  // ----- 타이머 / 현황 화면
  function tournamentStats() {
    if (!S.players.length) {
      const L = levels(), cur = S.clock.level;
      const total = L.filter((l) => !l.brk).length, brksLeft = L.slice(cur + 1).filter((l) => l.brk).length;
      return `
      <div class="stat"><div class="k">레벨 진행</div><div class="v">${levelNo(cur)}<small>/ ${total}</small></div><div class="s">레벨당 ${(L.find((l) => !l.brk) || { min: 0 }).min}분</div></div>
      <div class="stat"><div class="k">남은 휴식</div><div class="v">${brksLeft}<small>회</small></div><div class="s" data-clock="nextbreak"></div></div>
      <div class="stat wide"><div class="k">경과 시간</div><div class="v" data-clock="elapsed">-</div></div>
      <button class="stat wide stat-cta" data-action="nav" data-screen="players"><div class="k">${icon('users')} 플레이어 추가</div><div class="s">추가하면 칩 · 리바이 · 핸드 진행 · 사이드팟 계산도 쓸 수 있어요</div></button>`;
    }
    const alive = activePlayers();
    const chips = sum(alive, (p) => p.stack);
    const avg = alive.length ? chips / alive.length : 0;
    const bb = blindsAt(S.clock.level).bb || 1;
    const r = S.game.rebuy;
    const rebuyTxt = !r.on ? '리바이 없음' : rebuyOpen() ? (r.until ? `리바이 Lv ${r.until}까지` : '리바이 계속 가능') : '리바이 마감';
    return `
      <div class="stat"><div class="k">남은 인원</div><div class="v">${alive.length}<small>/ ${S.players.length}</small></div><div class="s">핸드 #${S.handNo}</div></div>
      <div class="stat"><div class="k">평균 스택</div><div class="v">${fmt(avg)}</div><div class="s">${(avg / bb).toFixed(1)} BB</div></div>
      <div class="stat"><div class="k">${W('총 상금', '총 바이인')}</div><div class="v">${won(sum(S.players, (p) => p.invested))}</div><div class="s">총 칩 ${fmt(chips)}</div></div>
      <div class="stat"><div class="k">리바이 · 애드온</div><div class="v">${sum(S.players, (p) => p.rebuys)} · ${sum(S.players, (p) => p.addons)}</div><div class="s">${rebuyTxt}</div></div>
      <div class="stat wide"><div class="k">경과 시간</div><div class="v" data-clock="elapsed">-</div></div>`;
  }
  function levelList() {
    let no = 0;
    const cur = S.clock.level;
    return levels().map((l, i) => {
      if (!l.brk) no++;
      if (i < cur - 1) return '';
      const cls = i < cur ? 'past' : i === cur ? 'cur' : '';
      return `<button class="lv-item ${cls} ${l.brk ? 'brk' : ''}" data-action="clock-goto" data-i="${i}">
        <span class="n">${l.brk ? '휴식' : 'LV ' + no}</span>
        <span class="b">${l.brk ? '휴식 시간' : fmt(l.sb) + ' / ' + fmt(l.bb)}</span>
        <span class="m">${l.min}분</span></button>`;
    }).join('');
  }
  function renderClockScreen() {
    if (!isT()) return renderCashStatus();
    const c = S.clock, L = curLevel(), nx = nextBlindLevel(), brk = !!L.brk, bl = blindsAt(c.level);
    return `<div class="clock-screen">
      <section class="clock-main ${brk ? 'is-break' : ''}">
        <div class="clock-top"><span class="game-name">${esc(S.game.name || '토너먼트')}</span>
          <button class="btn btn-sm btn-ghost" data-action="focus-on">${icon('full')} 타이머만 보기</button></div>
        ${!c.running ? '<div class="paused-badge">일시정지</div>' : ''}
        ${brk ? `<div class="break-ico">${icon('coffee')}</div>` : ''}
        <div class="lvl-label">${brk ? 'BREAK TIME · 휴식 중' : 'LEVEL ' + levelNo(c.level)}</div>
        <div class="time ${c.running ? '' : 'paused'}" data-clock="time">${fmtTime(clockRemain())}</div>
        <div class="progress"><i data-clock="bar"></i></div>
        ${brk
          ? `<div class="blinds-now"><small>휴식 후 블라인드</small><b>${nx ? fmt(nx.sb) + ' / ' + fmt(nx.bb) : '-'}</b></div>`
          : `<div class="blinds-now"><small>BLINDS</small><b>${fmt(bl.sb)} / ${fmt(bl.bb)}</b></div>`}
        <div class="blinds-next">${brk ? '' : nx ? `다음 <b>${fmt(nx.sb)} / ${fmt(nx.bb)}</b> · ` : '마지막 레벨 · '}<span data-clock="nextbreak"></span></div>
        <div class="clock-ctrls">
          <button class="round-btn" data-action="clock-level" data-d="-1" aria-label="이전 레벨">${icon('prev')}</button>
          <button class="round-btn" data-action="clock-add" data-ms="-60000" aria-label="1분 빼기">−1분</button>
          <button class="play-btn ${c.running ? 'running' : ''}" data-action="clock-toggle" aria-label="${c.running ? '일시정지' : '시작'}">${icon(c.running ? 'pause' : 'play')}</button>
          <button class="round-btn" data-action="clock-add" data-ms="60000" aria-label="1분 더하기">+1분</button>
          <button class="round-btn" data-action="clock-level" data-d="1" aria-label="다음 레벨">${icon('next')}</button>
        </div>
      </section>
      <aside class="clock-side">
        <div class="stat-grid">${tournamentStats()}</div>
        <div class="card"><div class="card-title">블라인드 구조 <button class="btn btn-sm btn-ghost" data-action="nav" data-screen="settings">편집</button></div>
          <div class="lv-list">${levelList()}</div></div>
      </aside>
    </div>`;
  }
  function renderCashStatus() {
    const c = S.game.cash, alive = activePlayers();
    const rows = S.players.slice().sort((a, b) => cashNet(b) - cashNet(a)).map((p) => {
      const n = cashNet(p);
      return `<div class="result-row"><span class="avatar sm" style="--c:${p.color}">${esc(initial(p.name))}</span>
        <span class="rn">${esc(p.name)}<small>${p.status === 'out' ? '퇴장' : fmt(p.stack) + '칩'} · 바이인 ${won(p.invested)}</small></span>
        <span class="rv ${n > 0 ? 'plus' : n < 0 ? 'minus' : ''}">${signed(n)}${unit()}</span></div>`;
    }).join('');
    return `<div class="clock-screen">
      <section class="clock-main">
        <div class="clock-top"><span class="game-name">${esc(S.game.name || '캐시 게임')}</span>
          <button class="btn btn-sm btn-ghost" data-action="focus-on">${icon('full')} 타이머만 보기</button></div>
        <div class="lvl-label">CASH GAME</div>
        <div class="blinds-now"><small>BLINDS</small><b style="font-size:clamp(56px, min(15vw, 17vh), 150px)">${fmt(c.sb)} / ${fmt(c.bb)}</b></div>
        <div class="blinds-next" style="margin-top:12px">경과 시간</div>
        <div class="time" style="font-size:clamp(48px, min(12vw, 13vh), 120px)" data-clock="elapsed"></div>
        <div class="clock-ctrls"><button class="btn btn-gold btn-lg" data-action="nav" data-screen="table">${icon('table')} 테이블로 가기</button></div>
      </section>
      <aside class="clock-side">
        <div class="stat-grid">
          <div class="stat"><div class="k">플레이 중</div><div class="v">${seated().filter((p) => p.status === 'in').length}<small>명</small></div><div class="s">자리 비움 ${seated().filter((p) => p.status === 'away').length}명</div></div>
          <div class="stat"><div class="k">핸드</div><div class="v">${S.handNo}</div><div class="s">진행한 핸드 수</div></div>
          <div class="stat"><div class="k">총 바이인</div><div class="v">${won(sum(S.players, (p) => p.invested))}</div><div class="s">추가 바이인 ${sum(S.players, (p) => p.rebuys)}회</div></div>
          <div class="stat"><div class="k">테이블 칩</div><div class="v">${fmt(sum(alive, (p) => p.stack))}</div><div class="s">${ratioText().replace(/<[^>]+>/g, '')}</div></div>
        </div>
        <div class="card"><div class="card-title">${W('현재 손익', '현재 득실')}</div><div class="result-list" style="margin-top:0">${rows || '<div class="empty-note">플레이어가 없어요</div>'}</div></div>
      </aside>
    </div>`;
  }

  // ----- 테이블 화면
  const ACT_LABEL = { fold: '폴드', check: '체크', call: '콜', bet: '벳', raise: '레이즈', sb: 'SB', bb: 'BB', return: '반환' };
  function lastAction(h, id) {
    for (let i = h.log.length - 1; i >= 0; i--) {
      const e = h.log[i];
      if (e.street !== h.street) break;
      if (e.id === id && e.type !== 'return' && e.type !== 'sb' && e.type !== 'bb') return e;
    }
    return null;
  }
  function renderTopbar() {
    const no = S.hand ? S.hand.no : S.handNo + 1;
    let clock;
    if (isT()) {
      const L = curLevel(), bl = blindsAt(S.clock.level), run = S.clock.running;
      clock = `<button class="mini-clock ${run ? '' : 'paused'} ${L.brk ? 'brk' : ''}" data-action="clock-toggle" aria-label="타이머 ${run ? '일시정지' : '시작'}">
        <span class="mc-lv">${L.brk ? '휴식' : 'LV ' + levelNo(S.clock.level)}</span>
        <span class="mc-bl">${fmt(bl.sb)}/${fmt(bl.bb)}</span>
        <span class="mc-time" data-clock="time">${fmtTime(clockRemain())}</span>
        <span class="mc-ico">${icon(run ? 'pause' : 'play')}</span></button>`;
    } else {
      clock = `<div class="mini-clock" style="padding-right:14px"><span class="mc-lv">CASH</span>
        <span class="mc-bl">${fmt(S.game.cash.sb)}/${fmt(S.game.cash.bb)}</span><span class="mc-time" data-clock="elapsed"></span></div>`;
    }
    return `<div class="topbar">${clock}<span class="hand-no">핸드 #${no}</span>
      <button class="btn btn-icon sm btn-ghost" data-action="fullscreen" aria-label="전체 화면">${icon('full')}</button></div>`;
  }
  function renderCenter() {
    const h = S.hand;
    if (!h && isT() && curLevel().brk) {
      const nx = nextBlindLevel();
      return `<div class="table-center center-break"><div class="break-ico">${icon('coffee')}</div>
        <div class="pot-label">BREAK TIME</div><div class="center-blinds" data-clock="time">${fmtTime(clockRemain())}</div>
        <div class="pot-sub">${nx ? `휴식 후 ${fmt(nx.sb)} / ${fmt(nx.bb)}` : '휴식 중'}</div></div>`;
    }
    if (!h) {
      const bl = currentBlinds();
      return `<div class="table-center"><div class="center-logo">♠</div>
        <div class="pot-label">BLINDS</div><div class="center-blinds">${fmt(bl.sb)} / ${fmt(bl.bb)}</div></div>`;
    }
    const seats = Object.values(h.seats);
    const total = sum(seats, (s) => s.total);
    const streetBets = h.phase === 'betting' ? sum(seats, (s) => s.street) : 0;
    const dealt = [0, 3, 4, 5][h.street];
    const pots = h.phase === 'betting' ? E.computePots(h, true).pots : h.pots || [];
    const cards = [0, 1, 2, 3, 4].map((i) => `<span class="card-slot ${i < dealt ? 'dealt' : ''}" style="${i < UI.shownDealt ? 'animation:none' : ''}"></span>`).join('');
    UI.shownDealt = dealt;
    const pill = h.phase === 'showdown' ? '<span class="street-pill sd">쇼다운</span>' : h.phase === 'done' ? '<span class="street-pill">핸드 종료</span>' : `<span class="street-pill">${E.STREETS[h.street]}</span>`;
    return `<div class="table-center">${pill}
      <div class="board">${cards}</div>
      <div class="pot-label">POT</div>
      <div class="pot-amount">${fmt(total)}</div>
      ${streetBets && total > streetBets ? `<div class="pot-sub">가운데 ${fmt(total - streetBets)} · 이번 베팅 ${fmt(streetBets)}</div>` : ''}
      ${pots.length > 1 ? `<div class="side-pots">${pots.map((p, i) => `<span class="side-pot">${i ? '사이드' + i : '메인'} <b>${fmt(p.amount)}</b></span>`).join('')}</div>` : ''}
    </div>`;
  }
  function renderSeats() {
    const h = S.hand;
    const pre = h ? null : previewPositions();
    const sdPot = h && h.phase === 'showdown' ? h.pots[UI.activePot] : null;
    let bets = '';
    const html = seated().map((p) => {
      const hs = h ? h.seats[p.id] : null;
      const cls = ['seat'];
      let stackTxt = fmt(hs ? hs.stack : p.stack), stackCls = '', label = '', labelCls = '';
      const isD = h ? h.dealerId === p.id : pre.d === p.id;
      const pos = h ? (h.sbId === p.id ? 'SB' : h.bbId === p.id ? 'BB' : '') : (pre.sb === p.id ? 'SB' : pre.bb === p.id ? 'BB' : '');
      if (!hs) {
        if (h || p.status !== 'in' || p.stack <= 0) {
          cls.push('idle');
          labelCls = 'idle';
          label = p.status === 'away' ? '자리 비움' : p.stack <= 0 ? '칩 없음' : '대기';
        } else cls.push('btn-target');
      } else {
        if (hs.folded) { cls.push('folded'); label = '폴드'; labelCls = 'fold'; }
        else if (hs.allIn && hs.stack === 0) { stackTxt = 'ALL-IN'; stackCls = 'allin'; }
        if (h.phase === 'betting') {
          if (h.actorId === p.id) cls.push('acting');
          if (!hs.folded) {
            const e = lastAction(h, p.id);
            if (e) { label = e.allIn ? '올인' : ACT_LABEL[e.type]; labelCls = e.allIn ? 'allin' : e.type; }
          }
          if (hs.street > 0) bets += `<div class="bet" data-bet="${p.id}"><span class="chip-ico"></span>${fmt(hs.street)}</div>`;
        }
        if (sdPot && sdPot.eligible.indexOf(p.id) >= 0) {
          cls.push('pickable');
          if (h.sel[UI.activePot].indexOf(p.id) >= 0) cls.push('picked');
        }
        if (h.phase === 'done') {
          const d = h.final[p.id] - hs.start;
          stackTxt = fmt(h.final[p.id]);
          stackCls = '';
          if (d > 0) { cls.push('winner'); label = '+' + fmt(d); labelCls = 'win'; }
          else if (d < 0 && !hs.folded) { label = '−' + fmt(-d); labelCls = 'lose'; }
        }
      }
      return `<div class="${cls.join(' ')}" data-action="seat-tap" data-id="${p.id}" style="--c:${p.color}">
        <div class="seat-card"><span class="avatar">${esc(initial(p.name))}</span>
          <div class="name">${esc(p.name)}</div><div class="stack ${stackCls}">${stackTxt}</div>
          ${label ? `<span class="act-label ${labelCls}">${label}</span>` : ''}</div>
        ${isD ? '<span class="dbtn">D</span>' : ''}${pos ? `<span class="pos-tag ${pos.toLowerCase()}">${pos}</span>` : ''}
      </div>`;
    }).join('');
    return html + bets;
  }
  function renderTableScreen() {
    return `<div class="table-screen">${renderTopbar()}
      <div class="table-area"><div class="felt"></div>${renderCenter()}${renderSeats()}</div>
      <div class="panel ${UI.raiseOpen ? 'raise-open' : ''}">${renderPanel()}</div></div>`;
  }

  // 경기장(스타디움) 모양 둘레를 따라 좌석을 같은 간격으로 배치 — 아래 가운데부터 시계방향
  function stadiumPoints(cx, cy, w, h, n) {
    const horiz = w >= h, r = (horiz ? h : w) / 2, L = Math.abs(w - h), PI = Math.PI;
    const P = 2 * L + 2 * PI * r;
    const at = (s) => {
      if (horiz) {
        if (s < L / 2) return [cx - s, cy + r];
        s -= L / 2;
        if (s < PI * r) { const a = PI / 2 + s / r; return [cx - L / 2 + r * Math.cos(a), cy + r * Math.sin(a)]; }
        s -= PI * r;
        if (s < L) return [cx - L / 2 + s, cy - r];
        s -= L;
        if (s < PI * r) { const a = -PI / 2 + s / r; return [cx + L / 2 + r * Math.cos(a), cy + r * Math.sin(a)]; }
        s -= PI * r;
        return [cx + L / 2 - s, cy + r];
      }
      const q = (PI * r) / 2;
      if (s < q) { const a = PI / 2 + s / r; return [cx + r * Math.cos(a), cy + L / 2 + r * Math.sin(a)]; }
      s -= q;
      if (s < L) return [cx - r, cy + L / 2 - s];
      s -= L;
      if (s < PI * r) { const a = PI + s / r; return [cx + r * Math.cos(a), cy - L / 2 + r * Math.sin(a)]; }
      s -= PI * r;
      if (s < L) return [cx + r, cy - L / 2 + s];
      s -= L;
      const a = s / r;
      return [cx + r * Math.cos(a), cy + L / 2 + r * Math.sin(a)];
    };
    const pts = [];
    for (let i = 0; i < n; i++) pts.push(at((i / n) * P));
    return pts;
  }
  function layoutTable() {
    const area = $('.table-area');
    if (!area) return;
    const W = area.clientWidth, H = area.clientHeight;
    if (!W || !H) return;
    const seats = $$('.seat', area);
    const sw = seats[0] ? seats[0].offsetWidth : 96, sh = seats[0] ? seats[0].offsetHeight : 70;
    const padX = sw / 2 + 14, padY = sh / 2 + 22;
    const pw = Math.max(80, W - padX * 2), ph = Math.max(80, H - padY * 2);
    const cx = W / 2, cy = H / 2;
    const felt = $('.felt', area);
    felt.style.cssText = `left:${cx - pw / 2}px;top:${cy - ph / 2}px;width:${pw}px;height:${ph}px`;
    const pts = stadiumPoints(cx, cy, pw, ph, seats.length);
    const pos = {};
    seats.forEach((el, i) => {
      el.style.left = pts[i][0] + 'px';
      el.style.top = pts[i][1] + 'px';
      el.classList.add('placed');
      pos[el.dataset.id] = pts[i];
    });
    // 베팅 칩: 좌석에서 테이블 중심선 쪽으로, 좌석 카드와 겹치지 않을 만큼 띄운다
    const horiz = pw >= ph, half = Math.abs(pw - ph) / 2;
    $$('.bet', area).forEach((el) => {
      const p = pos[el.dataset.bet];
      if (!p) return;
      const tx = horiz ? clamp(p[0], cx - half, cx + half) : cx;
      const ty = horiz ? cy : clamp(p[1], cy - half, cy + half);
      const dist = Math.hypot(tx - p[0], ty - p[1]) || 1;
      const ux = (tx - p[0]) / dist, uy = (ty - p[1]) / dist;
      const reach = Math.abs(ux) * (sw + el.offsetWidth) / 2 + Math.abs(uy) * (sh + el.offsetHeight) / 2 + (uy < 0 ? 18 : 0) + 8;
      const d = Math.min(dist * 0.85, reach);
      el.style.left = p[0] + ux * d + 'px';
      el.style.top = p[1] + uy * d + 'px';
      el.classList.add('placed');
    });
    const center = $('.table-center', area);
    if (center) center.style.width = Math.max(130, horiz ? pw - sw * 1.7 : pw - sw * 1.75) + 'px';
  }

  // ----- 액션 패널
  function renderPanel() {
    const h = S.hand;
    if (!h) return renderPrePanel();
    if (h.phase === 'betting') return renderActPanel();
    if (h.phase === 'showdown') return renderShowdownPanel();
    return renderDonePanel();
  }
  function renderPrePanel() {
    const el = eligible();
    if (el.length < 2) {
      return `<div class="pre"><div class="pre-info"><div class="pre-title">핸드를 시작할 수 없어요</div>
        <div class="hint" style="margin-top:4px">칩이 있는 플레이어가 2명 이상 앉아 있어야 해요.</div></div>
        <div class="pre-actions"><button class="btn btn-gold btn-lg" data-action="nav" data-screen="players">${icon('users')} 플레이어 관리</button></div></div>`;
    }
    const pos = previewPositions(), bl = currentBlinds();
    const nm = (id) => esc(player(id).name);
    return `<div class="pre">
      <div class="pre-info">
        <div class="pre-title">핸드 #${S.handNo + 1} 준비 · ${el.length}명</div>
        <div class="pre-pos">
          <span><i class="pos-chip d">D</i><b>${nm(pos.d)}</b></span>
          <span><i class="pos-chip sb">SB</i><b>${nm(pos.sb)}</b> ${fmt(bl.sb)}</span>
          <span><i class="pos-chip bb">BB</i><b>${nm(pos.bb)}</b> ${fmt(bl.bb)}</span>
        </div>
        <div class="hint" style="margin-top:6px">좌석을 누르면 딜러 버튼을 옮길 수 있어요</div>
        ${isT() && !S.clock.running ? '<div class="warn-line">● 블라인드 타이머가 멈춰 있어요 — 위 시계를 눌러 시작하세요</div>' : ''}
        ${isT() && curLevel().brk ? '<div class="warn-line">● 지금은 휴식 시간이에요</div>' : ''}
      </div>
      <div class="pre-actions">
        <button class="btn btn-lg btn-ghost" data-action="random-button">${icon('shuffle')} 버튼 랜덤</button>
        <button class="btn btn-gold btn-lg" data-action="hand-start">${icon('play')} 핸드 시작</button>
      </div></div>`;
  }
  function renderLog(h) {
    let out = '', st = -1;
    h.log.forEach((e) => {
      if (e.type === 'return') return;
      if (e.street !== st) { st = e.street; out += `<span class="log-street">${E.STREETS[st]}</span>`; }
      const p = player(e.id);
      const lab = e.allIn && e.type !== 'sb' && e.type !== 'bb' ? '올인' : ACT_LABEL[e.type];
      const amt = e.amount != null && e.type !== 'fold' && e.type !== 'check' ? ' ' + fmt(e.amount) : '';
      out += `<span class="log-item"><b>${esc(p ? p.name : '?')}</b> ${lab}${amt}</span>`;
    });
    return out;
  }
  function snapRaise(L, v, unit) {
    if (!Number.isFinite(v)) v = L.minTo;
    if (v >= L.maxTo) return L.maxTo;
    v = Math.round(v / unit) * unit;
    return clamp(v, L.minTo, L.maxTo);
  }
  function renderRaiseBox(h, L) {
    const pre = h.street === 0 && h.currentBet === h.bb;
    const quick = pre ? [['2.5BB', 'x2.5'], ['3BB', 'x3'], ['4BB', 'x4']] : [['½팟', 'p0.5'], ['¾팟', 'p0.75'], ['팟', 'p1']];
    return `<div class="raise-top">
        <button class="step-btn" data-action="raise-step" data-d="-1" aria-label="줄이기">${icon('minus')}</button>
        <div class="raise-amt"><small>${L.isBet ? '벳' : '레이즈'} 금액 (총액)</small>
          <input class="raise-input" type="text" inputmode="numeric" data-raise-input value="${fmt(UI.raiseTo)}"></div>
        <button class="step-btn" data-action="raise-step" data-d="1" aria-label="늘리기">${icon('plus')}</button>
        <button class="step-btn raise-close" data-action="raise-close" aria-label="닫기">${icon('x')}</button>
      </div>
      <input class="slider" type="range" min="${L.minTo}" max="${L.maxTo}" step="${h.unit}" value="${UI.raiseTo}" data-raise-slider aria-label="금액 조절">
      <div class="raise-quick"><button data-action="raise-set" data-v="min">최소</button>${quick.map(([t, v]) => `<button data-action="raise-set" data-v="${v}">${t}</button>`).join('')}<button data-action="raise-set" data-v="max">올인</button></div>`;
  }
  function renderActPanel() {
    const h = S.hand, L = E.legal(h), p = player(L.id);
    const key = h.no + ':' + h.log.length;
    if (UI.raiseKey !== key) { UI.raiseKey = key; UI.raiseTo = L.minTo; if (!wide()) UI.raiseOpen = false; }
    const verb = L.isBet ? '벳' : '레이즈';
    const btns = [`<button class="act-btn act-fold" data-action="act" data-type="fold">폴드</button>`];
    btns.push(L.canCheck
      ? '<button class="act-btn act-check" data-action="act" data-type="check">체크</button>'
      : `<button class="act-btn act-call" data-action="act" data-type="call">${L.callIsAllIn ? '콜 · 올인' : '콜'}<small>${fmt(L.callAmt)}</small></button>`);
    if (L.canRaise) {
      btns.push(`<button class="act-btn act-raise" data-action="raise-main">${UI.raiseOpen || wide() ? verb : verb + ' ›'}<small data-raise-label>${fmt(UI.raiseTo)}</small></button>`);
      btns.push(`<button class="act-btn act-allin" data-action="act" data-type="allin">올인<small>${fmt(L.maxTo)}</small></button>`);
    }
    const gridCls = btns.length === 4 ? '' : btns.length === 3 ? 'three' : 'two';
    const na = L.callIsAllIn ? '스택이 부족해서 콜하면 올인이에요' : '이번 차례에는 레이즈할 수 없어요<br><span class="hint">앞선 올인이 최소 레이즈에 못 미쳐 콜 또는 폴드만 가능해요</span>';
    return `<div class="panel-act">
      <div class="act-side">
        <div class="actor"><span class="avatar" style="--c:${p.color}">${esc(initial(p.name))}</span>
          <div class="actor-body"><div class="actor-name"><b>${esc(p.name)}</b><span class="turn-tag">차례</span></div>
          <div class="actor-pills"><span>스택 <b>${fmt(L.stack)}</b></span><span class="${L.toCall ? 'need' : 'free'}">${L.toCall ? `콜 <b>${fmt(L.callAmt)}</b>` : '체크 가능'}</span><span>팟 <b>${fmt(L.pot)}</b></span></div></div></div>
        <div class="act-log">${renderLog(h)}</div>
      </div>
      <div class="raise-box">${L.canRaise ? renderRaiseBox(h, L) : `<div class="raise-na">${na}</div>`}</div>
      <div class="act-main">
        <div class="act-grid ${gridCls}">${btns.join('')}</div>
        <div class="act-tools">
          <button class="btn btn-sm" data-action="undo" ${S.undo.length ? '' : 'disabled'}>${icon('undo')} 되돌리기</button>
          <button class="btn btn-sm btn-ghost" data-action="hand-cancel">핸드 취소</button>
        </div>
      </div></div>`;
  }
  function renderShowdownPanel() {
    const h = S.hand;
    const ready = h.sel.every((s) => s.length > 0);
    const nm = (id) => esc(player(id).name);
    const cards = h.pots.map((pot, i) => {
      const single = pot.eligible.length === 1, sel = h.sel[i];
      const note = single ? '혼자 남은 팟 — 자동 지급' : sel.length > 1 ? `스플릿 ${sel.length}명 · 1인당 약 ${fmt(pot.amount / sel.length)}` : sel.length ? '승자 선택됨' : '승자를 누르세요 (동점이면 여러 명)';
      return `<div class="pot-card ${UI.activePot === i ? 'active' : ''} ${sel.length ? 'resolved' : ''}" data-action="pot-focus" data-i="${i}">
        <div class="pot-card-head"><span>${i === 0 ? '메인팟' : '사이드팟 ' + i} · ${pot.eligible.length}명</span><b>${fmt(pot.amount)}</b></div>
        <div class="pot-elig">${pot.eligible.map((id) => `<button class="pchip ${sel.indexOf(id) >= 0 ? 'on' : ''}" data-action="toggle-winner" data-i="${i}" data-id="${id}" ${single ? 'disabled' : ''}>
          <span class="avatar" style="--c:${player(id).color}">${esc(initial(player(id).name))}</span>${nm(id)}</button>`).join('')}</div>
        <div class="pot-note">${note}</div></div>`;
    }).join('');
    const refunds = Object.keys(h.refunds || {}).map((id) => `${nm(id)} ${fmt(h.refunds[id])}`).join(', ');
    return `<div class="sd-head"><b>쇼다운</b>
        <span class="hint">${h.pots.length > 1 ? `팟이 ${h.pots.length}개로 나뉘었어요 · 메인팟부터 승자를 고르면 사이드팟은 자동으로 채워져요` : '이긴 사람을 선택하세요'}</span>
        ${h.runout ? '<span class="tag gold">올인 — 리버까지 카드를 모두 깔아주세요</span>' : ''}</div>
      <div class="pot-cards">${cards}</div>
      ${refunds ? `<p class="hint" style="margin-top:8px">돌려받는 칩: ${refunds}</p>` : ''}
      <div class="sd-actions">
        <button class="btn btn-lg" data-action="undo" aria-label="되돌리기" ${S.undo.length ? '' : 'disabled'}>${icon('undo')}</button>
        <button class="btn btn-gold btn-lg" data-action="sd-confirm" ${ready ? '' : 'disabled'}>${icon('chip')} 칩 분배</button>
      </div>`;
  }
  function renderDonePanel() {
    const h = S.hand;
    const nm = (id) => esc(player(id).name);
    const pots = h.pots.map((pot, i) => `<div>${h.pots.length > 1 ? (i === 0 ? '메인팟' : '사이드팟 ' + i) : '팟'} <b>${fmt(pot.amount)}</b> → <b>${pot.winners.map(nm).join(', ')}</b>${pot.winners.length > 1 ? ' (스플릿)' : ''}</div>`).join('');
    const deltas = h.ring.map((id) => ({ id, d: h.final[id] - h.seats[id].start })).filter((x) => x.d !== 0).sort((a, b) => b.d - a.d);
    return `<div class="done-head"><b>핸드 #${h.no} 종료</b>${h.uncontested ? '<span class="tag">모두 폴드</span>' : ''}</div>
      <div class="done-pots">${pots}</div>
      <div class="done-deltas">${deltas.map((x) => `<span class="delta-chip"><span class="avatar" style="--c:${player(x.id).color}">${esc(initial(player(x.id).name))}</span>${nm(x.id)} <b class="${x.d > 0 ? 'plus' : 'minus'}">${signed(x.d)}</b></span>`).join('')}</div>
      <div class="sd-actions">
        <button class="btn btn-lg" data-action="undo" aria-label="되돌리기">${icon('undo')}</button>
        <button class="btn btn-gold btn-lg" data-action="hand-next">다음 핸드 ${icon('next')}</button>
      </div>`;
  }

  // ----- 플레이어 화면
  function pcard(p) {
    const t = isT();
    const bb = currentBlinds().bb || 1;
    const tags = [];
    if (inHand(p.id)) tags.push('<span class="tag gold">핸드 중</span>');
    if (p.status === 'away') tags.push('<span class="tag">자리 비움</span>');
    if (p.status === 'in' && p.stack <= 0) tags.push('<span class="tag red">칩 없음</span>');
    let sub, right;
    if (t) {
      sub = `바이인 ${p.buyins}${p.rebuys ? ' · 리바이 ' + p.rebuys : ''}${p.addons ? ' · 애드온 ' + p.addons : ''} · ${won(p.invested)}`;
      right = p.status === 'out'
        ? `<b>${standings().indexOf(p) + 1}위</b><small>탈락</small>`
        : `<b>${fmt(p.stack)}</b><small>${(p.stack / bb).toFixed(1)} BB</small>`;
    } else {
      const n = cashNet(p);
      sub = `바이인 ${won(p.invested)}${p.rebuys ? ` (추가 ${p.rebuys}회)` : ''}`;
      right = `<b>${p.status === 'out' ? '퇴장' : fmt(p.stack)}</b><small class="${n > 0 ? 'plus' : n < 0 ? 'minus' : ''}">${signed(n)}${unit()}</small>`;
    }
    return `<button class="pcard ${p.status === 'out' ? 'out' : ''}" data-action="player-sheet" data-id="${p.id}">
      <span class="seat-no">${p.seat || '–'}</span>
      <span class="avatar" style="--c:${p.color}">${esc(initial(p.name))}</span>
      <span class="pinfo"><span class="pname">${esc(p.name)} ${tags.join('')}</span><span class="psub">${sub}</span></span>
      <span class="pstack">${right}</span></button>`;
  }
  function renderPlayers() {
    const t = isT();
    const alive = S.players.filter((p) => p.status !== 'out').sort((a, b) => (a.seat || 99) - (b.seat || 99));
    const out = S.players.filter((p) => p.status === 'out').sort((a, b) => b.outSeq - a.outSeq);
    const chips = sum(alive, (p) => p.stack);
    const stats = t
      ? `<div class="stat"><div class="k">남은 인원</div><div class="v">${alive.length}<small>/ ${S.players.length}</small></div></div>
         <div class="stat"><div class="k">평균 스택</div><div class="v">${fmt(alive.length ? chips / alive.length : 0)}</div></div>
         <div class="stat"><div class="k">${W('총 상금', '총 바이인')}</div><div class="v">${won(sum(S.players, (p) => p.invested))}</div></div>
         <div class="stat"><div class="k">총 칩</div><div class="v">${fmt(chips)}</div></div>`
      : `<div class="stat"><div class="k">앉은 인원</div><div class="v">${alive.length}<small>/ ${MAX_SEATS}</small></div></div>
         <div class="stat"><div class="k">테이블 칩</div><div class="v">${fmt(chips)}</div></div>
         <div class="stat"><div class="k">총 바이인</div><div class="v">${won(sum(S.players, (p) => p.invested))}</div></div>
         <div class="stat"><div class="k">칩 가치</div><div class="v" style="font-size:18px">${ratioText().replace(/<[^>]+>/g, '').split(' · ')[1]}</div></div>`;
    return `<div class="page">
      <div class="page-head"><h1 class="page-title">플레이어</h1>
        <div class="row"><button class="btn btn-ghost" data-action="seat-shuffle">${icon('shuffle')} 자리 섞기</button>
        <button class="btn btn-gold" data-action="add-player">${icon('plus')} 추가</button></div></div>
      <div class="stat-row">${stats}</div>
      <div class="player-grid">${alive.map(pcard).join('') || '<div class="empty-note">플레이어를 추가하세요</div>'}</div>
      ${out.length ? `<div class="section-label">${t ? '탈락' : '퇴장'} · ${out.length}명</div><div class="player-grid">${out.map(pcard).join('')}</div>` : ''}
      <p class="hint" style="margin-top:18px">플레이어를 누르면 ${t ? '리바이 · 애드온 · 칩 수정 · 탈락 처리' : `추가 바이인 · 칩 수정 · 자리 비움 · ${W('정산', '결과 확인')}`}를 할 수 있어요.</p>
    </div>`;
  }

  // ----- 설정 화면
  function renderSettings() {
    const g = S.game, t = isT();
    return `<div class="page narrow">
      <div class="page-head"><h1 class="page-title">설정</h1></div>
      <section class="card">
        <h2 class="sec-title">게임</h2>
        <div class="field"><label>게임 이름</label><input class="input" data-bind="game.name" value="${esc(g.name)}" placeholder="${t ? '토너먼트' : '캐시 게임'}" maxlength="20"></div>
        <p class="hint" style="margin-top:10px">게임 방식: <b>${t ? '토너먼트' : '캐시 게임'}</b> · 방식을 바꾸려면 새 게임을 시작하세요.</p>
      </section>
      <section class="card" id="sec-buyin">${renderBuyIn()}</section>
      <section class="card" id="sec-blinds">${t ? renderStructure(true) : renderCashBlinds()}</section>
      <section class="card">
        <h2 class="sec-title">알림 · 화면</h2>
        ${t ? toggleRow('prefs.sound', '레벨업 알림음', '블라인드가 오를 때 소리로 알려줘요', S.prefs.sound) : ''}
        ${t ? toggleRow('prefs.vibrate', '진동', '블라인드업 · 휴식 때 진동 (안드로이드)', S.prefs.vibrate) : ''}
        ${toggleRow('prefs.wake', '화면 꺼짐 방지', '게임 중에는 화면이 자동으로 꺼지지 않아요', S.prefs.wake)}
        ${toggleRow('prefs.money', '금액(원) 단위로 표시', '끄면 포인트(P)로 표시해요 · 칩 계산은 똑같아요', S.prefs.money, true)}
        <div class="row wrap" style="margin-top:12px">
          ${t ? `<button class="btn btn-sm" data-action="test-sound">${icon('sound')} 알림 테스트</button>` : ''}
          <button class="btn btn-sm" data-action="fullscreen">${icon('full')} 전체 화면</button></div>
      </section>
      <section class="card">
        <h2 class="sec-title">게임 관리</h2>
        <div class="row wrap">
          <button class="btn" data-action="results">${icon('trophy')} ${t ? '순위 보기' : W('정산 보기', '결과 보기')}</button>
          <button class="btn btn-danger-ghost" data-action="new-game">새 게임 시작</button></div>
        <p class="hint" style="margin-top:12px">모든 기록은 이 기기의 브라우저에 자동 저장돼요. 앱을 닫았다 열어도 이어서 진행할 수 있어요.</p>
      </section>
    </div>`;
  }

  // 타이머만 크게 보여주는 화면 (메뉴·버튼 없이)
  function renderFocus() {
    const exit = `<button class="focus-exit" data-action="focus-off">${icon('x')} 나가기</button>`;
    if (!isT()) {
      const c = S.game.cash;
      return `<div class="focus">${exit}
        <div class="f-level">CASH GAME</div>
        <div class="f-blinds">${fmt(c.sb)} / ${fmt(c.bb)}</div>
        <div class="f-next">경과 시간</div>
        <div class="f-time small" data-clock="elapsed"></div></div>`;
    }
    const c = S.clock, L = curLevel(), brk = !!L.brk, nx = nextBlindLevel(), bl = blindsAt(c.level);
    const alive = activePlayers(), chips = sum(alive, (p) => p.stack);
    return `<div class="focus ${brk ? 'is-break' : ''}">${exit}
      ${!c.running ? '<div class="paused-badge">일시정지</div>' : ''}
      <div class="f-level">${brk ? icon('coffee') + ' BREAK TIME' : 'LEVEL ' + levelNo(c.level)}</div>
      <div class="f-time time ${c.running ? '' : 'paused'}" data-clock="time">${fmtTime(clockRemain())}</div>
      <div class="progress f-progress"><i data-clock="bar"></i></div>
      <div class="f-blinds">${brk ? (nx ? '<small>휴식 후</small> ' + fmt(nx.sb) + ' / ' + fmt(nx.bb) : '휴식 중') : fmt(bl.sb) + ' / ' + fmt(bl.bb)}</div>
      <div class="f-next">${!brk && nx ? `다음 <b>${fmt(nx.sb)} / ${fmt(nx.bb)}</b> · ` : ''}<span data-clock="nextbreak"></span></div>
      ${S.players.length ? `<div class="f-stats"><span>남은 인원 <b>${alive.length}/${S.players.length}</b></span><span>평균 스택 <b>${fmt(alive.length ? chips / alive.length : 0)}</b></span><span>${W('총 상금', '총 바이인')} <b>${won(sum(S.players, (p) => p.invested))}</b></span></div>` : ''}
      <button class="f-play" data-action="clock-toggle" aria-label="${c.running ? '일시정지' : '시작'}">${icon(c.running ? 'pause' : 'play')}</button>
    </div>`;
  }

  const SCREENS = { clock: renderClockScreen, table: renderTableScreen, players: renderPlayers, settings: renderSettings };

  // ---------------------------------------------------------------- 게임 동작
  function nextColor() {
    const used = new Set(S.players.filter((p) => p.status !== 'out').map((p) => p.color));
    return COLORS.find((c) => !used.has(c)) || COLORS[S.players.length % COLORS.length];
  }
  function makePlayer(name, seat, buyWon) {
    const g = S.game, w = buyWon != null ? buyWon : g.buyIn.won;
    return {
      id: uid(), name, seat,
      stack: isT() ? g.buyIn.chips : Math.round(w * chipRatio()),
      invested: w, buyins: 1, rebuys: 0, addons: 0,
      status: 'in', color: nextColor(), outSeq: 0, cashout: 0
    };
  }
  function startGame(timerOnly) {
    const g = S.game;
    const pending = $('[name=pname]');
    if (timerOnly) S.draft = [];
    else if (pending && pending.value.trim() && S.draft.indexOf(pending.value.trim()) < 0 && S.draft.length < MAX_SEATS) S.draft.push(pending.value.trim());
    if (!timerOnly && S.draft.length < 2) return toast(isT() ? '플레이어를 2명 이상 추가하거나 \'타이머만 쓰기\'를 누르세요' : '플레이어를 2명 이상 추가하세요', 'warn');
    if (!(g.buyIn.won > 0 && g.buyIn.chips > 0)) return toast('바이인 금액과 칩을 확인하세요', 'warn');
    if (isT() && !g.levels.some((l) => !l.brk && l.sb > 0 && l.bb > 0)) return toast('블라인드 레벨을 1개 이상 만들어 주세요', 'warn');
    if (!isT() && !(g.cash.sb > 0 && g.cash.bb >= g.cash.sb)) return toast('블라인드 금액을 확인하세요', 'warn');
    const seats = S.draft.map((_, i) => i + 1);
    if (S.seatRandom) shuffle(seats);
    S.players = [];
    S.draft.forEach((name, i) => S.players.push(makePlayer(name, seats[i])));
    S.started = true;
    S.startedAt = Date.now();
    S.screen = isT() ? 'clock' : 'table';
    resetClock();
    S.button = seats[Math.floor(Math.random() * seats.length)] || 1;
    Object.assign(S, { handNo: 0, hand: null, undo: [], outSeq: 0, finished: false, draft: [] });
    save();
    render();
    keepAwake();
    toast(timerOnly ? '▶ 버튼을 누르면 타이머가 시작돼요' : isT() ? '게임 시작! ▶ 버튼을 눌러 타이머를 시작하세요' : '게임 시작!', 'ok');
  }
  function startHand() {
    const el = eligible();
    if (el.length < 2) return toast('칩이 있는 플레이어가 2명 이상 필요해요', 'warn');
    const bl = currentBlinds();
    if (!(bl.sb > 0 && bl.bb > 0)) return toast('블라인드 금액을 확인하세요', 'warn');
    const d = buttonPlayer();
    S.hand = E.newHand({ players: el.map((p) => ({ id: p.id, seat: p.seat, stack: p.stack })), dealerId: d.id, sb: bl.sb, bb: bl.bb, no: S.handNo + 1 });
    S.button = d.seat;
    S.undo = [];
    UI.raiseKey = '';
    UI.raiseOpen = false;
    UI.shownDealt = 0;
    if (S.hand.phase === 'showdown') initShowdown(S.hand);
    save();
    render();
    keepAwake();
  }
  function initShowdown(h) {
    h.sel = h.pots.map((p) => (p.eligible.length === 1 ? [p.eligible[0]] : []));
    h.touched = h.pots.map(() => false);
    UI.activePot = Math.max(0, h.pots.findIndex((p) => p.eligible.length > 1));
  }
  function doAct(type, amount) {
    const snap = JSON.stringify(S.hand);
    try {
      E.act(S.hand, type, amount);
    } catch (e) {
      S.hand = JSON.parse(snap);
      return toast(e.message, 'warn');
    }
    S.undo.push(snap);
    if (S.undo.length > 300) S.undo.shift();
    UI.raiseOpen = false;
    if (S.hand.phase === 'showdown') initShowdown(S.hand);
    save();
    render();
  }
  function toggleWinner(i, id) {
    const h = S.hand, pot = h.pots[i];
    if (!pot || pot.eligible.length === 1 || pot.eligible.indexOf(id) < 0) return;
    const sel = h.sel[i], k = sel.indexOf(id);
    if (k >= 0) sel.splice(k, 1); else sel.push(id);
    h.touched[i] = true;
    // 더 큰 팟을 이긴 사람이 다음 팟에도 참가했다면 그 팟도 이긴다 (같은 패이므로)
    for (let j = i + 1; j < h.pots.length; j++) {
      if (h.pots[j].eligible.length === 1 || h.touched[j]) continue;
      h.sel[j] = h.sel[j - 1].filter((x) => h.pots[j].eligible.indexOf(x) >= 0);
    }
    save();
    render();
  }
  function finishHand() {
    const h = S.hand;
    h.ring.forEach((id) => { const p = player(id); if (p) p.stack = h.final[id]; });
    S.handNo = h.no;
    const dealer = player(h.dealerId);
    if (dealer && dealer.seat) S.button = (dealer.seat % MAX_SEATS) + 1;
    S.hand = null;
    S.undo = [];
    UI.raiseOpen = false;
    UI.shownDealt = 0;
    save();
    render();
    UI.bustQueue = h.ring.filter((id) => h.final[id] === 0).sort((a, b) => h.seats[a].start - h.seats[b].start);
    nextBust();
  }
  function eliminate(p) {
    p.status = 'out';
    p.seat = null;
    p.stack = 0;
    S.outSeq++;
    p.outSeq = S.outSeq;
    toast(`${p.name} 탈락 · ${activePlayers().length + 1}위`);
  }
  function addRebuy(p) {
    const r = S.game.rebuy;
    p.stack += r.chips;
    p.invested += r.won;
    p.rebuys++;
  }
  function addTopUp(p, w) {
    p.stack += Math.round(w * chipRatio());
    p.invested += w;
    p.rebuys++;
  }
  function cashLeave(p) {
    p.cashout = (p.cashout || 0) + p.stack / chipRatio();
    p.stack = 0;
    p.status = 'out';
    p.seat = null;
    S.outSeq++;
    p.outSeq = S.outSeq;
  }
  function nextBust() {
    const id = UI.bustQueue.shift();
    if (!id) return checkTournamentEnd();
    const p = player(id);
    if (!p || p.stack > 0) return nextBust();
    if (isT() && !rebuyOpen()) {
      eliminate(p);
      save();
      render();
      return nextBust();
    }
    showBustModal(p);
  }
  function showBustModal(p) {
    UI.sheetId = p.id;
    const g = S.game;
    const actions = isT()
      ? `<button class="btn btn-red" data-action="bust-out">탈락 (${activePlayers().length}위)</button>
         <button class="btn btn-gold" data-action="bust-rebuy">리바이 ${won(g.rebuy.won)}</button>`
      : `<button class="btn" data-action="bust-away">자리 비움</button>
         <button class="btn btn-danger-ghost" data-action="bust-leave">퇴장</button>
         <button class="btn btn-gold" data-action="bust-topup">추가 바이인</button>`;
    openModal(`<div class="m-head"><span class="avatar lg" style="--c:${p.color}">${esc(initial(p.name))}</span>
      <div><div class="m-name">${esc(p.name)}</div><div class="m-sub">칩을 모두 잃었어요</div></div></div>
      <p class="m-body">${isT() ? `리바이하면 ${fmt(g.rebuy.chips)}칩을 받고 계속 플레이해요.` : `추가 바이인을 하거나, 잠시 빠지거나, ${W('정산하고', '결과를 남기고')} 나갈 수 있어요.`}</p>
      <div class="m-actions">${actions}</div>`, { locked: true });
  }
  function checkTournamentEnd() {
    if (!isT() || S.finished) return;
    const alive = activePlayers();
    if (S.players.length >= 2 && alive.length === 1) {
      S.finished = true;
      save();
      render();
      if (S.prefs.sound) SND.level();
      openResults();
    }
  }
  function openResults() {
    const t = isT();
    let head, rows;
    if (t) {
      const list = standings();
      const champ = S.finished ? list[0] : null;
      head = champ
        ? `<div class="trophy">${icon('trophy')}</div><h3 class="m-title" style="text-align:center">${esc(champ.name)} 우승!</h3>
           <p class="m-body" style="text-align:center">${W('총 상금', '총 바이인')} ${won(sum(S.players, (p) => p.invested))} · ${S.handNo}핸드</p>`
        : `<h3 class="m-title">현재 순위</h3><p class="m-body">${W('총 상금', '총 바이인')} ${won(sum(S.players, (p) => p.invested))} · 남은 칩 순서</p>`;
      rows = list.map((p, i) => `<div class="result-row ${i === 0 && champ ? 'first' : ''}"><span class="rk">${i + 1}</span>
        <span class="rn">${esc(p.name)}<small>${p.status === 'out' ? '탈락' : fmt(p.stack) + '칩'}</small></span>
        <span class="rv">${won(p.invested)}<small>바이인 합계</small></span></div>`).join('');
    } else {
      const list = S.players.slice().sort((a, b) => cashNet(b) - cashNet(a));
      head = `<h3 class="m-title">${W('정산', '결과')}</h3><p class="m-body">${W('남은 칩을 돈으로 바꿨을 때의 손익이에요', '남은 칩을 포인트로 환산한 득실이에요')} (${ratioText().replace(/<[^>]+>/g, '').split(' · ')[1]}).</p>`;
      rows = list.map((p, i) => {
        const n = cashNet(p);
        return `<div class="result-row"><span class="rk">${i + 1}</span>
          <span class="rn">${esc(p.name)}<small>바이인 ${won(p.invested)} → ${won(Math.round(cashValue(p)))}</small></span>
          <span class="rv ${n > 0 ? 'plus' : n < 0 ? 'minus' : ''}">${signed(n)}${unit()}</span></div>`;
      }).join('');
    }
    openModal(`${head}<div class="result-list">${rows}</div>
      <div class="m-actions"><button class="btn" data-action="modal-close">닫기</button>
      <button class="btn btn-gold" data-action="new-game">새 게임</button></div>`);
  }
  function openPlayerSheet(id) {
    const p = player(id);
    if (!p) return;
    UI.sheetId = id;
    const t = isT(), g = S.game, locked = inHand(id);
    const tile = (action, title, sub, cls, disabled) => `<button class="m-tile ${cls || ''}" data-action="${action}" ${disabled ? 'disabled' : ''}><b>${title}</b><span>${sub}</span></button>`;
    const tiles = [];
    if (p.status !== 'out') {
      if (t) {
        if (g.rebuy.on) tiles.push(tile('p-rebuy', '리바이', rebuyOpen() ? `+${fmt(g.rebuy.chips)}칩 · ${won(g.rebuy.won)}` : '리바이 기간이 끝났어요', 'gold', locked || !rebuyOpen()));
        if (g.addon.on) tiles.push(tile('p-addon', '애드온', `+${fmt(g.addon.chips)}칩 · ${won(g.addon.won)}`, 'gold', locked));
      } else tiles.push(tile('p-topup', '추가 바이인', '금액을 정해서 칩 추가', 'gold', locked));
      tiles.push(tile('p-chips', '칩 수정', '잘못된 칩 개수 바로잡기', '', locked));
      tiles.push(tile('p-seat', '자리 이동', p.seat ? p.seat + '번 자리' : '자리 없음', '', locked));
      tiles.push(tile('p-rename', '이름 변경', esc(p.name)));
      if (!t) tiles.push(tile('p-away', p.status === 'away' ? '자리 복귀' : '자리 비움', p.status === 'away' ? '다음 핸드부터 참여' : '핸드에서 잠시 빠지기', '', locked));
      tiles.push(t ? tile('p-out', '탈락 처리', '순위를 기록하고 자리에서 빼기', 'danger', locked) : tile('p-leave', W('정산 후 퇴장', '결과 기록 후 퇴장'), `남은 칩 ≈ ${won(Math.round(p.stack / chipRatio()))}`, 'danger', locked));
    } else {
      if (t && g.rebuy.on && rebuyOpen()) tiles.push(tile('p-reenter', '재참가 (리바이)', `+${fmt(g.rebuy.chips)}칩 · ${won(g.rebuy.won)}`, 'gold'));
      tiles.push(tile('p-restore', t ? '탈락 취소' : '다시 참가', t ? '잘못 처리한 탈락 되돌리기' : '새로 바이인하고 앉기'));
      tiles.push(tile('p-rename', '이름 변경', esc(p.name)));
    }
    if (!locked) tiles.push(tile('p-delete', '목록에서 삭제', '잘못 추가한 경우', 'danger'));
    const sub = p.status === 'out' ? (t ? `${standings().indexOf(p) + 1}위 · 탈락` : '퇴장') : p.seat ? `${p.seat}번 자리${p.status === 'away' ? ' · 자리 비움' : ''}` : '자리 없음';
    const stackSub = t ? `${won(p.invested)} 투자` : `${signed(cashNet(p))}${unit()}`;
    openModal(`<div class="m-head"><span class="avatar lg" style="--c:${p.color}">${esc(initial(p.name))}</span>
        <div><div class="m-name">${esc(p.name)}</div><div class="m-sub">${sub}</div></div>
        <div class="m-stack"><b>${fmt(p.stack)}</b><small>${stackSub}</small></div></div>
      ${locked ? '<p class="hint" style="margin-bottom:12px">핸드 진행 중이라 칩 관련 기능은 핸드가 끝난 뒤 쓸 수 있어요.</p>' : ''}
      <div class="m-grid">${tiles.join('')}</div>
      <div class="m-actions"><button class="btn" data-action="modal-close">닫기</button></div>`);
  }
  function openSeatPicker(id) {
    const p = player(id);
    const btns = [];
    for (let n = 1; n <= MAX_SEATS; n++) {
      const o = seated().find((q) => q.seat === n);
      btns.push(`<button class="${p.seat === n ? 'cur' : ''} ${o && o !== p ? 'taken' : ''}" data-action="seat-pick" data-n="${n}">${n}<span>${o ? esc(o.name) : '빈 자리'}</span></button>`);
    }
    openModal(`<h3 class="m-title">자리 이동</h3><p class="m-body">${esc(p.name)} — 다른 사람 자리를 누르면 서로 바꿔요</p>
      <div class="seat-pick" style="margin-top:14px">${btns.join('')}</div>
      <div class="m-actions"><button class="btn" data-action="modal-close">닫기</button></div>`);
  }
  function openAddPlayer() {
    const free = freeSeats();
    if (!free.length) return toast('빈 자리가 없어요 (최대 10명)', 'warn');
    const t = isT(), g = S.game;
    UI.npSeat = free[0];
    openModal(`<h3 class="m-title">플레이어 추가</h3>
      <div class="stack-v" style="margin-top:14px">
        <div class="field"><label>이름</label><input class="input" id="np-name" maxlength="10" placeholder="이름" autofocus></div>
        <div class="field"><label>자리</label><div class="chips-row" style="margin-top:0">${free.map((n) => `<button class="chip-opt ${n === free[0] ? 'on' : ''}" data-action="np-seat" data-n="${n}">${n}번</button>`).join('')}</div></div>
        ${t ? `<p class="hint">바이인 <b>${won(g.buyIn.won)}</b> → <b>${fmt(g.buyIn.chips)}칩</b>${S.handNo > 0 ? ' (레이트 등록)' : ''}</p>`
          : `<div class="field"><label>바이인 ${W('금액', '포인트')} (${unit()})</label><input class="input" id="np-won" type="number" inputmode="numeric" value="${g.buyIn.won}">
             <div class="chips-row">${[10000, 20000, 30000, 50000].map((v) => `<button class="chip-opt" data-action="np-won" data-v="${v}">${fmtMan(v)}</button>`).join('')}</div>
             <p class="hint" id="np-chips">→ ${fmt(g.buyIn.won * chipRatio())}칩</p></div>`}
      </div>
      <div class="m-actions"><button class="btn" data-action="modal-close">취소</button><button class="btn btn-gold" data-action="np-save">추가</button></div>`);
  }
  async function editLevelsMinutes() {
    const firstLv = levels().find((l) => !l.brk);
    const v = await promptNumber({ title: '레벨 시간 일괄 변경', body: '모든 블라인드 레벨의 시간을 바꿔요 (휴식 제외)', value: firstLv ? firstLv.min : 15, min: 1, quick: [['10분', 10], ['12분', 12], ['15분', 15], ['20분', 20]], preview: (m) => (m > 0 ? `레벨당 ${m}분` : '') });
    if (!v) return;
    levels().forEach((l) => { if (!l.brk) l.min = v; });
    S.game.preset = 'custom';
    if (!S.started) resetClock();
    save();
    render();
  }

  // ---------------------------------------------------------------- 액션 (data-action)
  const ACTIONS = {
    noop() {},
    nav(d) { S.screen = d.screen; UI.raiseOpen = false; save(); render(); },
    fullscreen: toggleFullscreen,
    'focus-on'() {
      UI.focus = true;
      const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req && !document.fullscreenElement) { const r = req.call(el); if (r && r.catch) r.catch(() => {}); }
      render();
    },
    'focus-off'() {
      UI.focus = false;
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      render();
    },
    'modal-close': closeModal,
    'm-resolve'(d) {
      const r = UI.resolve;
      let val = d.v === '1';
      if (val && UI.resolveValue) { val = UI.resolveValue(); if (val === undefined) return; }
      else if (!val && UI.resolveValue) val = null;
      UI.resolve = null;
      UI.resolveValue = null;
      closeModal();
      if (r) r(val);
    },
    'pn-quick'(d) {
      const inp = $('#pn-input');
      inp.value = d.v;
      if (UI.preview) $('#pn-preview').textContent = UI.preview(Number(d.v));
    },

    // 새 게임 설정
    'set-mode'(d) { S.game.mode = d.mode; resetClock(); save(); render(); },
    'draft-del'(d) {
      S.draft.splice(+d.i, 1);
      save();
      $('#draft-list').innerHTML = draftChips();
      $('[data-derived="draft-count"]').textContent = `${S.draft.length} / ${MAX_SEATS}`;
    },
    'start-game': () => startGame(false),
    'start-timer': () => startGame(true),
    async 'start-bb'(d) {
      const v = +d.v;
      if (S.started && !(await confirmBox({ title: '시작 블라인드를 바꿀까요?', body: '블라인드 구조가 새로 만들어져요. 현재 레벨 번호는 유지돼요.' }))) return;
      S.game.startBB = v;
      if (S.game.preset === 'custom') S.game.preset = 'standard';
      S.game.levels = buildLevels(S.game.preset, S.game.buyIn.chips, v);
      if (!S.started) resetClock(); else S.clock.level = Math.min(S.clock.level, levels().length - 1);
      save();
      render();
    },
    async preset(d) {
      if (S.started && !(await confirmBox({ title: `${PRESETS[d.k].label} 구조로 바꿀까요?`, body: '지금 블라인드 구조가 새 프리셋으로 바뀌어요. 현재 레벨 번호는 유지돼요.' }))) return;
      S.game.preset = d.k;
      S.game.levels = buildLevels(d.k, S.game.buyIn.chips, S.game.startBB);
      if (!S.started) resetClock();
      else { S.clock.level = Math.min(S.clock.level, levels().length - 1); }
      save();
      render();
    },
    'cash-blinds'(d) { S.game.cash = { sb: +d.sb, bb: +d.bb }; save(); render(); },
    'lv-add'() {
      const L = levels();
      const last = L.slice().reverse().find((l) => !l.brk) || { sb: 50, bb: 100, min: 15 };
      const idx = LADDER.findIndex((x) => x[1] > last.bb);
      const [sb, bb] = idx >= 0 ? LADDER[idx] : [last.sb * 2, last.bb * 2];
      L.push({ sb, bb, min: last.min });
      S.game.preset = 'custom';
      save();
      render();
    },
    'lv-add-break'() { levels().push({ brk: true, min: 10 }); S.game.preset = 'custom'; save(); render(); },
    'lv-del'(d) {
      const L = levels(), i = +d.i;
      if (L.filter((l) => !l.brk).length <= 1 && !L[i].brk) return toast('블라인드 레벨은 1개 이상 있어야 해요', 'warn');
      L.splice(i, 1);
      if (S.started) {
        if (S.clock.level > i) S.clock.level--;
        else if (S.clock.level === i) gotoLevel(Math.min(i, L.length - 1));
        S.clock.level = clamp(S.clock.level, 0, L.length - 1);
      } else resetClock();
      S.game.preset = 'custom';
      save();
      render();
    },
    'lv-bulk': editLevelsMinutes,

    // 타이머
    'clock-toggle'() {
      if (!isT()) return;
      const c = S.clock;
      if (c.running) {
        c.remain = Math.max(0, c.endsAt - Date.now());
        c.running = false;
      } else {
        if (c.remain <= 0) {
          if (c.level >= levels().length - 1) return toast('마지막 레벨이에요. 설정에서 레벨을 추가하세요', 'warn');
          gotoLevel(c.level + 1);
        }
        c.endsAt = Date.now() + c.remain;
        c.running = true;
        audio();
        keepAwake();
      }
      save();
      render();
    },
    'clock-level'(d) {
      const before = S.clock.level;
      gotoLevel(before + +d.d);
      if (S.clock.level === before) return;
      save();
      render();
      const L = curLevel();
      toast(L.brk ? '휴식 시간' : `LEVEL ${levelNo(S.clock.level)} · ${fmt(L.sb)} / ${fmt(L.bb)}`);
    },
    'clock-add'(d) { setRemain(clamp(clockRemain() + +d.ms, 0, 6 * 3600000)); save(); updateClock(); },
    async 'clock-goto'(d) {
      const i = +d.i;
      if (i === S.clock.level) return;
      const L = levels()[i];
      if (!(await confirmBox({ title: `${L.brk ? '휴식' : 'LEVEL ' + levelNo(i)}로 이동할까요?`, body: L.brk ? '' : `블라인드 ${fmt(L.sb)} / ${fmt(L.bb)} · 시간은 처음부터 시작해요` }))) return;
      gotoLevel(i);
      save();
      render();
    },
    'test-sound'() {
      // 세 가지 알림음을 차례로 들려준다
      audio();
      SND.level(); vibrate([300, 120, 300]); toast('① 블라인드 업');
      setTimeout(() => { SND.brk(); toast('② 휴식 시작'); }, 3000);
      setTimeout(() => { SND.resume(); toast('③ 휴식 끝'); }, 6500);
    },

    // 테이블
    'hand-start': startHand,
    'random-button'() {
      const el = eligible();
      if (el.length < 2) return;
      S.button = el[Math.floor(Math.random() * el.length)].seat;
      save();
      render();
      toast(`딜러 버튼: ${buttonPlayer().name}`);
    },
    'seat-tap'(d) {
      const h = S.hand, p = player(d.id);
      if (!p) return;
      if (!h) {
        if (p.status === 'in' && p.stack > 0) { S.button = p.seat; save(); render(); }
        else openPlayerSheet(p.id);
        return;
      }
      if (h.phase === 'showdown') {
        const pot = h.pots[UI.activePot];
        if (pot && pot.eligible.indexOf(p.id) >= 0) toggleWinner(UI.activePot, p.id);
        return;
      }
      if (!h.seats[p.id]) openPlayerSheet(p.id);
    },
    act(d) { doAct(d.type); },
    'raise-main'() {
      if (!wide() && !UI.raiseOpen) { UI.raiseOpen = true; renderPanelOnly(); return; }
      doAct('raise', UI.raiseTo);
    },
    'raise-close'() { UI.raiseOpen = false; renderPanelOnly(); },
    'raise-step'(d) {
      const h = S.hand;
      setRaise(UI.raiseTo + +d.d * h.bb);
    },
    'raise-set'(d) {
      const h = S.hand, L = E.legal(h), v = d.v;
      let x;
      if (v === 'min') x = L.minTo;
      else if (v === 'max') x = L.maxTo;
      else if (v[0] === 'x') x = h.bb * parseFloat(v.slice(1));
      else x = h.currentBet + parseFloat(v.slice(1)) * (L.pot + L.toCall);
      setRaise(x);
    },
    undo() {
      if (!S.undo.length) return;
      S.hand = JSON.parse(S.undo.pop());
      UI.raiseKey = '';
      UI.shownDealt = 5;
      save();
      render();
    },
    async 'hand-cancel'() {
      if (!(await confirmBox({ title: '이번 핸드를 취소할까요?', body: '모든 칩이 핸드 시작 전으로 돌아가요.', ok: '핸드 취소', danger: true }))) return;
      S.hand = null;
      S.undo = [];
      save();
      render();
    },
    'pot-focus'(d) { UI.activePot = +d.i; render(); },
    'toggle-winner'(d) { UI.activePot = +d.i; toggleWinner(+d.i, d.id); },
    'sd-confirm'() {
      const snap = JSON.stringify(S.hand);
      try { E.settle(S.hand, S.hand.sel); } catch (e) { S.hand = JSON.parse(snap); return toast(e.message, 'warn'); }
      S.undo.push(snap);
      save();
      render();
    },
    'hand-next': finishHand,

    // 탈락 / 칩 소진
    'bust-out'() { const p = player(UI.sheetId); eliminate(p); closeModal(); save(); render(); nextBust(); },
    'bust-rebuy'() { const p = player(UI.sheetId); addRebuy(p); closeModal(); save(); render(); toast(`${p.name} 리바이 +${fmt(S.game.rebuy.chips)}칩`, 'ok'); nextBust(); },
    'bust-away'() { const p = player(UI.sheetId); p.status = 'away'; closeModal(); save(); render(); nextBust(); },
    'bust-leave'() { const p = player(UI.sheetId); cashLeave(p); closeModal(); save(); render(); toast(`${p.name} 퇴장 · ${signed(cashNet(p))}${unit()}`); nextBust(); },
    async 'bust-topup'() {
      const p = player(UI.sheetId);
      closeModal();
      const w = await askTopUp(p);
      if (w) { addTopUp(p, w); save(); render(); toast(`${p.name} 추가 바이인 ${won(w)}`, 'ok'); nextBust(); }
      else showBustModal(p);
    },

    // 플레이어
    'player-sheet'(d) { openPlayerSheet(d.id); },
    'add-player': openAddPlayer,
    'np-seat'(d, el) { UI.npSeat = +d.n; $$('[data-action="np-seat"]').forEach((b) => b.classList.toggle('on', b === el)); },
    'np-won'(d) { const inp = $('#np-won'); inp.value = d.v; updateNpChips(); },
    'np-save'() {
      const name = $('#np-name').value.trim();
      if (!name) return toast('이름을 입력하세요', 'warn');
      let w;
      if (!isT()) {
        w = Math.round(Number($('#np-won').value));
        if (!(w > 0)) return toast('바이인 금액을 확인하세요', 'warn');
      }
      const p = makePlayer(name, UI.npSeat, w);
      S.players.push(p);
      closeModal();
      save();
      render();
      toast(`${name} 추가 · ${UI.npSeat}번 자리`, 'ok');
    },
    async 'seat-shuffle'() {
      if (S.hand) return toast('핸드가 끝난 뒤에 자리를 섞을 수 있어요', 'warn');
      const list = seated();
      if (list.length < 2) return;
      if (!(await confirmBox({ title: '자리를 랜덤으로 섞을까요?', body: '앉아 있는 사람들의 자리를 1번부터 무작위로 다시 배정해요.' }))) return;
      const seats = shuffle(list.map((_, i) => i + 1));
      list.forEach((p, i) => { p.seat = seats[i]; });
      S.button = seats[Math.floor(Math.random() * seats.length)];
      save();
      render();
      toast('자리를 섞었어요', 'ok');
    },
    'p-rebuy'() { const p = player(UI.sheetId); addRebuy(p); closeModal(); save(); render(); toast(`${p.name} 리바이 +${fmt(S.game.rebuy.chips)}칩`, 'ok'); },
    'p-addon'() {
      const p = player(UI.sheetId), a = S.game.addon;
      p.stack += a.chips;
      p.invested += a.won;
      p.addons++;
      closeModal();
      save();
      render();
      toast(`${p.name} 애드온 +${fmt(a.chips)}칩`, 'ok');
    },
    async 'p-topup'() {
      const p = player(UI.sheetId);
      closeModal();
      const w = await askTopUp(p);
      if (!w) return;
      addTopUp(p, w);
      save();
      render();
      toast(`${p.name} 추가 바이인 ${won(w)}`, 'ok');
    },
    async 'p-chips'() {
      const p = player(UI.sheetId);
      closeModal();
      const v = await promptNumber({ title: `${p.name} 칩 수정`, body: '지금 갖고 있는 칩 개수를 입력하세요', value: p.stack, preview: (x) => (Number.isFinite(x) ? `${signed(x - p.stack)}칩` : '') });
      if (v == null) return;
      p.stack = v;
      save();
      render();
    },
    'p-seat'() { const id = UI.sheetId; closeModal(); openSeatPicker(id); },
    'seat-pick'(d) {
      const p = player(UI.sheetId), n = +d.n;
      const o = seated().find((q) => q.seat === n);
      if (o && o !== p) {
        if (!p.seat) return toast('자리가 없는 사람과는 바꿀 수 없어요', 'warn');
        if (inHand(o.id)) return toast('핸드 중인 사람과는 바꿀 수 없어요', 'warn');
        o.seat = p.seat;
      }
      p.seat = n;
      closeModal();
      save();
      render();
    },
    async 'p-rename'() {
      const p = player(UI.sheetId);
      closeModal();
      const v = await promptText({ title: '이름 변경', value: p.name });
      if (!v) return;
      p.name = v;
      save();
      render();
    },
    'p-away'() { const p = player(UI.sheetId); p.status = p.status === 'away' ? 'in' : 'away'; closeModal(); save(); render(); },
    async 'p-out'() {
      const p = player(UI.sheetId);
      closeModal();
      if (!(await confirmBox({ title: `${p.name} 탈락 처리할까요?`, body: `${activePlayers().length}위로 기록되고 자리에서 빠져요. 남은 칩 ${fmt(p.stack)}개는 사라져요.`, ok: '탈락', danger: true }))) return;
      eliminate(p);
      save();
      render();
      checkTournamentEnd();
    },
    async 'p-leave'() {
      const p = player(UI.sheetId);
      closeModal();
      const value = Math.round(p.stack / chipRatio());
      if (!(await confirmBox({ title: `${p.name} ${W('정산 후 퇴장', '결과 기록 후 퇴장')}`, body: `남은 칩 ${fmt(p.stack)}개 = <b>${won(value)}</b><br>총 바이인 ${won(p.invested)} → ${W('손익', '득실')} <b>${signed(Math.round((p.cashout || 0) + value - p.invested))}${unit()}</b>`, ok: '퇴장' }))) return;
      cashLeave(p);
      save();
      render();
    },
    'p-reenter'() {
      const p = player(UI.sheetId), free = freeSeats();
      if (!free.length) return toast('빈 자리가 없어요', 'warn');
      addRebuy(p);
      p.status = 'in';
      p.seat = free[0];
      p.outSeq = 0;
      closeModal();
      save();
      render();
      toast(`${p.name} 재참가 · ${p.seat}번 자리`, 'ok');
    },
    async 'p-restore'() {
      const p = player(UI.sheetId), free = freeSeats();
      closeModal();
      if (!free.length) return toast('빈 자리가 없어요', 'warn');
      if (isT()) {
        const v = await promptNumber({ title: `${p.name} 탈락 취소`, body: '되돌릴 칩 개수를 입력하세요', value: S.game.buyIn.chips, min: 1 });
        if (!v) return;
        p.stack = v;
      } else {
        const w = await askTopUp(p);
        if (!w) return;
        addTopUp(p, w);
      }
      p.status = 'in';
      p.seat = free[0];
      p.outSeq = 0;
      S.finished = false;
      save();
      render();
      toast(`${p.name} · ${p.seat}번 자리로 복귀`, 'ok');
    },
    async 'p-delete'() {
      const p = player(UI.sheetId);
      closeModal();
      if (!(await confirmBox({ title: `${p.name}을(를) 삭제할까요?`, body: '바이인 · 리바이 기록도 함께 사라지고 되돌릴 수 없어요.', ok: '삭제', danger: true }))) return;
      S.players = S.players.filter((x) => x !== p);
      save();
      render();
    },

    // 게임 관리
    results: openResults,
    async 'new-game'() {
      closeModal();
      if (!(await confirmBox({ title: '새 게임을 시작할까요?', body: '지금 게임 기록은 지워져요. 설정과 플레이어 이름은 그대로 가져가요.', ok: '새 게임', danger: true }))) return;
      const names = S.players.map((p) => p.name).slice(0, MAX_SEATS);
      const keep = { game: S.game, prefs: S.prefs, seatRandom: S.seatRandom };
      S = Object.assign(defaultState(), keep, { draft: names });
      resetClock();
      releaseWake();
      save();
      render();
    }
  };

  function askTopUp(p) {
    const base = S.game.buyIn.won;
    return promptNumber({
      title: `${p.name} 추가 바이인`, body: `바이인 ${W('금액', '포인트')}(${unit()})를 입력하세요`, value: base, min: 1,
      quick: [[fmtMan(base), base], [fmtMan(base * 2), base * 2], ['1만', 10000], ['5만', 50000]].filter((q, i, a) => a.findIndex((x) => x[1] === q[1]) === i),
      preview: (w) => (w > 0 ? `→ ${fmt(w * chipRatio())}칩` : ''), ok: '바이인'
    });
  }
  function updateNpChips() {
    const w = Number($('#np-won').value);
    $('#np-chips').textContent = w > 0 ? `→ ${fmt(w * chipRatio())}칩` : '';
  }
  function setRaise(v) {
    const h = S.hand, L = h && E.legal(h);
    if (!L || !L.canRaise) return;
    UI.raiseTo = snapRaise(L, Number(v), h.unit);
    $$('[data-raise-label]').forEach((el) => { el.textContent = fmt(UI.raiseTo); });
    const inp = $('[data-raise-input]');
    if (inp) inp.value = fmt(UI.raiseTo);
    const sl = $('[data-raise-slider]');
    if (sl) sl.value = UI.raiseTo;
  }

  // ---------------------------------------------------------------- 입력 바인딩
  function onBind(t) {
    const path = t.dataset.bind;
    let v;
    if (t.type === 'checkbox') v = t.checked;
    else if ('num' in t.dataset) {
      v = Math.round(Number(t.value));
      if (t.value === '' || !Number.isFinite(v) || v < 0) { t.value = getPath(S, path); return toast('올바른 숫자를 입력하세요', 'warn'); }
    } else v = t.value.trim();
    const old = getPath(S, path);
    setPath(S, path, v);
    const g = S.game;
    const sync = (p) => $$(`[data-bind="${p}"]`).forEach((el) => { el.value = getPath(S, p); });
    if (!S.started) {
      // 리바이/애드온 금액이 바이인과 같았다면 같이 바꿔준다
      if (path === 'game.buyIn.won') {
        if (g.rebuy.won === old) { g.rebuy.won = v; sync('game.rebuy.won'); }
        if (g.addon.won === old) { g.addon.won = v; sync('game.addon.won'); }
      }
      if (path === 'game.buyIn.chips') {
        if (g.rebuy.chips === old) { g.rebuy.chips = v; sync('game.rebuy.chips'); }
        if (g.addon.chips === old) { g.addon.chips = v; sync('game.addon.chips'); }
        if (g.preset !== 'custom' && v > 0) {
          g.levels = buildLevels(g.preset, v, g.startBB);
          resetClock();
          const sec = $('#sec-blinds');
          if (sec && isT()) sec.innerHTML = renderStructure(false);
        }
      }
    }
    if (path === 'game.cash.sb' && v > 0) { g.cash.bb = v * 2; sync('game.cash.bb'); }
    if (path.indexOf('game.cash') === 0) {
      $$('[data-action="cash-blinds"]').forEach((b) => b.classList.toggle('on', +b.dataset.sb === g.cash.sb && +b.dataset.bb === g.cash.bb));
    }
    if (path.indexOf('game.buyIn') === 0) $$('[data-derived="ratio"]').forEach((el) => { el.innerHTML = ratioText(); });
    if (path === 'prefs.wake') { if (v) keepAwake(); else releaseWake(); }
    save();
    if ('rerender' in t.dataset) render();
  }
  function onLevelEdit(t) {
    const i = +t.dataset.lv, k = t.dataset.k, lv = levels()[i];
    if (!lv) return;
    const v = Math.round(Number(t.value));
    if (!(v > 0)) { t.value = lv[k]; return toast('0보다 큰 숫자를 입력하세요', 'warn'); }
    const oldMin = lv.min;
    lv[k] = v;
    if (k === 'sb') {
      lv.bb = v * 2;
      const bbIn = $(`[data-lv="${i}"][data-k="bb"]`);
      if (bbIn) bbIn.value = lv.bb;
    }
    if (k === 'min') {
      if (!S.started && i === 0) resetClock();
      else if (S.started && i === S.clock.level && !S.clock.running && S.clock.remain === oldMin * 60000) S.clock.remain = v * 60000;
    }
    S.game.preset = 'custom';
    $$('.preset.on').forEach((el) => el.classList.remove('on'));
    const sm = $('.struct-summary');
    if (sm) sm.outerHTML = structSummary();
    save();
  }
  function addDraft(form) {
    const inp = form.elements.pname;
    const name = inp.value.trim();
    if (!name) return;
    if (S.draft.length >= MAX_SEATS) return toast('최대 10명까지 가능해요', 'warn');
    if (S.draft.indexOf(name) >= 0) return toast('같은 이름이 이미 있어요', 'warn');
    S.draft.push(name);
    inp.value = '';
    save();
    $('#draft-list').innerHTML = draftChips();
    $('[data-derived="draft-count"]').textContent = `${S.draft.length} / ${MAX_SEATS}`;
    inp.focus();
  }

  // ---------------------------------------------------------------- 시작
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const fn = ACTIONS[el.dataset.action];
    if (fn) fn(el.dataset, el, e);
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-bind]')) onBind(t);
    else if (t.matches('[data-lv]')) onLevelEdit(t);
    else if (t.matches('[data-raise-input]')) setRaise(Number(t.value.replace(/[^\d]/g, '')));
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches('[data-raise-slider]')) setRaise(Number(t.value));
    else if (t.id === 'np-won') updateNpChips();
    else if (t.id === 'pn-input' && UI.preview) $('#pn-preview').textContent = UI.preview(Number(t.value));
  });
  document.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.dataset.form === 'draft-add') addDraft(e.target);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !UI.modal) return;
    const t = e.target;
    if (t.id === 'pn-input' || t.id === 'pt-input') { e.preventDefault(); ACTIONS['m-resolve']({ v: '1' }); }
    else if (t.id === 'np-name' && isT()) { e.preventDefault(); ACTIONS['np-save'](); }
    else if (t.matches && t.matches('[data-raise-input]')) t.blur();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && UI.focus) ACTIONS['focus-off'](); });
  document.addEventListener('toggle', (e) => {
    if (e.target.matches && e.target.matches('details.struct-details')) UI.structOpen = e.target.open;
  }, true);
  document.addEventListener('pointerdown', () => { audio(); keepAwake(); }, { passive: true });

  // 휴식 줄 끌어서 옮기기 (터치·마우스 공통)
  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.lv-drag');
    if (!handle) return;
    e.preventDefault();
    const row = handle.closest('.lv-row');
    const rows = $$('.lv-row', row.parentElement);
    drag = { row, rows, from: +handle.dataset.i, to: +handle.dataset.i, startY: e.clientY, mids: rows.map((r) => { const b = r.getBoundingClientRect(); return b.top + b.height / 2; }) };
    row.classList.add('dragging');
    if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    drag.row.style.transform = `translateY(${e.clientY - drag.startY}px)`;
    // 끌고 있는 줄을 뺀 나머지 중 손가락보다 위에 있는 줄 수 = 들어갈 위치
    drag.to = drag.mids.filter((m, i) => i !== drag.from && m < e.clientY).length;
    const others = drag.rows.filter((r) => r !== drag.row);
    drag.rows.forEach((r) => r.classList.remove('drop-before', 'drop-after'));
    if (drag.to < others.length) others[drag.to].classList.add('drop-before');
    else if (others.length) others[others.length - 1].classList.add('drop-after');
  });
  const endDrag = () => {
    if (!drag) return;
    const { from, to } = drag;
    drag = null;
    if (from !== to) {
      const L = levels(), cur = L[S.clock.level];
      const [item] = L.splice(from, 1);
      L.splice(to, 0, item);
      if (S.started) S.clock.level = Math.max(0, L.indexOf(cur));
      S.game.preset = 'custom';
      save();
    }
    render();
  };
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { keepAwake(); tick(); } });
  window.addEventListener('resize', () => { if (S.started && S.screen === 'table') layoutTable(); });
  // 화면 회전으로 휴대폰 ↔ 태블릿 배치가 바뀌면 패널을 다시 그린다
  const wideMq = matchMedia('(min-width: 760px)');
  const onWideChange = () => { UI.raiseOpen = false; if (S.started && S.screen === 'table') renderPanelOnly(); };
  if (wideMq.addEventListener) wideMq.addEventListener('change', onWideChange); else if (wideMq.addListener) wideMq.addListener(onWideChange);

  render();
  setInterval(tick, 250);
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
