(function () {
  'use strict';

  var canvas = document.createElement('canvas');
  canvas.style.cssText = [
    'position:absolute','top:0','left:0',
    'pointer-events:none','z-index:0'
  ].join(';');
  document.body.appendChild(canvas);
  document.body.style.position = 'relative';

  var ctx = canvas.getContext('2d');
  var pool = [];
  var hue  = Math.random();
  var INTRO = 90;

  function resize() {
    canvas.width  = document.documentElement.scrollWidth;
    canvas.height = document.documentElement.scrollHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function rainbowRgb(h) {
    var a = 0.48, L = 0.52;
    function ch(n) { var k = (n + h*12) % 12; return L - a*Math.max(-1, Math.min(k-3, 9-k, 1)); }
    return [Math.round(ch(0)*255), Math.round(ch(8)*255), Math.round(ch(4)*255)];
  }

  function addSplat(x, y, opts) {
    opts = opts || {};
    var huePin = opts.hue !== undefined ? opts.hue : -1;
    if (huePin >= 0) hue = huePin;
    else hue = (hue + 0.014 + Math.random()*0.018) % 1;

    var baseR    = opts.baseR    || 7;
    var lifetime = opts.lifetime || 2200;
    var maxAlpha = opts.alpha    !== undefined ? opts.alpha : 0.45;
    var vx = opts.vx || 0, vy = opts.vy || 0;
    var dirAng = Math.atan2(vy, vx);
    var rgb = rainbowRgb(hue);

    var blobs = [];
    for (var i = 0; i < 6 + Math.floor(Math.random()*5); i++) {
      var a = Math.random()*Math.PI*2, dd = Math.random()*baseR*.65;
      blobs.push({ x:x+Math.cos(a)*dd, y:y+Math.sin(a)*dd,
                   r:baseR*(.2+Math.random()*.5), delay:Math.random()*8 });
    }

    var drips = [];
    for (var i = 0; i < 1 + Math.floor(Math.random()*3); i++) {
      var a = dirAng + (Math.random()-.5)*Math.PI*2;
      var len = baseR*.4 + Math.random()*baseR*.9;
      var ox2 = Math.cos(a)*baseR*.55, oy2 = Math.sin(a)*baseR*.55;
      var w = .7 + Math.random()*baseR*.15;
      drips.push({ x1:x+ox2, y1:y+oy2, x2:x+ox2+Math.cos(a)*len, y2:y+oy2+Math.sin(a)*len,
                   w:w, curve:(Math.random()-.5)*w*2, delay:6+Math.random()*16 });
    }

    var dots = [];
    for (var i = 0; i < 12 + Math.floor(Math.random()*10); i++) {
      var a = Math.random()*Math.PI*2;
      var dist = baseR*.5 + Math.random()*baseR*1.7;
      var px = x+Math.cos(a)*dist, py = y+Math.sin(a)*dist;
      var ad = Math.sqrt((px-x)*(px-x)+(py-y)*(py-y));
      dots.push({ x:px, y:py, r:.4+Math.random()*1.5,
                  delay:Math.min(90,(ad/(baseR*4))*70+Math.random()*8) });
    }

    pool.push({ rgb:rgb, born:performance.now(), lifetime:lifetime,
                maxAlpha:maxAlpha, blobs:blobs, drips:drips, dots:dots });
  }

  function createLocalSplatterLayer(root) {
    var canvas = document.createElement('canvas');
    canvas.style.cssText = [
      'position:absolute','top:0','left:0','width:100%','height:100%',
      'pointer-events:none','z-index:0'
    ].join(';');
    root.insertBefore(canvas, root.firstChild);

    var ctx = canvas.getContext('2d');
    var pool = [];
    var hueLocal = Math.random();
    var intro = 90;
    var painting = false;
    var activePointerId = null;
    var lastX = 0, lastY = 0;
    var minDist = 9;
    var maxPool = 350;

    function resize() {
      canvas.width = Math.max(1, root.clientWidth);
      canvas.height = Math.max(1, root.clientHeight);
    }

    function localAddSplat(x, y, opts) {
      opts = opts || {};
      var huePin = opts.hue !== undefined ? opts.hue : -1;
      if (huePin >= 0) hueLocal = huePin;
      else hueLocal = (hueLocal + 0.014 + Math.random()*0.018) % 1;
      var baseR = opts.baseR || 7;
      var lifetime = opts.lifetime || 2200;
      var maxAlpha = opts.alpha !== undefined ? opts.alpha : 0.45;
      var vx = opts.vx || 0, vy = opts.vy || 0;
      var dirAng = Math.atan2(vy, vx);
      var rgb = rainbowRgb(hueLocal);
      var blobs = [], drips = [], dots = [];
      var i, a, dd, len, ox2, oy2, w, dist, px, py, ad;
      for (i = 0; i < 6 + Math.floor(Math.random()*5); i++) {
        a = Math.random()*Math.PI*2; dd = Math.random()*baseR*.65;
        blobs.push({ x:x+Math.cos(a)*dd, y:y+Math.sin(a)*dd, r:baseR*(.2+Math.random()*.5), delay:Math.random()*8 });
      }
      for (i = 0; i < 1 + Math.floor(Math.random()*3); i++) {
        a = dirAng + (Math.random()-.5)*Math.PI*2;
        len = baseR*.4 + Math.random()*baseR*.9;
        ox2 = Math.cos(a)*baseR*.55; oy2 = Math.sin(a)*baseR*.55;
        w = .7 + Math.random()*baseR*.15;
        drips.push({ x1:x+ox2, y1:y+oy2, x2:x+ox2+Math.cos(a)*len, y2:y+oy2+Math.sin(a)*len, w:w, curve:(Math.random()-.5)*w*2, delay:6+Math.random()*16 });
      }
      for (i = 0; i < 12 + Math.floor(Math.random()*10); i++) {
        a = Math.random()*Math.PI*2;
        dist = baseR*.5 + Math.random()*baseR*1.7;
        px = x+Math.cos(a)*dist; py = y+Math.sin(a)*dist;
        ad = Math.sqrt((px-x)*(px-x)+(py-y)*(py-y));
        dots.push({ x:px, y:py, r:.4+Math.random()*1.5, delay:Math.min(90,(ad/(baseR*4))*70+Math.random()*8) });
      }
      pool.push({ rgb:rgb, born:performance.now(), lifetime:lifetime, maxAlpha:maxAlpha, blobs:blobs, drips:drips, dots:dots });
    }

    function drawLocalDrip(dr) {
      var dx=dr.x2-dr.x1, dy=dr.y2-dr.y1, len=Math.sqrt(dx*dx+dy*dy);
      if (len < 1) return;
      var nx=-dy/len, ny=dx/len, h2=dr.w*.5;
      var mx=(dr.x1+dr.x2)*.5+nx*dr.curve, my=(dr.y1+dr.y2)*.5+ny*dr.curve;
      ctx.beginPath();
      ctx.moveTo(dr.x1+nx*h2, dr.y1+ny*h2);
      ctx.quadraticCurveTo(mx+nx*h2*.3, my+ny*h2*.3, dr.x2, dr.y2);
      ctx.quadraticCurveTo(mx-nx*h2*.3, my-ny*h2*.3, dr.x1-nx*h2, dr.y1-ny*h2);
      ctx.closePath(); ctx.fill();
    }

    function drawLocalSplatter(s, now) {
      var age = now - s.born, t = age / s.lifetime;
      if (t >= 1) return false;
      var sa = (t < 0.6 ? 1 : 1-(t-.6)/.4) * s.maxAlpha;
      ctx.fillStyle = 'rgb('+s.rgb[0]+','+s.rgb[1]+','+s.rgb[2]+')';
      var i, el, ea;
      for (i=0;i<s.blobs.length;i++){ el=s.blobs[i]; ea=age-el.delay; if(ea<0)continue; ctx.globalAlpha=Math.min(1,ea/intro)*sa; ctx.beginPath(); ctx.arc(el.x,el.y,el.r,0,Math.PI*2); ctx.fill(); }
      for (i=0;i<s.drips.length;i++){ el=s.drips[i]; ea=age-el.delay; if(ea<0)continue; ctx.globalAlpha=Math.min(1,ea/intro)*sa; drawLocalDrip(el); }
      for (i=0;i<s.dots.length;i++){ el=s.dots[i]; ea=age-el.delay; if(ea<0)continue; ctx.globalAlpha=Math.min(1,ea/intro)*sa; ctx.beginPath(); ctx.arc(el.x,el.y,el.r,0,Math.PI*2); ctx.fill(); }
      ctx.globalAlpha = 1;
      return true;
    }

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var now = performance.now();
      pool = pool.filter(function(s){ return drawLocalSplatter(s, now); });
      requestAnimationFrame(loop);
    }

    resize();
    requestAnimationFrame(loop);
    window.addEventListener('resize', resize);

    function posInRoot(e) {
      var r = root.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom };
    }

    root.addEventListener('pointerenter', function (e) {
      painting = true;
      root.style.userSelect = 'none';
      var p = posInRoot(e);
      lastX = p.x;
      lastY = p.y;
    });
    root.addEventListener('pointerleave', function () {
      painting = false;
      activePointerId = null;
      root.style.userSelect = '';
    });
    root.addEventListener('pointerdown', function (e) {
      activePointerId = e.pointerId;
      var p = posInRoot(e);
      lastX = p.x; lastY = p.y;
    });
    root.addEventListener('pointerup', function () {
      activePointerId = null;
    });
    root.addEventListener('pointermove', function (e) {
      var shouldPaint = painting || activePointerId === e.pointerId;
      if (!shouldPaint) return;
      if (pool.length >= maxPool) return;
      var p = posInRoot(e);
      if (!p.inside) return;
      var dx = p.x - lastX, dy = p.y - lastY;
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < minDist) return;
      var speed = Math.min(dist, 80);
      var baseR = 2.5 + speed * 0.18 + Math.random() * 3;
      hueLocal = (hueLocal + 0.000375 + Math.random() * 0.0005) % 1;
      localAddSplat(p.x, p.y, { baseR: baseR, lifetime: 6000 + Math.random() * 8000, alpha: 0.5, vx: dx, vy: dy });
      lastX = p.x; lastY = p.y;
    });
  }

  function drawDrip(dr) {
    var dx=dr.x2-dr.x1, dy=dr.y2-dr.y1, len=Math.sqrt(dx*dx+dy*dy);
    if (len < 1) return;
    var nx=-dy/len, ny=dx/len, h2=dr.w*.5;
    var mx=(dr.x1+dr.x2)*.5+nx*dr.curve, my=(dr.y1+dr.y2)*.5+ny*dr.curve;
    ctx.beginPath();
    ctx.moveTo(dr.x1+nx*h2, dr.y1+ny*h2);
    ctx.quadraticCurveTo(mx+nx*h2*.3, my+ny*h2*.3, dr.x2, dr.y2);
    ctx.quadraticCurveTo(mx-nx*h2*.3, my-ny*h2*.3, dr.x1-nx*h2, dr.y1-ny*h2);
    ctx.closePath(); ctx.fill();
  }

  function drawSplatter(s, now) {
    var age = now - s.born, t = age / s.lifetime;
    if (t >= 1) return false;
    var sa = (t < 0.6 ? 1 : 1-(t-.6)/.4) * s.maxAlpha;
    ctx.fillStyle = 'rgb('+s.rgb[0]+','+s.rgb[1]+','+s.rgb[2]+')';
    var i, el, ea;
    for (i=0;i<s.blobs.length;i++){
      el=s.blobs[i]; ea=age-el.delay; if(ea<0)continue;
      ctx.globalAlpha=Math.min(1,ea/INTRO)*sa;
      ctx.beginPath(); ctx.arc(el.x,el.y,el.r,0,Math.PI*2); ctx.fill();
    }
    for (i=0;i<s.drips.length;i++){
      el=s.drips[i]; ea=age-el.delay; if(ea<0)continue;
      ctx.globalAlpha=Math.min(1,ea/INTRO)*sa; drawDrip(el);
    }
    for (i=0;i<s.dots.length;i++){
      el=s.dots[i]; ea=age-el.delay; if(ea<0)continue;
      ctx.globalAlpha=Math.min(1,ea/INTRO)*sa;
      ctx.beginPath(); ctx.arc(el.x,el.y,el.r,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    return true;
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var now = performance.now();
    pool = pool.filter(function(s){ return drawSplatter(s, now); });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ── Paint-on-mousedown cursor trail ──
  var painting  = false;
  var lastX     = 0, lastY = 0;
  var MIN_DIST  = 9;
  var MAX_POOL  = 350;

  document.addEventListener('mousedown', function(e) {
    painting = true;
    lastX = e.pageX; lastY = e.pageY;
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mouseup', function() {
    painting = false;
    document.body.style.userSelect = '';
  });
  document.addEventListener('mouseleave', function() {
    painting = false;
    document.body.style.userSelect = '';
  });

  document.addEventListener('mousemove', function(e) {
    if (!painting) return;
    if (pool.length >= MAX_POOL) return;
    var dx = e.pageX - lastX, dy = e.pageY - lastY;
    var dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < MIN_DIST) return;
    var speed  = Math.min(dist, 80);
    var baseR  = 2.5 + speed * 0.18 + Math.random() * 3;
    hue = (hue + 0.000375 + Math.random() * 0.0005) % 1;
    addSplat(e.pageX, e.pageY, {
      baseR:    baseR,
      lifetime: 6000 + Math.random() * 8000,
      alpha:    0.5,
      vx:       dx, vy: dy
    });
    lastX = e.pageX; lastY = e.pageY;
  });

  // Wire up all nav links with data-hue attributes
  document.querySelectorAll('nav a[data-hue]').forEach(function(link) {
    var lastSplat = -Infinity;
    link.addEventListener('mouseenter', function() {
      var now = performance.now();
      if (now - lastSplat < 2200) return;
      lastSplat = now;
      link.classList.add('splat-active');
      setTimeout(function() { link.classList.remove('splat-active'); }, 2200);

      var r   = link.getBoundingClientRect();
      var sx  = window.pageXOffset, sy = window.pageYOffset;
      var cols = Math.max(3, Math.ceil(r.width  / 18));
      var rows = Math.max(2, Math.ceil(r.height / 18));

      var pts = [];
      for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
          pts.push([
            sx + r.left + (col + .5 + (Math.random()-.5)*.8) * (r.width  / cols),
            sy + r.top  + (row + .5 + (Math.random()-.5)*.8) * (r.height / rows)
          ]);
        }
      }
      for (var i = pts.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = pts[i]; pts[i] = pts[j]; pts[j] = tmp;
      }

      var baseHue = parseFloat(link.dataset.hue);
      var FILL_MS = 250;
      pts.forEach(function(pt, idx) {
        setTimeout(function() {
          var pinned = (baseHue + (Math.random()-.5)*0.08 + 1) % 1;
          addSplat(pt[0], pt[1], { baseR:10+Math.random()*6, lifetime:2200, alpha:0.55, hue:pinned });
        }, (idx / pts.length) * FILL_MS);
      });
    });
  });

  document.querySelectorAll('.splat-hover-draw').forEach(function(root) {
    createLocalSplatterLayer(root);
  });

})();
