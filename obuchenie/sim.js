(function () {
  'use strict';

  var SAMPLE = [
    '(Sample pocket — educational G-code)',
    'G21 G90 G17',
    'G0 Z5',
    'G0 X0 Y0',
    'M3 S12000',
    'G1 Z-1 F200',
    'G1 X40 F600',
    'G1 Y25',
    'G1 X0',
    'G1 Y0',
    'G1 X20 Y12.5',
    'G0 Z5',
    'G0 X10 Y10',
    'G1 Z-1 F200',
    'G2 X30 Y10 I10 J0 F400',
    'G2 X10 Y10 I-10 J0',
    'G0 Z5',
    'M5',
    'G0 X0 Y0',
    'M30'
  ].join('\n');

  var state = {
    x: 0, y: 0, z: 0,
    abs: true,
    unit: 1,
    feed: 300,
    spindle: 0,
    running: false,
    hold: false,
    reset: false,
    i: 0,
    segs: [],
    t: 0
  };

  var canvas, ctx, codeEl, mdiEl, statusEl;
  var droX, droY, droZ, droF, droS;

  function $(id) { return document.getElementById(id); }

  function parseLine(line, cur) {
    var src = line.replace(/\(.*?\)/g, '').replace(/;.*$/, '').trim().toUpperCase();
    if (!src) return null;
    var tokens = src.match(/[A-Z]-?\d*\.?\d+/g);
    if (!tokens) return null;
    var cmd = { g: null, m: null, x: null, y: null, z: null, i: null, j: null, f: null, s: null, raw: src };
    for (var k = 0; k < tokens.length; k++) {
      var letter = tokens[k][0];
      var num = parseFloat(tokens[k].slice(1));
      if (letter === 'G') cmd.g = num;
      else if (letter === 'M') cmd.m = num;
      else if (letter === 'X') cmd.x = num;
      else if (letter === 'Y') cmd.y = num;
      else if (letter === 'Z') cmd.z = num;
      else if (letter === 'I') cmd.i = num;
      else if (letter === 'J') cmd.j = num;
      else if (letter === 'F') cmd.f = num;
      else if (letter === 'S') cmd.s = num;
    }
    return cmd;
  }

  function target(cmd, cur) {
    var nx = cur.x, ny = cur.y, nz = cur.z;
    if (cmd.x != null) nx = cur.abs ? cmd.x : cur.x + cmd.x;
    if (cmd.y != null) ny = cur.abs ? cmd.y : cur.y + cmd.y;
    if (cmd.z != null) nz = cur.abs ? cmd.z : cur.z + cmd.z;
    return { x: nx, y: ny, z: nz };
  }

  function arcPoints(cx, cy, x0, y0, x1, y1, cw) {
    var a0 = Math.atan2(y0 - cy, x0 - cx);
    var a1 = Math.atan2(y1 - cy, x1 - cx);
    var r = Math.hypot(x0 - cx, y0 - cy);
    if (r < 1e-6) return [{ x: x1, y: y1 }];
    var da = a1 - a0;
    if (cw) {
      if (da >= 0) da -= Math.PI * 2;
    } else {
      if (da <= 0) da += Math.PI * 2;
    }
    var n = Math.max(8, Math.ceil(Math.abs(da) * r / 2));
    var pts = [];
    for (var i = 1; i <= n; i++) {
      var a = a0 + da * (i / n);
      pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
    return pts;
  }

  function buildSegments(text) {
    var lines = String(text || '').split(/\r?\n/);
    var cur = { x: 0, y: 0, z: 0, abs: true, feed: 300, spindle: 0 };
    var segs = [];
    for (var li = 0; li < lines.length; li++) {
      var cmd = parseLine(lines[li], cur);
      if (!cmd) continue;
      if (cmd.g === 90) cur.abs = true;
      if (cmd.g === 91) cur.abs = false;
      if (cmd.f != null) cur.feed = cmd.f;
      if (cmd.s != null) cur.spindle = cmd.s;
      if (cmd.m === 3 || cmd.m === 4) cur.spindle = cmd.s != null ? cmd.s : (cur.spindle || 8000);
      if (cmd.m === 5) cur.spindle = 0;
      var t = target(cmd, cur);
      var g = cmd.g;
      if (g === 0 || g === 1 || g === 2 || g === 3) {
        var rapid = g === 0;
        if (g === 2 || g === 3) {
          var cx = cur.x + (cmd.i || 0);
          var cy = cur.y + (cmd.j || 0);
          var pts = arcPoints(cx, cy, cur.x, cur.y, t.x, t.y, g === 2);
          var px = cur.x, py = cur.y, pz = cur.z;
          for (var p = 0; p < pts.length; p++) {
            var zMid = cur.z + (t.z - cur.z) * ((p + 1) / pts.length);
            segs.push({ x0: px, y0: py, z0: pz, x1: pts[p].x, y1: pts[p].y, z1: zMid, rapid: false, feed: cur.feed, spindle: cur.spindle });
            px = pts[p].x; py = pts[p].y; pz = zMid;
          }
        } else {
          segs.push({ x0: cur.x, y0: cur.y, z0: cur.z, x1: t.x, y1: t.y, z1: t.z, rapid: rapid, feed: cur.feed, spindle: cur.spindle });
        }
        cur.x = t.x; cur.y = t.y; cur.z = t.z;
      } else if (cmd.x != null || cmd.y != null || cmd.z != null) {
        cur.x = t.x; cur.y = t.y; cur.z = t.z;
      }
    }
    return segs;
  }

  function bounds(segs) {
    var minX = 0, minY = 0, maxX = 1, maxY = 1;
    function acc(x, y) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    acc(0, 0);
    for (var i = 0; i < segs.length; i++) {
      acc(segs[i].x0, segs[i].y0);
      acc(segs[i].x1, segs[i].y1);
    }
    var pad = Math.max(4, (maxX - minX) * 0.12, (maxY - minY) * 0.12);
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  function toCanvas(b, x, y) {
    var w = canvas.width, h = canvas.height;
    var sx = w / (b.maxX - b.minX);
    var sy = h / (b.maxY - b.minY);
    var s = Math.min(sx, sy);
    var ox = (w - (b.maxX - b.minX) * s) / 2;
    var oy = (h - (b.maxY - b.minY) * s) / 2;
    return {
      x: ox + (x - b.minX) * s,
      y: h - (oy + (y - b.minY) * s)
    };
  }

  function draw() {
    var w = canvas.clientWidth || 640;
    var h = Math.max(360, Math.round(w * 0.7));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var segs = state.segs;
    var b = bounds(segs);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    var step = 10;
    for (var gx = Math.ceil(b.minX / step) * step; gx <= b.maxX; gx += step) {
      var a = toCanvas(b, gx, b.minY), c = toCanvas(b, gx, b.maxY);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
    }
    for (var gy = Math.ceil(b.minY / step) * step; gy <= b.maxY; gy += step) {
      var a2 = toCanvas(b, b.minX, gy), c2 = toCanvas(b, b.maxX, gy);
      ctx.beginPath(); ctx.moveTo(a2.x, a2.y); ctx.lineTo(c2.x, c2.y); ctx.stroke();
    }
    var origin = toCanvas(b, 0, 0);
    ctx.strokeStyle = '#ff6b6b';
    ctx.beginPath(); ctx.moveTo(origin.x - 8, origin.y); ctx.lineTo(origin.x + 8, origin.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(origin.x, origin.y - 8); ctx.lineTo(origin.x, origin.y + 8); ctx.stroke();

    var drawn = 0;
    var limit = state.running || state.i > 0 ? state.i : segs.length;
    for (var i = 0; i < limit && i < segs.length; i++) {
      var s = segs[i];
      var p0 = toCanvas(b, s.x0, s.y0);
      var p1 = toCanvas(b, s.x1, s.y1);
      if (i === state.i && state.running && !state.hold && state.t > 0 && state.t < 1) {
        p1 = toCanvas(b, s.x0 + (s.x1 - s.x0) * state.t, s.y0 + (s.y1 - s.y0) * state.t);
      }
      ctx.strokeStyle = s.rapid ? '#74c0fc' : '#69db7c';
      ctx.setLineDash(s.rapid ? [5, 4] : []);
      ctx.lineWidth = s.rapid ? 1.2 : 2;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      drawn++;
    }
    ctx.setLineDash([]);
    var tx = state.x, ty = state.y;
    var pt = toCanvas(b, tx, ty);
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function fmt(n) {
    return (Math.abs(n) < 1e-6 ? 0 : n).toFixed(3);
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function updateDro() {
    droX.textContent = fmt(state.x);
    droY.textContent = fmt(state.y);
    droZ.textContent = fmt(state.z);
    droF.textContent = String(Math.round(state.feed || 0));
    droS.textContent = String(Math.round(state.spindle || 0));
  }

  function loadProgram(text) {
    if (codeEl && text != null) codeEl.value = text;
    stop(true);
    state.segs = buildSegments(codeEl.value);
    state.x = 0; state.y = 0; state.z = 0;
    state.i = 0; state.t = 0;
    state.reset = false;
    updateDro();
    draw();
    setStatus('Idle. Program loaded: ' + state.segs.length + ' moves.');
  }

  function cycleStart() {
    if (state.reset) { setStatus('Reset is active. Press Reset to clear, then Cycle Start.'); return; }
    if (!state.segs.length) loadProgram(codeEl.value);
    if (!state.segs.length) { setStatus('No motion in this program.'); return; }
    state.hold = false;
    state.running = true;
    setStatus('Cycle Start — running.');
  }

  function feedHold() {
    if (!state.running) return;
    state.hold = !state.hold;
    setStatus(state.hold ? 'Feed Hold.' : 'Cycle resumed.');
  }

  function stop(silent) {
    state.running = false;
    state.hold = false;
    if (!silent) setStatus('Stop.');
  }

  function doReset() {
    stop(true);
    state.x = 0; state.y = 0; state.z = 0;
    state.i = 0; state.t = 0;
    state.reset = false;
    updateDro();
    draw();
    setStatus('Reset complete. Axes at zero. Ready.');
  }

  function runMdi() {
    var line = (mdiEl.value || '').trim();
    if (!line) return;
    var curCode = codeEl.value;
    var added = curCode + (curCode && !/\n$/.test(curCode) ? '\n' : '') + line + '\n';
    var wasLen = state.segs.length;
    loadProgram(added);
    state.i = wasLen;
    if (state.segs.length > wasLen) {
      var last = state.segs[state.segs.length - 1];
      state.x = last.x1; state.y = last.y1; state.z = last.z1;
      state.i = state.segs.length;
      updateDro();
      draw();
      setStatus('MDI done: ' + line);
    } else {
      setStatus('MDI: no motion in «' + line + '».');
    }
  }

  var lastTs = 0;
  function tick(ts) {
    requestAnimationFrame(tick);
    if (!lastTs) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (state.running && !state.hold && !state.reset && state.i < state.segs.length) {
      var s = state.segs[state.i];
      var dist = Math.hypot(s.x1 - s.x0, s.y1 - s.y0, s.z1 - s.z0);
      var speed = s.rapid ? 80 : Math.max(8, (s.feed || 300) / 20);
      var step = dist < 1e-6 ? 1 : (speed * dt) / dist;
      state.t += step;
      if (state.t >= 1) {
        state.x = s.x1; state.y = s.y1; state.z = s.z1;
        state.feed = s.feed; state.spindle = s.spindle;
        state.i += 1; state.t = 0;
        if (state.i >= state.segs.length) {
          state.running = false;
          setStatus('Program finished. Idle.');
        }
      } else {
        state.x = s.x0 + (s.x1 - s.x0) * state.t;
        state.y = s.y0 + (s.y1 - s.y0) * state.t;
        state.z = s.z0 + (s.z1 - s.z0) * state.t;
        state.feed = s.feed; state.spindle = s.spindle;
      }
      updateDro();
      draw();
    }
  }

  function init() {
    canvas = $('simCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    codeEl = $('simCode');
    mdiEl = $('simMdi');
    statusEl = $('simStatus');
    droX = $('droX'); droY = $('droY'); droZ = $('droZ'); droF = $('droF'); droS = $('droS');
    if (codeEl && !codeEl.value) codeEl.value = SAMPLE;
    $('btnCycle').addEventListener('click', cycleStart);
    $('btnHold').addEventListener('click', feedHold);
    $('btnStop').addEventListener('click', function () { stop(false); });
    $('btnReset').addEventListener('click', doReset);
    $('btnLoad').addEventListener('click', function () { loadProgram(codeEl.value); });
    $('btnSample').addEventListener('click', function () { loadProgram(SAMPLE); });
    $('btnMdi').addEventListener('click', runMdi);
    mdiEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); runMdi(); }
    });
    var file = $('simFile');
    if (file) file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { loadProgram(String(reader.result || '')); };
      reader.readAsText(f);
    });
    window.addEventListener('resize', draw);
    loadProgram(codeEl.value);
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
