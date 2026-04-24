(function () {
  'use strict';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var N    = 48;
  var ITER = 10;
  var VIS  = 0.00006;    // viscosity
  var DIFF = 0.0000005;  // near-zero diffusion keeps blobs sharp until mixed
  var DT   = 0.12;
  var VDAMP = 0.991;     // velocity fades quickly — motion stops when mouse stops
  var CDAMP = 0.9994;    // colors linger long after being mixed
  var FORCE = 10;        // mixing force from mouse
  var BLOB_R = 8;        // blob radius in grid cells
  var SZ = (N + 2) * (N + 2);

  function IX(i, j) { return i + (N + 2) * j; }

  function setBnd(b, x) {
    for (var i = 1; i <= N; i++) {
      x[IX(0, i)]   = b === 1 ? -x[IX(1, i)]   : x[IX(1, i)];
      x[IX(N+1, i)] = b === 1 ? -x[IX(N, i)]   : x[IX(N, i)];
      x[IX(i, 0)]   = b === 2 ? -x[IX(i, 1)]   : x[IX(i, 1)];
      x[IX(i, N+1)] = b === 2 ? -x[IX(i, N)]   : x[IX(i, N)];
    }
    x[IX(0, 0)]     = 0.5*(x[IX(1,0)]   + x[IX(0,1)]);
    x[IX(0, N+1)]   = 0.5*(x[IX(1,N+1)] + x[IX(0,N)]);
    x[IX(N+1, 0)]   = 0.5*(x[IX(N,0)]   + x[IX(N+1,1)]);
    x[IX(N+1, N+1)] = 0.5*(x[IX(N,N+1)] + x[IX(N+1,N)]);
  }

  function linSolve(b, x, x0, a, c) {
    for (var k = 0; k < ITER; k++) {
      for (var j = 1; j <= N; j++)
        for (var i = 1; i <= N; i++)
          x[IX(i,j)] = (x0[IX(i,j)] + a*(x[IX(i-1,j)]+x[IX(i+1,j)]+x[IX(i,j-1)]+x[IX(i,j+1)])) / c;
      setBnd(b, x);
    }
  }

  function diffuse(b, x, x0, diff, dt) {
    var a = dt * diff * N * N;
    linSolve(b, x, x0, a, 1 + 4 * a);
  }

  function advect(b, d, d0, u, v, dt) {
    var dt0 = dt * N;
    for (var j = 1; j <= N; j++) {
      for (var i = 1; i <= N; i++) {
        var x = i - dt0 * u[IX(i,j)];
        var y = j - dt0 * v[IX(i,j)];
        x = Math.max(0.5, Math.min(N+0.5, x));
        y = Math.max(0.5, Math.min(N+0.5, y));
        var i0 = Math.floor(x), i1 = i0+1, j0 = Math.floor(y), j1 = j0+1;
        var s1 = x-i0, s0 = 1-s1, t1 = y-j0, t0 = 1-t1;
        d[IX(i,j)] = s0*(t0*d0[IX(i0,j0)] + t1*d0[IX(i0,j1)]) +
                     s1*(t0*d0[IX(i1,j0)] + t1*d0[IX(i1,j1)]);
      }
    }
    setBnd(b, d);
  }

  function project(u, v, p, div) {
    var h = 1/N;
    for (var j = 1; j <= N; j++)
      for (var i = 1; i <= N; i++) {
        div[IX(i,j)] = -0.5*h*(u[IX(i+1,j)]-u[IX(i-1,j)] + v[IX(i,j+1)]-v[IX(i,j-1)]);
        p[IX(i,j)] = 0;
      }
    setBnd(0, div); setBnd(0, p);
    linSolve(0, p, div, 1, 4);
    for (var j = 1; j <= N; j++)
      for (var i = 1; i <= N; i++) {
        u[IX(i,j)] -= 0.5*(p[IX(i+1,j)]-p[IX(i-1,j)])/h;
        v[IX(i,j)] -= 0.5*(p[IX(i,j+1)]-p[IX(i,j-1)])/h;
      }
    setBnd(1, u); setBnd(2, v);
  }

  function rainbowRgb(h) {
    var a = 0.22, L = 0.66;
    function ch(n) { var k = (n + h*12)%12; return L - a*Math.max(-1, Math.min(k-3, 9-k, 1)); }
    return [ch(0), ch(8), ch(4)];
  }

  // Gaussian paint blob — injects a soft circular splat of one hue, no velocity
  function injectBlob(f, cx, cy, hue) {
    var rgb = rainbowRgb(hue);
    var r2  = BLOB_R * BLOB_R;
    var sig = BLOB_R * BLOB_R * 0.45;
    for (var dj = -BLOB_R; dj <= BLOB_R; dj++) {
      for (var di = -BLOB_R; di <= BLOB_R; di++) {
        if (di*di + dj*dj > r2) continue;
        var w  = Math.exp(-(di*di + dj*dj) / sig);
        var ni = Math.max(1, Math.min(N, cx+di));
        var nj = Math.max(1, Math.min(N, cy+dj));
        f.r[IX(ni,nj)] = Math.min(1, f.r[IX(ni,nj)] + rgb[0] * w * 1.6);
        f.g[IX(ni,nj)] = Math.min(1, f.g[IX(ni,nj)] + rgb[1] * w * 1.6);
        f.b[IX(ni,nj)] = Math.min(1, f.b[IX(ni,nj)] + rgb[2] * w * 1.6);
      }
    }
  }

  // Inject all six blobs at once — CSS opacity transition handles the fade-in
  function placeBlobsFor(sim) {
    var hOff = Math.random();
    var zones = [
      [0.25, 0.30], [0.55, 0.22], [0.80, 0.34],
      [0.22, 0.72], [0.54, 0.78], [0.80, 0.65]
    ];
    var pad = BLOB_R + 2;
    for (var k = 0; k < zones.length; k++) {
      var zx = zones[k][0] + (Math.random()-0.5)*0.14;
      var zy = zones[k][1] + (Math.random()-0.5)*0.22;
      injectBlob(
        sim.f,
        Math.max(pad, Math.min(N-pad, Math.round(zx * N))),
        Math.max(pad, Math.min(N-pad, Math.round(zy * N))),
        (hOff + k/6) % 1
      );
    }
  }

  function makeFluid() {
    return {
      vx:new Float32Array(SZ), vy:new Float32Array(SZ),
      vx0:new Float32Array(SZ), vy0:new Float32Array(SZ),
      r:new Float32Array(SZ), g:new Float32Array(SZ), b:new Float32Array(SZ),
      r0:new Float32Array(SZ), g0:new Float32Array(SZ), b0:new Float32Array(SZ)
    };
  }

  var sc  = document.createElement('canvas'); sc.width = N; sc.height = N;
  var sx  = sc.getContext('2d');
  var buf = sx.createImageData(N, N);
  var sims = [];
  var tick = 0;

  function clearSim(sim) {
    sim.f.r.fill(0);  sim.f.g.fill(0);  sim.f.b.fill(0);
    sim.f.r0.fill(0); sim.f.g0.fill(0); sim.f.b0.fill(0);
    sim.f.vx.fill(0); sim.f.vy.fill(0);
    sim.f.vx0.fill(0); sim.f.vy0.fill(0);
    if (sim.ctx && sim.cv.width && sim.cv.height) {
      sim.ctx.clearRect(0, 0, sim.cv.width, sim.cv.height);
    }
  }

  document.querySelectorAll('.card-link').forEach(function (el) {
    var f  = makeFluid();
    var cv = document.createElement('canvas');
    cv.style.cssText = [
      'position:absolute','inset:0','width:100%','height:100%',
      'z-index:0','opacity:0','transition:opacity 1.2s ease',
      'pointer-events:none','mix-blend-mode:screen'
    ].join(';');
    el.appendChild(cv);
    var ctx = cv.getContext('2d');

    var sim = {
      el:el, cv:cv, ctx:ctx, f:f,
      active:false, fadeOut:false,
      mx:-1, my:-1, pmx:-1, pmy:-1,
      fadeTimer:0, fadeFrame:0
    };

    el.addEventListener('mouseenter', function (e) {
      var rect = el.getBoundingClientRect();
      cv.width  = Math.round(rect.width);
      cv.height = Math.round(rect.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (sim.fadeTimer) {
        clearTimeout(sim.fadeTimer);
        sim.fadeTimer = 0;
      }
      if (sim.fadeFrame) {
        cancelAnimationFrame(sim.fadeFrame);
        sim.fadeFrame = 0;
      }
      sim.active  = true;
      sim.fadeOut = false;
      clearSim(sim);
      cv.style.transition = 'none';
      cv.style.opacity = '0';
      sim.mx  = (e.clientX - rect.left) / rect.width;
      sim.my  = (e.clientY - rect.top)  / rect.height;
      sim.pmx = sim.mx;
      sim.pmy = sim.my;
      placeBlobsFor(sim);
      cv.offsetWidth;
      cv.style.transition = 'opacity 1.2s ease';
      sim.fadeFrame = requestAnimationFrame(function () {
        sim.fadeFrame = 0;
        cv.style.opacity = '1';
      });
    });

    el.addEventListener('mousemove', function (e) {
      var rect = el.getBoundingClientRect();
      sim.pmx = sim.mx;
      sim.pmy = sim.my;
      sim.mx = (e.clientX - rect.left) / rect.width;
      sim.my = (e.clientY - rect.top)  / rect.height;
    });

    el.addEventListener('mouseleave', function () {
      if (sim.fadeFrame) {
        cancelAnimationFrame(sim.fadeFrame);
        sim.fadeFrame = 0;
      }
      sim.fadeOut = true;
      sim.mx = -1; sim.my = -1;
      cv.style.opacity = '0';
      sim.fadeTimer = setTimeout(function () {
        sim.fadeTimer = 0;
        if (!sim.fadeOut) return;
        sim.active  = false;
        sim.fadeOut = false;
        clearSim(sim);
      }, 700);
    });

    sims.push(sim);
  });

  function stepSim(sim) {
    var f = sim.f;

    // Mouse injects velocity only — skip entirely if cursor hasn't moved
    var rawDx = sim.mx - sim.pmx, rawDy = sim.my - sim.pmy;
    if (sim.mx >= 0 && sim.pmx >= 0 && rawDx*rawDx + rawDy*rawDy > 0.000025) {
      var gi  = Math.max(1, Math.min(N, Math.round(sim.mx * N)));
      var gj  = Math.max(1, Math.min(N, Math.round(sim.my * N)));
      var dvx = Math.max(-2.5, Math.min(2.5, rawDx * FORCE));
      var dvy = Math.max(-2.5, Math.min(2.5, rawDy * FORCE));
      // Gaussian velocity splat — wider brush = more painterly mixing
      for (var di = -2; di <= 2; di++) {
        for (var dj = -2; dj <= 2; dj++) {
          var w  = Math.exp(-(di*di + dj*dj) / 4.0);
          var ni = Math.max(1, Math.min(N, gi+di));
          var nj = Math.max(1, Math.min(N, gj+dj));
          f.vx[IX(ni,nj)] += dvx * w;
          f.vy[IX(ni,nj)] += dvy * w;
        }
      }
    }

    // Velocity step
    diffuse(1, f.vx0, f.vx, VIS, DT);
    diffuse(2, f.vy0, f.vy, VIS, DT);
    project(f.vx0, f.vy0, f.vx, f.vy);
    advect(1, f.vx, f.vx0, f.vx0, f.vy0, DT);
    advect(2, f.vy, f.vy0, f.vx0, f.vy0, DT);
    project(f.vx, f.vy, f.vx0, f.vy0);

    // Dye step
    diffuse(0, f.r0, f.r, DIFF, DT); advect(0, f.r, f.r0, f.vx, f.vy, DT);
    diffuse(0, f.g0, f.g, DIFF, DT); advect(0, f.g, f.g0, f.vx, f.vy, DT);
    diffuse(0, f.b0, f.b, DIFF, DT); advect(0, f.b, f.b0, f.vx, f.vy, DT);

    // Decay + edge sponge — cells near the wall lose color faster so paint
    // can't pile up at boundaries and eventually drain off the card
    var SPONGE = 5; // cell-width of the absorbing border
    for (var ej = 1; ej <= N; ej++) {
      for (var ei = 1; ei <= N; ei++) {
        var edgeDist = Math.min(ei-1, ej-1, N-ei, N-ej); // 0 at wall, grows inward
        var cdamp = edgeDist < SPONGE
          ? CDAMP * (0.88 + 0.12 * edgeDist / SPONGE)  // near edge: decays faster
          : CDAMP;
        var id = IX(ei, ej);
        f.vx[id] *= VDAMP; f.vy[id] *= VDAMP;
        f.r[id] = Math.min(1, f.r[id] * cdamp);
        f.g[id] = Math.min(1, f.g[id] * cdamp);
        f.b[id] = Math.min(1, f.b[id] * cdamp);
      }
    }
  }

  function renderSim(sim) {
    var f = sim.f, d = buf.data;
    for (var j = 0; j < N; j++) {
      for (var i = 0; i < N; i++) {
        var ri = f.r[IX(i+1, j+1)];
        var gi = f.g[IX(i+1, j+1)];
        var bi = f.b[IX(i+1, j+1)];
        var p  = (j*N + i)*4;
        var rg = Math.sqrt(ri), gg = Math.sqrt(gi), bg = Math.sqrt(bi);
        d[p]   = Math.min(255, rg*255);
        d[p+1] = Math.min(255, gg*255);
        d[p+2] = Math.min(255, bg*255);
        d[p+3] = Math.min(255, Math.max(rg,gg,bg)*245);
      }
    }
    sx.putImageData(buf, 0, 0);
    sim.ctx.clearRect(0, 0, sim.cv.width, sim.cv.height);
    sim.ctx.drawImage(sc, 0, 0, sim.cv.width, sim.cv.height);
  }

  function loop() {
    tick++;
    for (var i = 0; i < sims.length; i++) {
      if (sims[i].active) { stepSim(sims[i]); renderSim(sims[i]); }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
