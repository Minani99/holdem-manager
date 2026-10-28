// 실행: node test/engine.test.js
const assert = require('node:assert/strict');
const E = require('../js/engine.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + e.stack); process.exitCode = 1; }
}

const P = (stacks) => stacks.map((s, i) => ({ id: 'p' + (i + 1), seat: i + 1, stack: s }));
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const conserve = (h) => {
  const before = Object.values(h.seats).reduce((a, s) => a + s.start, 0);
  assert.equal(sum(h.final), before, '칩 총량 보존');
};

test('3인: 블라인드 위치와 프리플랍 순서', () => {
  const h = E.newHand({ players: P([1000, 1000, 1000]), dealerId: 'p1', sb: 10, bb: 20 });
  assert.equal(h.sbId, 'p2'); assert.equal(h.bbId, 'p3');
  assert.equal(h.actorId, 'p1');           // UTG = 딜러 (3인)
  E.act(h, 'call'); assert.equal(h.actorId, 'p2');
  E.act(h, 'call'); assert.equal(h.actorId, 'p3');
  const L = E.legal(h); assert.ok(L.canCheck); assert.ok(L.canRaise);   // BB 옵션
  E.act(h, 'check');
  assert.equal(h.street, 1); assert.equal(h.actorId, 'p2');             // 플랍은 SB부터
});

test('헤즈업: 딜러가 SB, 프리플랍 먼저 / 플랍은 나중', () => {
  const h = E.newHand({ players: P([1000, 1000]), dealerId: 'p1', sb: 10, bb: 20 });
  assert.equal(h.sbId, 'p1'); assert.equal(h.bbId, 'p2');
  assert.equal(h.actorId, 'p1');
  E.act(h, 'call'); E.act(h, 'check');
  assert.equal(h.street, 1); assert.equal(h.actorId, 'p2');
});

test('모두 폴드 → BB 단독 승리', () => {
  const h = E.newHand({ players: P([1000, 1000, 1000]), dealerId: 'p1', sb: 10, bb: 20 });
  E.act(h, 'fold'); E.act(h, 'fold');
  assert.equal(h.phase, 'done'); assert.ok(h.uncontested);
  assert.equal(h.final.p3, 1010); assert.equal(h.final.p2, 990);
  conserve(h);
});

test('언콜드 벳 반환', () => {
  const h = E.newHand({ players: P([1000, 1000, 1000]), dealerId: 'p1', sb: 10, bb: 20 });
  E.act(h, 'raise', 100); E.act(h, 'fold'); E.act(h, 'fold');
  assert.equal(h.final.p1, 1030);
  conserve(h);
});

test('3인 올인: 메인팟 + 사이드팟 + 초과분 반환', () => {
  // p1=1000, p2=3000, p3=5000
  const h = E.newHand({ players: P([1000, 3000, 5000]), dealerId: 'p1', sb: 50, bb: 100 });
  E.act(h, 'allin');   // p1 1000
  E.act(h, 'allin');   // p2 3000
  E.act(h, 'allin');   // p3 5000 → 2000 반환
  assert.equal(h.phase, 'showdown');
  assert.equal(h.pots.length, 2);
  assert.deepEqual(h.pots[0], { amount: 3000, eligible: ['p1', 'p2', 'p3'] });
  assert.deepEqual(h.pots[1], { amount: 4000, eligible: ['p2', 'p3'] });
  assert.equal(h.seats.p3.stack, 2000);
  E.settle(h, [['p1'], ['p3']]);
  assert.equal(h.final.p1, 3000); assert.equal(h.final.p2, 0); assert.equal(h.final.p3, 6000);
  conserve(h);
});

test('4인: 사이드팟 2개, 폴드한 사람 칩은 데드머니', () => {
  const h = E.newHand({ players: P([500, 2000, 1200, 5000]), dealerId: 'p4', sb: 50, bb: 100 });
  // 딜러 p4 → SB p1, BB p2, UTG p3
  assert.equal(h.actorId, 'p3');
  E.act(h, 'raise', 300);     // p3
  E.act(h, 'call');           // p4 300
  E.act(h, 'allin');          // p1 500 (300→500, 200 증가 = 풀 레이즈)
  E.act(h, 'fold');           // p2 (BB 100 데드)
  E.act(h, 'call');           // p3 500
  E.act(h, 'call');           // p4 500
  assert.equal(h.street, 1);
  E.act(h, 'allin');          // p3 남은 700
  E.act(h, 'call');           // p4
  assert.equal(h.phase, 'showdown');
  // 메인: 500*3 + 100(p2) = 1600 / 사이드: 700*2 = 1400
  assert.equal(h.pots[0].amount, 1600); assert.deepEqual(h.pots[0].eligible, ['p1', 'p3', 'p4']);
  assert.equal(h.pots[1].amount, 1400); assert.deepEqual(h.pots[1].eligible, ['p3', 'p4']);
  E.settle(h, [['p1'], ['p4']]);
  assert.equal(h.final.p1, 1600); assert.equal(h.final.p4, 5000 - 1200 + 1400);
  conserve(h);
});

test('불완전 올인 레이즈는 이미 행동한 사람에게 레이즈를 다시 열지 않음', () => {
  const h = E.newHand({ players: P([5000, 5000, 5000, 350]), dealerId: 'p4', sb: 50, bb: 100 });
  // SB p1, BB p2, UTG p3, 딜러 p4
  E.act(h, 'raise', 300);     // p3 → minRaise 200
  E.act(h, 'allin');          // p4 350 (50 추가: 불완전)
  E.act(h, 'fold');           // p1
  E.act(h, 'call');           // p2 350
  assert.equal(h.actorId, 'p3');
  const L = E.legal(h);
  assert.equal(L.toCall, 50);
  assert.equal(L.canRaise, false, 'p3는 콜/폴드만 가능');
});

test('누적 불완전 레이즈가 풀 레이즈 이상이면 다시 열림', () => {
  const h = E.newHand({ players: P([5000, 5000, 5000, 450, 560]), dealerId: 'p5', sb: 50, bb: 100 });
  // SB p1, BB p2, UTG p3, p4, 딜러 p5
  E.act(h, 'raise', 300);     // p3, minRaise 200
  E.act(h, 'allin');          // p4 450 (불완전)
  E.act(h, 'allin');          // p5 560 (불완전)
  E.act(h, 'fold');           // p1
  E.act(h, 'fold');           // p2
  assert.equal(h.actorId, 'p3');
  assert.equal(E.legal(h).canRaise, true, '560-300=260 ≥ 200');
});

test('BB가 블라인드도 못 채우는 숏스택', () => {
  const h = E.newHand({ players: P([1000, 1000, 60]), dealerId: 'p1', sb: 50, bb: 100 });
  assert.ok(h.seats.p3.allIn);
  assert.equal(h.currentBet, 100);        // 다른 사람은 풀 BB를 콜해야 함
  E.act(h, 'call');                       // p1 100
  E.act(h, 'call');                       // p2 100
  assert.equal(h.street, 1);
  E.act(h, 'check'); E.act(h, 'check');
  E.act(h, 'check'); E.act(h, 'check');
  E.act(h, 'check'); E.act(h, 'check');
  assert.equal(h.phase, 'showdown');
  assert.deepEqual(h.pots.map(p => p.amount), [180, 80]);
  E.settle(h, [['p3'], ['p1']]);
  assert.equal(h.final.p3, 180); conserve(h);
});

test('SB 폴드, 숏 BB 올인 → SB 초과분 반환', () => {
  const h = E.newHand({ players: P([1000, 30]), dealerId: 'p1', sb: 50, bb: 100 });
  // 헤즈업: p1=SB(딜러), p2=BB 30 올인
  E.act(h, 'fold');
  assert.equal(h.phase, 'done');
  assert.equal(h.final.p2, 60); assert.equal(h.final.p1, 970);
  conserve(h);
});

test('스플릿 팟 홀수 칩은 딜러 왼쪽부터', () => {
  const h = E.newHand({ players: P([1000, 1000, 1000]), dealerId: 'p1', sb: 25, bb: 50 });
  E.act(h, 'call'); E.act(h, 'fold'); E.act(h, 'check');
  for (let i = 0; i < 6; i++) E.act(h, 'check');
  assert.equal(h.phase, 'showdown');
  assert.equal(h.pots[0].amount, 125);
  E.settle(h, [['p1', 'p3']]);
  // unit=25 → 5칸, p3(딜러 왼쪽 먼저)이 75, p1이 50
  assert.equal(h.payouts.p3, 75); assert.equal(h.payouts.p1, 50);
  conserve(h);
});

test('올인 후 남은 사람이 1명이면 보드 자동 진행', () => {
  const h = E.newHand({ players: P([500, 5000, 5000]), dealerId: 'p1', sb: 50, bb: 100 });
  E.act(h, 'allin');  // p1 500
  E.act(h, 'call');   // p2
  E.act(h, 'fold');   // p3
  assert.equal(h.phase, 'showdown');
  assert.ok(h.runout);
});

test('최소 레이즈 미만 거부', () => {
  const h = E.newHand({ players: P([1000, 1000, 1000]), dealerId: 'p1', sb: 10, bb: 20 });
  assert.throws(() => E.act(h, 'raise', 30));
  E.act(h, 'raise', 40);
  assert.equal(E.legal(h).fullMinTo, 60);
});

// 무작위 시뮬레이션: 칩 보존 + 종료 보장
test('무작위 5,000핸드 시뮬레이션', () => {
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let t = 0; t < 5000; t++) {
    const n = 2 + Math.floor(rnd() * 9);
    const stacks = Array.from({ length: n }, () => 10 * (1 + Math.floor(rnd() * 300)));
    const h = E.newHand({ players: P(stacks), dealerId: 'p' + (1 + Math.floor(rnd() * n)), sb: 10, bb: 20 });
    let guard = 0;
    while (h.phase === 'betting') {
      if (++guard > 500) throw new Error('무한 루프');
      const L = E.legal(h);
      const r = rnd();
      if (r < 0.15 && L.toCall > 0) E.act(h, 'fold');
      else if (r < 0.25) E.act(h, 'allin');
      else if (r < 0.45 && L.canRaise) {
        const to = L.minTo + Math.floor(rnd() * (L.maxTo - L.minTo + 1));
        E.act(h, 'raise', to === L.maxTo || to >= L.fullMinTo ? to : L.minTo === L.maxTo ? L.maxTo : L.fullMinTo);
      } else if (L.canCheck) E.act(h, 'check');
      else E.act(h, 'call');
    }
    if (h.phase === 'showdown') {
      h.pots.forEach(p => assert.ok(p.eligible.length >= 1));
      // 앞 팟 참가자 ⊇ 뒤 팟 참가자
      for (let i = 1; i < h.pots.length; i++) h.pots[i].eligible.forEach(id => assert.ok(h.pots[i - 1].eligible.includes(id)));
      E.settle(h, h.pots.map(p => p.eligible.filter(() => rnd() < 0.5).concat(p.eligible[0]).filter((v, i, a) => a.indexOf(v) === i)));
    }
    assert.equal(h.phase, 'done');
    conserve(h);
    Object.values(h.final).forEach(v => assert.ok(v >= 0 && Number.isInteger(v)));
  }
});

console.log(`\n${passed}개 통과` + (process.exitCode ? ' (실패 있음)' : ''));
