/*
 * 홀덤 핸드 엔진 — 베팅 진행, 사이드팟, 칩 분배 (DOM 없음, 순수 로직)
 *
 * hand.seats[id] = { stack, start, street, total, folded, allIn, acted, matched }
 *   street  : 이번 스트릿에 낸 칩
 *   total   : 이번 핸드에 낸 칩 합계 (사이드팟 계산 기준)
 *   matched : 마지막으로 행동했을 때 맞춰둔 금액 (불완전 레이즈 재오픈 판정용)
 */
(function (root) {
  'use strict';

  var STREETS = ['프리플랍', '플랍', '턴', '리버'];

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  }

  function seatList(h) { return h.ring.map(function (id) { return h.seats[id]; }); }
  function liveSeats(h) { return seatList(h).filter(function (s) { return !s.folded; }); }

  function put(s, amount) {
    var a = Math.max(0, Math.min(amount, s.stack));
    s.stack -= a; s.street += a; s.total += a;
    if (s.stack === 0) s.allIn = true;
    return a;
  }

  function log(h, entry) {
    entry.street = h.street;
    h.log.push(entry);
  }

  /**
   * players: [{ id, seat, stack }]  (stack > 0, 2명 이상)
   */
  function newHand(opts) {
    var players = opts.players.slice().sort(function (a, b) { return a.seat - b.seat; });
    if (players.length < 2) throw new Error('플레이어가 2명 이상 필요합니다');
    var ring = players.map(function (p) { return p.id; });
    var n = ring.length;
    var di = Math.max(0, ring.indexOf(opts.dealerId));
    var at = function (k) { return ring[(di + k) % n]; };

    var h = {
      no: opts.no || 1,
      sb: opts.sb, bb: opts.bb,
      unit: gcd(opts.sb, opts.bb) || 1,
      ring: ring,
      dealerId: ring[di],
      sbId: n === 2 ? at(0) : at(1),
      bbId: n === 2 ? at(1) : at(2),
      street: 0,
      phase: 'betting',          // betting → showdown → done
      currentBet: opts.bb,
      minRaise: opts.bb,
      actorId: null,
      runout: false,
      seats: {},
      log: [],
      refunds: {},
      pots: null,
      payouts: null,
      final: null,
      uncontested: false
    };
    players.forEach(function (p) {
      h.seats[p.id] = {
        id: p.id, stack: p.stack, start: p.stack,
        street: 0, total: 0,
        folded: false, allIn: false, acted: false, matched: 0
      };
    });

    log(h, { id: h.sbId, type: 'sb', amount: put(h.seats[h.sbId], opts.sb) });
    log(h, { id: h.bbId, type: 'bb', amount: put(h.seats[h.bbId], opts.bb) });

    // 프리플랍 첫 행동: BB 다음 (헤즈업은 딜러=SB가 먼저)
    var first = n === 2 ? di : (di + 3) % n;
    h.actorId = pendingActor(h, first);
    if (!h.actorId) closeRound(h);
    return h;
  }

  function needsAction(h, s) {
    return !s.folded && !s.allIn && (!s.acted || s.street < h.currentBet);
  }

  function pendingActor(h, fromIdx) {
    var live = liveSeats(h);
    if (live.length <= 1) return null;
    var canAct = live.filter(function (s) { return !s.allIn; });
    if (canAct.length === 0) return null;
    // 상대가 모두 올인이고 이미 금액을 맞췄으면 더 할 행동이 없음
    if (canAct.length === 1 && canAct[0].street >= h.currentBet) return null;
    var n = h.ring.length;
    for (var k = 0; k < n; k++) {
      var s = h.seats[h.ring[(fromIdx + k) % n]];
      if (needsAction(h, s)) return s.id;
    }
    return null;
  }

  function potTotal(h) {
    return seatList(h).reduce(function (a, s) { return a + s.total; }, 0);
  }

  function legal(h) {
    if (h.phase !== 'betting' || !h.actorId) return null;
    var s = h.seats[h.actorId];
    var toCall = Math.max(0, h.currentBet - s.street);
    var maxTo = s.street + s.stack;
    // 이미 행동한 사람은 '풀 레이즈 이상'을 마주했을 때만 다시 레이즈 가능
    var reopened = !s.acted || (h.currentBet - s.matched) >= h.minRaise;
    var canRaise = s.stack > toCall && reopened;
    return {
      id: s.id,
      stack: s.stack,
      street: s.street,
      toCall: toCall,
      callAmt: Math.min(toCall, s.stack),
      canCheck: toCall === 0,
      callIsAllIn: toCall > 0 && s.stack <= toCall,
      canRaise: canRaise,
      isBet: h.currentBet === 0,
      minTo: Math.min(h.currentBet + h.minRaise, maxTo),
      fullMinTo: h.currentBet + h.minRaise,
      maxTo: maxTo,
      pot: potTotal(h)
    };
  }

  /** type: fold | check | call | raise(amount=레이즈 후 총액) | allin */
  function act(h, type, amount) {
    var L = legal(h);
    if (!L) throw new Error('지금은 행동할 수 없습니다');
    var s = h.seats[h.actorId];
    var idx = h.ring.indexOf(s.id);
    var entry = { id: s.id, type: type };

    if (type === 'allin') {
      if (L.canRaise) { type = 'raise'; amount = L.maxTo; }
      else if (L.toCall > 0) { type = 'call'; }
      else throw new Error('올인할 수 없습니다');
    }

    if (type === 'fold') {
      s.folded = true;
    } else if (type === 'check') {
      if (!L.canCheck) throw new Error('체크할 수 없습니다');
    } else if (type === 'call') {
      if (L.toCall === 0) throw new Error('콜할 금액이 없습니다');
      entry.amount = put(s, L.callAmt);
      entry.type = 'call';
    } else if (type === 'raise') {
      var to = Math.round(amount);
      if (!L.canRaise) throw new Error('레이즈할 수 없습니다');
      if (to > L.maxTo) to = L.maxTo;
      if (to <= h.currentBet) throw new Error('현재 베팅보다 커야 합니다');
      if (to < L.fullMinTo && to !== L.maxTo) throw new Error('최소 레이즈는 ' + L.fullMinTo + ' 입니다');
      var wasBet = h.currentBet === 0;
      var raiseBy = to - h.currentBet;
      put(s, to - s.street);
      if (raiseBy >= h.minRaise) h.minRaise = raiseBy;   // 불완전 올인은 최소 레이즈 단위를 바꾸지 않음
      h.currentBet = to;
      entry.type = wasBet ? 'bet' : 'raise';
      entry.amount = to;
    } else {
      throw new Error('알 수 없는 행동: ' + type);
    }

    if (s.allIn && !s.folded) entry.allIn = true;
    s.acted = true;
    s.matched = s.street;
    log(h, entry);

    var next = pendingActor(h, idx + 1);
    if (next) h.actorId = next;
    else closeRound(h);
    return h;
  }

  // 아무도 받지 않은 베팅(언콜드 벳)은 돌려준다
  function returnUncalled(h) {
    var list = seatList(h);
    var top = null;
    list.forEach(function (s) { if (!top || s.street > top.street) top = s; });
    if (!top) return;
    var second = 0;
    list.forEach(function (s) { if (s !== top && s.street > second) second = s.street; });
    var diff = top.street - second;
    if (diff > 0) {
      top.stack += diff; top.street -= diff; top.total -= diff;
      if (top.stack > 0) top.allIn = false;
      log(h, { id: top.id, type: 'return', amount: diff });
    }
  }

  function closeRound(h) {
    h.actorId = null;
    returnUncalled(h);
    seatList(h).forEach(function (s) { s.street = 0; s.acted = false; s.matched = 0; });
    h.currentBet = 0;
    h.minRaise = h.bb;

    var live = liveSeats(h);
    if (live.length === 1) return finishUncontested(h, live[0].id);
    if (h.street >= 3) return startShowdown(h);

    h.street++;
    var di = h.ring.indexOf(h.dealerId);
    var next = pendingActor(h, di + 1);
    if (next) { h.actorId = next; return; }
    // 더 베팅할 사람이 없음 → 리버까지 그냥 진행
    h.runout = true;
    closeRound(h);
  }

  /**
   * 사이드팟 계산. collectedOnly=true 이면 이번 스트릿 베팅 전(가운데로 모인 칩) 기준.
   * 반환: { pots: [{ amount, eligible:[ids] }], refunds: { id: amount } }
   */
  function computePots(h, collectedOnly) {
    var amt = {};
    h.ring.forEach(function (id) {
      var s = h.seats[id];
      amt[id] = collectedOnly ? s.total - s.street : s.total;
    });
    var pots = [];
    for (;;) {
      var live = h.ring.filter(function (id) { return !h.seats[id].folded && amt[id] > 0; });
      if (!live.length) break;
      var m = Math.min.apply(null, live.map(function (id) { return amt[id]; }));
      var amount = 0;
      h.ring.forEach(function (id) {
        var t = Math.min(amt[id], m);
        amount += t; amt[id] -= t;
      });
      pots.push({ amount: amount, eligible: live });
    }
    // 살아있는 사람이 아무도 맞추지 못한 폴드 칩 → 본인에게 반환
    var refunds = {};
    h.ring.forEach(function (id) { if (amt[id] > 0) refunds[id] = amt[id]; });
    return { pots: pots, refunds: refunds };
  }

  function startShowdown(h) {
    h.phase = 'showdown';
    h.street = 3;
    var r = computePots(h, false);
    h.pots = r.pots;
    h.refunds = r.refunds;
  }

  function finishUncontested(h, winnerId) {
    var r = computePots(h, false);
    h.pots = r.pots;
    h.refunds = r.refunds;
    h.uncontested = true;
    settle(h, r.pots.map(function () { return [winnerId]; }));
  }

  // 딜러 왼쪽부터 시계방향 순서 (남는 칩은 이 순서대로)
  function clockwiseFromButton(h) {
    var n = h.ring.length, di = h.ring.indexOf(h.dealerId), out = [];
    for (var k = 1; k <= n; k++) out.push(h.ring[(di + k) % n]);
    return out;
  }

  /** winnersPerPot: [[id, ...], ...]  (h.pots 순서와 동일) */
  function settle(h, winnersPerPot) {
    if (!h.pots) throw new Error('팟 정보가 없습니다');
    var order = clockwiseFromButton(h);
    var payouts = {};
    h.pots.forEach(function (pot, i) {
      var chosen = (winnersPerPot[i] || []).filter(function (id) { return pot.eligible.indexOf(id) >= 0; });
      if (!chosen.length) throw new Error((i === 0 ? '메인팟' : '사이드팟 ' + i) + ' 승자를 선택하세요');
      var winners = order.filter(function (id) { return chosen.indexOf(id) >= 0; });
      var unit = h.unit;
      var units = Math.floor(pot.amount / unit);
      var rest = pot.amount - units * unit;
      var base = Math.floor(units / winners.length);
      var extra = units - base * winners.length;
      winners.forEach(function (id, j) {
        var won = base * unit + (j < extra ? unit : 0) + (j === 0 ? rest : 0);
        payouts[id] = (payouts[id] || 0) + won;
      });
      pot.winners = winners;
    });
    h.payouts = payouts;
    h.final = {};
    h.ring.forEach(function (id) {
      h.final[id] = h.seats[id].stack + (payouts[id] || 0) + (h.refunds[id] || 0);
    });
    h.phase = 'done';
    h.actorId = null;
    return h;
  }

  var Engine = {
    STREETS: STREETS,
    newHand: newHand,
    legal: legal,
    act: act,
    computePots: computePots,
    settle: settle,
    potTotal: potTotal,
    liveSeats: liveSeats,
    gcd: gcd
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else root.Engine = Engine;
})(this);
