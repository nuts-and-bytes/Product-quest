/* ============================================================
   assets/island3d.js — Product Quest × Geminisland 3D体素开放世界引擎 v2
   - 体素面剔除 + 四角 AO + 独立自发光通道 (日夜车灯/橱窗/路灯)
   - 真3D立体方块角色骨骼 (独立头部/躯干/四肢摆臂迈腿 + 3D眼镜与长短发)
   - 五视角系统：平移(Pan) / 环绕(Orbit) / 第三人称漫步(Walk) / 第一人称(FP) / 群岛全览
   - 丰富开放世界要素：中央喷泉、8座车流与斑马线、雪山瀑布、跨湖拱桥凉亭、
     码头帆船、旋转光束灯塔、热气球与云朵、樱花银杏树、散步路人、流萤与日夜光影
   ============================================================ */
(function () {
  'use strict';

  const HEX_CACHE = {};
  function hexToRgb(hex) {
    if (HEX_CACHE[hex]) return HEX_CACHE[hex];
    const clean = String(hex || '#ffffff').replace('#', '');
    const full = clean.length === 3
      ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
      : clean.padEnd(6, 'f');
    const n = parseInt(full, 16) || 0xffffff;
    const rgb = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    HEX_CACHE[hex] = rgb;
    return rgb;
  }

  /* ---------- 体素网格构建器 (面剔除 + 四角顶点AO) ---------- */
  const FACES = [
    { dir: [ 1, 0, 0], shade: 0.92, corners: [[1,0,1],[1,0,0],[1,1,0],[1,1,1]], u: [0,0,-1], v: [0,1,0] }, // +X
    { dir: [-1, 0, 0], shade: 0.86, corners: [[0,0,0],[0,0,1],[0,1,1],[0,1,0]], u: [0,0,1],  v: [0,1,0] }, // -X
    { dir: [ 0, 1, 0], shade: 1.04, corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], u: [1,0,0],  v: [0,0,-1] }, // +Y
    { dir: [ 0,-1, 0], shade: 0.68, corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], u: [1,0,0],  v: [0,0,1] },  // -Y
    { dir: [ 0, 0, 1], shade: 0.98, corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]], u: [1,0,0],  v: [0,1,0] },  // +Z
    { dir: [ 0, 0,-1], shade: 0.83, corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]], u: [-1,0,0], v: [0,1,0] }   // -Z
  ];
  const AO_CURVE = [1.0, 0.90, 0.82, 0.74];

  class VoxelGrid {
    constructor() {
      this.map = new Map();
    }
    set(x, y, z, color) {
      if (!color) return;
      const rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
      this.map.set(rx + ',' + ry + ',' + rz, { x: rx, y: ry, z: rz, c: hexToRgb(color) });
    }
    del(x, y, z) {
      this.map.delete(Math.round(x) + ',' + Math.round(y) + ',' + Math.round(z));
    }
    has(x, y, z) {
      return this.map.has((x | 0) + ',' + (y | 0) + ',' + (z | 0));
    }
    fillBox(x0, y0, z0, x1, y1, z1, colorOrFn) {
      const minX = Math.min(x0, x1) | 0, maxX = Math.max(x0, x1) | 0;
      const minY = Math.min(y0, y1) | 0, maxY = Math.max(y0, y1) | 0;
      const minZ = Math.min(z0, z1) | 0, maxZ = Math.max(z0, z1) | 0;
      const isFn = typeof colorOrFn === 'function';
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          for (let z = minZ; z <= maxZ; z++) {
            const col = isFn ? colorOrFn(x, y, z) : colorOrFn;
            if (col) this.set(x, y, z, col);
          }
        }
      }
    }
    buildGeometry(unit, origin, skipAO) {
      unit = unit || 1;
      const ox = (origin && origin[0]) || 0;
      const oy = (origin && origin[1]) || 0;
      const oz = (origin && origin[2]) || 0;
      const pos = [];
      const norm = [];
      const col = [];
      const idx = [];
      let vCount = 0;

      this.map.forEach((v) => {
        const vx = v.x, vy = v.y, vz = v.z;
        const baseR = v.c[0], baseG = v.c[1], baseB = v.c[2];
        for (let f = 0; f < 6; f++) {
          const fc = FACES[f];
          const nx = vx + fc.dir[0], ny = vy + fc.dir[1], nz = vz + fc.dir[2];
          if (this.has(nx, ny, nz)) continue;

          const aos = [];
          for (let ci = 0; ci < 4; ci++) {
            const c = fc.corners[ci];
            let ao = 1.0;
            if (!skipAO) {
              const du = (c[0] - 0.5) * fc.u[0] + (c[1] - 0.5) * fc.u[1] + (c[2] - 0.5) * fc.u[2];
              const dv = (c[0] - 0.5) * fc.v[0] + (c[1] - 0.5) * fc.v[1] + (c[2] - 0.5) * fc.v[2];
              const stepU = du >= 0 ? 1 : -1;
              const stepV = dv >= 0 ? 1 : -1;
              const s1 = this.has(nx + fc.u[0] * stepU, ny + fc.u[1] * stepU, nz + fc.u[2] * stepU) ? 1 : 0;
              const s2 = this.has(nx + fc.v[0] * stepV, ny + fc.v[1] * stepV, nz + fc.v[2] * stepV) ? 1 : 0;
              const cr = this.has(
                nx + fc.u[0] * stepU + fc.v[0] * stepV,
                ny + fc.u[1] * stepU + fc.v[1] * stepV,
                nz + fc.u[2] * stepU + fc.v[2] * stepV
              ) ? 1 : 0;
              const occ = (s1 && s2) ? 3 : (s1 + s2 + cr);
              ao = AO_CURVE[occ];
            }
            aos.push(ao);

            pos.push((vx + c[0] + ox) * unit, (vy + c[1] + oy) * unit, (vz + c[2] + oz) * unit);
            norm.push(fc.dir[0], fc.dir[1], fc.dir[2]);
            const k = skipAO ? 1.0 : fc.shade * ao;
            col.push(Math.min(1, baseR * k), Math.min(1, baseG * k), Math.min(1, baseB * k));
          }

          if (aos[0] + aos[2] > aos[1] + aos[3]) {
            idx.push(vCount, vCount + 1, vCount + 2, vCount, vCount + 2, vCount + 3);
          } else {
            idx.push(vCount + 1, vCount + 2, vCount + 3, vCount + 1, vCount + 3, vCount);
          }
          vCount += 4;
        }
      });

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.setIndex(idx);
      geo.computeBoundingSphere();
      return geo;
    }
  }

  function makeVoxelMesh(grid, unit, origin, matOrOpts, skipAO) {
    const geo = grid.buildGeometry(unit, origin, skipAO);
    const mat = (matOrOpts && matOrOpts.isMaterial)
      ? matOrOpts
      : new THREE.MeshStandardMaterial(Object.assign({
          vertexColors: true, roughness: 0.85, metalness: 0.04
        }, matOrOpts || {}));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = !skipAO;
    mesh.receiveShadow = true;
    return mesh;
  }

  function hash2(x, z) {
    const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
    return n - Math.floor(n);
  }

  /* ---------- 高明度糖果色系 + 粘土人/蛋仔风 3D 可爱角色系统 ---------- */
  const TOY_MAT_CACHE = new Map();
  function getToyMat(color, opts) {
    opts = opts || {};
    const rough = opts.roughness !== undefined ? opts.roughness : 0.36;
    const metal = opts.metalness !== undefined ? opts.metalness : 0.02;
    const op = opts.opacity !== undefined ? opts.opacity : 1;
    const em = opts.emissive !== undefined ? opts.emissive : 0.42;
    const key = `${color}|${rough}|${metal}|${op}|${em}`;
    let m = TOY_MAT_CACHE.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color,
        roughness: rough,
        metalness: metal,
        emissive: new THREE.Color(color),
        emissiveIntensity: em,
        transparent: op < 1,
        opacity: op
      });
      TOY_MAT_CACHE.set(key, m);
    }
    return m;
  }

  function shadeHex(hex, delta) {
    const c = hexToRgb(hex);
    const k = (v) => Math.max(0, Math.min(255, Math.round(v * 255 + delta * 255)));
    return '#' + [k(c[0]), k(c[1]), k(c[2])].map((n) => n.toString(16).padStart(2, '0')).join('');
  }

  const FACE_TEX_CACHE = new Map();
  function getKawaiiFaceTexture(prof, opts) {
    const gl = normalizeGlasses(prof.glasses);
    const sig = `${prof.skin}|${prof.hair}|${prof.eyeColor}|${prof.brow || ''}|${gl}|${opts.blink ? 1 : 0}|${opts.mouthOpen ? 1 : 0}`;
    if (FACE_TEX_CACHE.has(sig)) return FACE_TEX_CACHE.get(sig);

    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 512;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = prof.skin || '#fff1e6';
    ctx.fillRect(0, 0, 512, 512);

    // 按球面等距经纬度比例 (2π : π) 补偿水平宽度，保证五官呈现圆润可爱的粘土人比例
    ctx.save();
    ctx.translate(256, 256);
    ctx.scale(0.54, 1.0);
    ctx.translate(-256, -256);

    // 柔美桃粉腮红 + 高光点
    [164, 348].forEach((cx) => {
      const g = ctx.createRadialGradient(cx, 294, 4, cx, 294, 34);
      g.addColorStop(0, 'rgba(255, 118, 152, 0.56)');
      g.addColorStop(1, 'rgba(255, 118, 152, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, 294, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.ellipse(cx - 5, 289, 5, 3, -0.3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 柔和眉毛
    const browCol = shadeHex(prof.hair || '#ff9b54', -0.22);
    ctx.strokeStyle = browCol;
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    [-1, 1].forEach((side) => {
      const bx = 256 + side * 66;
      const tilt = prof.brow === 'stern' ? side * 5 : prof.brow === 'sharp' ? side * 3 : -side * 3;
      ctx.beginPath();
      ctx.moveTo(bx - 18, 206 + tilt);
      ctx.quadraticCurveTo(bx, 198, bx + 18, 206 - tilt);
      ctx.stroke();
    });

    // 灵动大眼 / 笑眯弯眼
    const eyeCol = prof.eyeColor || '#4a90e2';
    const eyeDark = shadeHex(eyeCol, -0.32);
    const eyeBright = shadeHex(eyeCol, 0.25);
    [-1, 1].forEach((side) => {
      const ex = 256 + side * 64;
      const ey = 252;
      if (opts.blink) {
        ctx.strokeStyle = '#4a2b2d';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(ex, ey + 8, 22, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        return;
      }

      // 眼白微亮底
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 26, 30, 0, 0, Math.PI * 2);
      ctx.fill();

      // 彩色渐变虹膜
      const eg = ctx.createLinearGradient(ex, ey - 28, ex, ey + 28);
      eg.addColorStop(0, eyeDark);
      eg.addColorStop(0.52, eyeCol);
      eg.addColorStop(1, eyeBright);
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.ellipse(ex, ey + 1, 22, 27, 0, 0, Math.PI * 2);
      ctx.fill();

      // 深色瞳仁中心
      ctx.fillStyle = '#1b1d36';
      ctx.beginPath();
      ctx.ellipse(ex, ey - 1, 12, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // 明亮弯月下瞳反光
      ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
      ctx.beginPath();
      ctx.ellipse(ex, ey + 16, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 浓密上睫毛与眼尾小挑钩
      ctx.strokeStyle = '#382024';
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 26, 29, 0, Math.PI * 1.10, Math.PI * 1.90);
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(ex + side * 24, ey - 8);
      ctx.lineTo(ex + side * 32, ey - 15);
      ctx.stroke();

      // 双重高光泡泡（主大亮斑 + 辅小亮斑 + 星星点）
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 9, ey - 11, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + 9, ey + 9, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 软萌鼻尖点
    ctx.fillStyle = shadeHex(prof.skin || '#fff1e6', -0.10);
    ctx.beginPath();
    ctx.ellipse(256, 282, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 治愈元气笑容 / 猫咪 ω 嘴
    if (opts.mouthOpen) {
      ctx.fillStyle = '#ff6b8b';
      ctx.strokeStyle = '#5c2832';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(238, 304);
      ctx.lineTo(274, 304);
      ctx.quadraticCurveTo(274, 330, 256, 330);
      ctx.quadraticCurveTo(238, 330, 238, 304);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff9ebb';
      ctx.beginPath();
      ctx.ellipse(256, 321, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#7a3b44';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(247, 307, 9, 0.15, Math.PI - 0.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(265, 307, 9, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }

    ctx.restore();

    const tex = new THREE.CanvasTexture(cv);
    if (tex.colorSpace !== undefined && THREE.SRGBColorSpace !== undefined) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    if (FACE_TEX_CACHE.size > 48) {
      const oldest = FACE_TEX_CACHE.keys().next().value;
      FACE_TEX_CACHE.delete(oldest);
    }
    FACE_TEX_CACHE.set(sig, tex);
    return tex;
  }

  const ROLE_PROFILES = {
    boss:     { style: 'slick',    outfit: 'suit',       hair: '#c9d4e8', skin: '#fff0e2', eyeColor: '#4876c4', cloth: '#4576d6', tie: '#ff6b6b', pants: '#4d6ea8', glasses: 'none',  prop: 'coffee',  brow: 'stern' },
    xiaomei:  { style: 'long',     outfit: 'sweater',    hair: '#ff96b0', skin: '#fff1e6', eyeColor: '#ff7096', cloth: '#59d697', pants: '#ffffff', glasses: 'none',  prop: 'coffee',  hairpin: '#ffd15c' },
    lijie:    { style: 'bun',      outfit: 'suit',       hair: '#a682eb', skin: '#fff0e2', eyeColor: '#8d6ce6', cloth: '#9a75e8', tie: '#ffd966', pants: '#584b8c', glasses: 'gold',  prop: 'laptop',  brow: 'sharp' },
    akai:     { style: 'cap',      outfit: 'hoodie',     hair: '#5cc8ff', skin: '#ffe6d6', eyeColor: '#3ea4e8', cloth: '#5bd6a8', pants: '#54739e', glasses: 'black', prop: 'headset' },
    xiaoyu:   { style: 'ponytail', outfit: 'shirt',      hair: '#ff9b54', skin: '#fff1e6', eyeColor: '#e88b38', cloth: '#ffd24c', pants: '#6282b8', glasses: 'none',  prop: 'laptop' },
    laoguan:  { style: 'slick',    outfit: 'suit',       hair: '#b8c5db', skin: '#ffebd9', eyeColor: '#4f9df0', cloth: '#5a82c2', tie: '#5cb9ff', pants: '#4f648a', glasses: 'gold',  prop: 'none' },
    citizen1: { style: 'short',    outfit: 'hoodie',     hair: '#ffd15c', skin: '#fff1e6', eyeColor: '#4a90e2', cloth: '#ff8a73', pants: '#6486b8', glasses: 'none',  prop: 'coffee' },
    citizen2: { style: 'ponytail', outfit: 'sweater',    hair: '#ff85a2', skin: '#fff1e6', eyeColor: '#d96ca8', cloth: '#64c9eb', pants: '#ffffff', glasses: 'none',  prop: 'none' },
    citizen3: { style: 'curly',    outfit: 'shirt',      hair: '#ffa35c', skin: '#ffe6d6', eyeColor: '#43b57d', cloth: '#75db86', pants: '#5e7da8', glasses: 'black', prop: 'headset' },
    citizen4: { style: 'long',     outfit: 'turtleneck', hair: '#b085f5', skin: '#fff1e6', eyeColor: '#8d6ce6', cloth: '#ff8fb8', pants: '#6486b8', glasses: 'gold',  prop: 'laptop' },
    citizen5: { style: 'cap',      outfit: 'hoodie',     hair: '#69c9ff', skin: '#fff1e6', eyeColor: '#4a90e2', cloth: '#ffd454', pants: '#54739e', glasses: 'sun',   prop: 'coffee' },
    citizen6: { style: 'bun',      outfit: 'sweater',    hair: '#f7f9ff', skin: '#fff1e6', eyeColor: '#ff7096', cloth: '#a58aff', pants: '#ffffff', glasses: 'none',  prop: 'laptop' }
  };

  function normalizeGlasses(gl) {
    if (!gl || gl === '0' || gl === 'none') return 'none';
    if (gl === true || gl === '1' || gl === 'black') return 'black';
    if (gl === 'gold' || gl === 'sun') return gl;
    return 'black';
  }

  function addToyPart(parent, geo, mat, x, y, z, rx, ry, rz, sx, sy, sz, castShadow) {
    const m = new THREE.Mesh(geo, mat);
    if (x || y || z) m.position.set(x || 0, y || 0, z || 0);
    if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
    if (sx || sy || sz) m.scale.set(sx || 1, sy || 1, sz || 1);
    m.castShadow = !!castShadow;
    m.receiveShadow = false;
    parent.add(m);
    return m;
  }

  function buildCharacterRig3D(key, unit, mat, opts) {
    unit = unit || 0.145;
    const s = unit * 8.0; // 保持总身高与星火岛门窗车辆完美匹配
    opts = opts || {};
    let prof = Object.assign({
      style: 'short', outfit: 'hoodie', hair: '#ffd15c', skin: '#fff1e6',
      eyeColor: '#4a90e2', cloth: '#5cb9ff', pants: '#6486b8', glasses: 'none', prop: 'none'
    }, ROLE_PROFILES[key] || ROLE_PROFILES.citizen1);

    if (key === 'me') {
      const av = (typeof G !== 'undefined' && G && G.avatar)
        ? G.avatar
        : { style: 'short', outfit: 'hoodie', hair: '#ffd15c', skin: '#fff1e6', cloth: '#5cb9ff', glasses: 'none', prop: 'coffee' };
      const eyeMap = { '#ff85a2': '#ff608c', '#b085f5': '#8a62e8', '#6cd488': '#3cb872', '#ff9b54': '#e87c38' };
      prof = {
        style: av.style || 'short',
        outfit: av.outfit || 'hoodie',
        hair: av.hair || '#ffd15c',
        skin: av.skin || '#fff1e6',
        eyeColor: eyeMap[av.hair] || '#4a90e2',
        cloth: av.cloth || '#5cb9ff',
        pants: (av.outfit === 'suit') ? '#4d6ea8' : (av.outfit === 'sweater' ? '#f7f9ff' : '#5b7eb3'),
        tie: '#ff7096',
        badge: '#ffd454',
        hairpin: '#ff7aa2',
        glasses: normalizeGlasses(av.glasses),
        prop: av.prop || 'coffee'
      };
    }

    const skinMat = getToyMat(prof.skin, { roughness: 0.34, emissive: 0.46 });
    const hairMat = getToyMat(prof.hair, { roughness: 0.36, emissive: 0.40 });
    const hairDarkMat = getToyMat(shadeHex(prof.hair, -0.07), { roughness: 0.38, emissive: 0.38 });
    const hairHiMat = getToyMat(shadeHex(prof.hair, 0.12), { roughness: 0.34, emissive: 0.44 });
    const clothMat = getToyMat(prof.cloth, { roughness: 0.42, emissive: 0.40 });
    const clothDarkMat = getToyMat(shadeHex(prof.cloth, -0.08), { roughness: 0.45, emissive: 0.36 });
    const clothLightMat = getToyMat(shadeHex(prof.cloth, 0.14), { roughness: 0.38, emissive: 0.44 });
    const pantsMat = getToyMat(prof.pants, { roughness: 0.46, emissive: 0.36 });
    const whiteMat = getToyMat('#ffffff', { roughness: 0.28, emissive: 0.50 });
    const goldMat = getToyMat('#ffd454', { roughness: 0.22, metalness: 0.25, emissive: 0.48 });
    const pinkMat = getToyMat('#ff8ab0', { roughness: 0.32, emissive: 0.46 });
    const mintMat = getToyMat('#6be09a', { roughness: 0.34, emissive: 0.42 });
    const shineMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const glassesType = normalizeGlasses(prof.glasses);

    const group = new THREE.Group();

    // =========================================================================
    // 1) 超萌 512px 粘土人贴图大头 + 闪亮双眼与桃粉腮红 + 可爱头饰发型
    // =========================================================================
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.08 * s, 0);
    group.add(headPivot);

    const faceTex = getKawaiiFaceTexture(prof, opts);
    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTex,
      emissiveMap: faceTex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.50,
      roughness: 0.36,
      metalness: 0.0
    });
    // rot.y = -Math.PI/2 让纹理正中心 (u=0.5, v=0.5) 朝向 +Z 正面，接缝藏在后脑头发里
    addToyPart(headPivot, new THREE.SphereGeometry(0.475 * s, 32, 24), faceMat, 0, 0.42 * s, 0, 0, -Math.PI / 2, 0, 1.02, 0.96, 1.12);
    // 圆润小耳朵（贴脸颊两侧）
    addToyPart(headPivot, new THREE.SphereGeometry(0.095 * s, 14, 10), skinMat, -0.50 * s, 0.39 * s, -0.02 * s);
    addToyPart(headPivot, new THREE.SphereGeometry(0.095 * s, 14, 10), skinMat, 0.50 * s, 0.39 * s, -0.02 * s);

    // 7 种高甜亮色发型 & 头饰（刘海位置高于眉毛，彻底告别暗黑遮眼）
    if (prof.style !== 'cap') {
      addToyPart(headPivot, new THREE.SphereGeometry(0.495 * s, 26, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat, 0, 0.46 * s, -0.03 * s, -0.42, 0, 0, 1.13, 0.98, 1.05);
    }
    if (prof.style === 'short') {
      // 🐣 呆毛萌芽：柔软圆刘海 + 头顶治愈小绿芽 🌱
      [
        [-0.30, 0.72, 0.28, -0.25, -0.35, 0.32, 0.08, 0.15],
        [-0.14, 0.76, 0.34, -0.32, -0.12, 0.16, 0.085, 0.16],
        [0.02,  0.77, 0.35, -0.35, 0.08, -0.10, 0.08, 0.15],
        [0.19,  0.75, 0.32, -0.30, 0.22, -0.24, 0.085, 0.16],
        [0.32,  0.70, 0.26, -0.22, 0.38, -0.35, 0.075, 0.15]
      ].forEach(([bx, by, bz, rx, ry, rz, rad, len]) => {
        addToyPart(headPivot, new THREE.CapsuleGeometry(rad * s, len * s, 8, 12), hairMat, bx * s, by * s, bz * s, rx, ry, rz);
      });
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.075 * s, 0.20 * s, 8, 10), hairHiMat, -0.47 * s, 0.48 * s, 0.08 * s);
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.075 * s, 0.20 * s, 8, 10), hairHiMat, 0.47 * s, 0.48 * s, 0.08 * s);
      // 头顶萌芽 🌱
      addToyPart(headPivot, new THREE.CylinderGeometry(0.022 * s, 0.026 * s, 0.18 * s, 8), mintMat, 0, 0.98 * s, 0.02 * s);
      addToyPart(headPivot, new THREE.SphereGeometry(0.085 * s, 12, 10), mintMat, -0.075 * s, 1.07 * s, 0.02 * s, 0, 0, 0.45, 1.35, 0.55, 0.75);
      addToyPart(headPivot, new THREE.SphereGeometry(0.085 * s, 12, 10), mintMat, 0.075 * s, 1.07 * s, 0.02 * s, 0, 0, -0.45, 1.35, 0.55, 0.75);
    } else if (prof.style === 'long') {
      // 🎀 甜心兔耳长发：八字元气刘海 + 垂坠长发 + 软萌兔耳蝴蝶结头箍
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.09 * s, 0.20 * s, 8, 12), hairMat, -0.24 * s, 0.73 * s, 0.30 * s, -0.35, -0.25, 0.36);
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.09 * s, 0.20 * s, 8, 12), hairMat, 0.24 * s, 0.73 * s, 0.30 * s, -0.35, 0.25, -0.36);
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.115 * s, 0.50 * s, 10, 14), hairMat, -0.46 * s, 0.18 * s, 0.10 * s, 0.06, 0, -0.08);
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.115 * s, 0.50 * s, 10, 14), hairMat, 0.46 * s, 0.18 * s, 0.10 * s, 0.06, 0, 0.08);
      addToyPart(headPivot, new THREE.CylinderGeometry(0.45 * s, 0.49 * s, 0.68 * s, 20, 1, false, Math.PI * 0.55, Math.PI * 0.90), hairDarkMat, 0, 0.06 * s, -0.10 * s);
      // 兔耳发箍 🎀
      const bowMat = getToyMat(prof.hairpin || '#ff7aa2', { roughness: 0.30, emissive: 0.48 });
      addToyPart(headPivot, new THREE.TorusGeometry(0.48 * s, 0.032 * s, 10, 24, Math.PI * 0.95), bowMat, 0, 0.46 * s, 0.04 * s, 0, 0, 0.08);
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.075 * s, 0.22 * s, 10, 12), bowMat, -0.22 * s, 1.03 * s, 0.03 * s, 0.12, 0, 0.22, 1.0, 1.0, 0.55);
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.075 * s, 0.22 * s, 10, 12), bowMat, 0.22 * s, 1.03 * s, 0.03 * s, 0.12, 0, -0.22, 1.0, 1.0, 0.55);
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.038 * s, 0.13 * s, 8, 8), whiteMat, -0.22 * s, 1.02 * s, 0.065 * s, 0.12, 0, 0.22, 1.0, 1.0, 0.35);
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.038 * s, 0.13 * s, 8, 8), whiteMat, 0.22 * s, 1.02 * s, 0.065 * s, 0.12, 0, -0.22, 1.0, 1.0, 0.35);
    } else if (prof.style === 'ponytail') {
      // ⭐ 元气马尾 + 星星发夹
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.085 * s, 0.20 * s, 8, 12), hairMat, -0.23 * s, 0.72 * s, 0.31 * s, -0.35, -0.25, 0.38);
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.085 * s, 0.20 * s, 8, 12), hairMat, 0.23 * s, 0.72 * s, 0.31 * s, -0.35, 0.25, -0.38);
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.075 * s, 0.22 * s, 8, 10), hairHiMat, -0.47 * s, 0.45 * s, 0.10 * s);
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.075 * s, 0.22 * s, 8, 10), hairHiMat, 0.47 * s, 0.45 * s, 0.10 * s);
      // 星星发饰 ⭐ + 蓬松大马尾
      addToyPart(headPivot, new THREE.OctahedronGeometry(0.078 * s, 0), goldMat, -0.36 * s, 0.64 * s, 0.34 * s, 0.3, 0.4, 0.2, 1.1, 1.1, 0.5);
      addToyPart(headPivot, new THREE.TorusGeometry(0.11 * s, 0.034 * s, 10, 18), pinkMat, 0, 0.66 * s, -0.46 * s, 0.35, 0, 0);
      addToyPart(headPivot, new THREE.SphereGeometry(0.19 * s, 16, 12), hairMat, 0, 0.68 * s, -0.58 * s);
      addToyPart(headPivot, new THREE.ConeGeometry(0.185 * s, 0.52 * s, 16), hairHiMat, 0, 0.38 * s, -0.66 * s, 2.85, 0, 0);
    } else if (prof.style === 'curly') {
      // 🧸 奶卷小熊：蓬松糖果卷云 + 可爱圆滚滚小熊耳朵
      const curls = [
        [0, 0.87, 0.02, 0.20], [-0.26, 0.82, 0.12, 0.18], [0.26, 0.82, 0.12, 0.18],
        [-0.38, 0.68, 0.22, 0.15], [0.38, 0.68, 0.22, 0.15], [-0.15, 0.78, 0.29, 0.14],
        [0.15, 0.78, 0.29, 0.14], [-0.49, 0.46, 0.06, 0.15], [0.49, 0.46, 0.06, 0.15],
        [-0.26, 0.68, -0.36, 0.21], [0.26, 0.68, -0.36, 0.21], [0, 0.44, -0.48, 0.23]
      ];
      curls.forEach(([cx, cy, cz, cr], ci) => {
        addToyPart(headPivot, new THREE.SphereGeometry(cr * s, 14, 12), ci % 2 === 0 ? hairHiMat : hairMat, cx * s, cy * s, cz * s);
      });
      // 小熊双耳 🧸
      addToyPart(headPivot, new THREE.SphereGeometry(0.14 * s, 14, 12), hairDarkMat, -0.34 * s, 0.96 * s, 0.02 * s, 0, 0, 0, 1.0, 1.0, 0.65);
      addToyPart(headPivot, new THREE.SphereGeometry(0.08 * s, 12, 10), pinkMat, -0.34 * s, 0.96 * s, 0.065 * s, 0, 0, 0, 1.0, 1.0, 0.45);
      addToyPart(headPivot, new THREE.SphereGeometry(0.14 * s, 14, 12), hairDarkMat, 0.34 * s, 0.96 * s, 0.02 * s, 0, 0, 0, 1.0, 1.0, 0.65);
      addToyPart(headPivot, new THREE.SphereGeometry(0.08 * s, 12, 10), pinkMat, 0.34 * s, 0.96 * s, 0.065 * s, 0, 0, 0, 1.0, 1.0, 0.45);
    } else if (prof.style === 'bun') {
      // 👑 星光丸子头 + 迷你小皇冠
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.085 * s, 0.21 * s, 8, 12), hairMat, -0.22 * s, 0.72 * s, 0.31 * s, -0.35, -0.2, 0.35);
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.085 * s, 0.21 * s, 8, 12), hairMat, 0.22 * s, 0.72 * s, 0.31 * s, -0.35, 0.2, -0.35);
      addToyPart(headPivot, new THREE.TorusGeometry(0.19 * s, 0.028 * s, 10, 22), goldMat, 0, 0.85 * s, -0.05 * s, Math.PI / 2, 0, 0);
      addToyPart(headPivot, new THREE.SphereGeometry(0.22 * s, 18, 14), hairMat, 0, 0.96 * s, -0.08 * s);
      // 迷你小皇冠 👑
      addToyPart(headPivot, new THREE.CylinderGeometry(0.13 * s, 0.10 * s, 0.12 * s, 6), goldMat, 0.18 * s, 0.93 * s, 0.16 * s, 0.18, 0, -0.25);
      addToyPart(headPivot, new THREE.SphereGeometry(0.032 * s, 8, 8), pinkMat, 0.20 * s, 0.99 * s, 0.18 * s);
    } else if (prof.style === 'slick') {
      // 明亮温和银灰背头（王总 / 老关）
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.14 * s, 0.34 * s, 10, 12), hairHiMat, 0, 0.81 * s, 0.02 * s, Math.PI / 2 - 0.10, 0, 0, 1.4, 1.0, 0.85);
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.08 * s, 0.22 * s, 8, 10), hairDarkMat, -0.47 * s, 0.48 * s, 0.04 * s);
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.08 * s, 0.22 * s, 8, 10), hairDarkMat, 0.47 * s, 0.48 * s, 0.04 * s);
    } else if (prof.style === 'cap') {
      // 🧢 多巴胺双色棒球帽
      const capColor = prof.cloth || '#5cb9ff';
      const capMat = getToyMat(capColor, { roughness: 0.38, emissive: 0.42 });
      const brimMat = getToyMat('#ffffff', { roughness: 0.30, emissive: 0.48 });
      addToyPart(headPivot, new THREE.SphereGeometry(0.49 * s, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56), hairHiMat, 0, 0.42 * s, -0.04 * s, -0.62, 0, 0, 1.12, 0.96, 1.02);
      addToyPart(headPivot, new THREE.SphereGeometry(0.515 * s, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.50), capMat, 0, 0.49 * s, -0.01 * s, -0.10, 0, 0, 1.13, 0.95, 1.03);
      addToyPart(headPivot, new THREE.SphereGeometry(0.05 * s, 10, 8), goldMat, 0, 0.96 * s, -0.01 * s);
      addToyPart(headPivot, new THREE.CylinderGeometry(0.42 * s, 0.46 * s, 0.048 * s, 22, 1, false, -Math.PI * 0.36, Math.PI * 0.72), brimMat, 0, 0.65 * s, 0.32 * s, 0.14, 0, 0);
      addToyPart(headPivot, new THREE.OctahedronGeometry(0.065 * s, 0), goldMat, 0, 0.77 * s, 0.46 * s, 0, 0, 0, 1.0, 1.0, 0.4);
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.07 * s, 0.18 * s, 8, 10), hairMat, -0.48 * s, 0.40 * s, 0.08 * s);
      addToyPart(headPivot, new THREE.CapsuleGeometry(0.07 * s, 0.18 * s, 8, 10), hairMat, 0.48 * s, 0.40 * s, 0.08 * s);
    }

    // 纤细可爱的 3D 圆框 / 金丝框 / 糖果墨镜（完美避开睫毛与高光大眼）
    if (glassesType !== 'none') {
      const frameColor = glassesType === 'gold' ? '#ffd454' : glassesType === 'sun' ? '#ff7aa2' : '#4a3538';
      const frameMat = getToyMat(frameColor, { roughness: 0.25, metalness: glassesType === 'gold' ? 0.35 : 0.08, emissive: 0.46 });
      const rimGeo = new THREE.TorusGeometry(0.135 * s, 0.014 * s, 10, 28);
      [-1, 1].forEach((side) => {
        const rx = side * 0.195 * s;
        addToyPart(headPivot, rimGeo, frameMat, rx, 0.42 * s, 0.47 * s, 0, side * 0.24, 0);
        addToyPart(headPivot, new THREE.CapsuleGeometry(0.012 * s, 0.36 * s, 6, 8), frameMat, side * 0.38 * s, 0.42 * s, 0.24 * s, Math.PI / 2, 0, side * 0.28);
        if (glassesType === 'sun') {
          const lensMat = getToyMat('#54c2ff', { roughness: 0.15, opacity: 0.65, emissive: 0.45 });
          addToyPart(headPivot, new THREE.CylinderGeometry(0.125 * s, 0.125 * s, 0.014 * s, 22), lensMat, rx, 0.42 * s, 0.468 * s, Math.PI / 2, 0, side * -0.24);
          addToyPart(headPivot, new THREE.BoxGeometry(0.075 * s, 0.018 * s, 0.01 * s), shineMat, rx - 0.03 * s, 0.46 * s, 0.48 * s, 0, side * 0.24, 0.65);
        }
      });
      addToyPart(headPivot, new THREE.CylinderGeometry(0.012 * s, 0.012 * s, 0.11 * s, 8), frameMat, 0, 0.44 * s, 0.47 * s, 0, 0, Math.PI / 2);
    }

    // =========================================================================
    // 2) 圆滚滚糖果系 Q版躯干 & 5套明亮穿搭 + 猫耳耳机 / 奶油背包
    // =========================================================================
    const torsoMesh = new THREE.Group();
    torsoMesh.position.set(0, 0.42 * s, 0);
    group.add(torsoMesh);

    addToyPart(torsoMesh, new THREE.CylinderGeometry(0.11 * s, 0.135 * s, 0.16 * s, 16), prof.outfit === 'turtleneck' ? clothMat : skinMat, 0, 0.62 * s, 0);
    addToyPart(torsoMesh, new THREE.CylinderGeometry(0.25 * s, 0.32 * s, 0.56 * s, 22), clothMat, 0, 0.30 * s, 0, 0, 0, 0, 1.06, 1.0, 0.84, true);
    addToyPart(torsoMesh, new THREE.SphereGeometry(0.26 * s, 18, 12), clothMat, 0, 0.51 * s, 0, 0, 0, 0, 1.04, 0.36, 0.84);
    addToyPart(torsoMesh, new THREE.CylinderGeometry(0.316 * s, 0.31 * s, 0.10 * s, 22), pantsMat, 0, 0.05 * s, 0, 0, 0, 0, 1.05, 1.0, 0.84);
    addToyPart(torsoMesh, new THREE.BoxGeometry(0.10 * s, 0.07 * s, 0.04 * s), goldMat, 0, 0.06 * s, 0.265 * s);

    if (prof.outfit === 'hoodie') {
      addToyPart(torsoMesh, new THREE.TorusGeometry(0.20 * s, 0.055 * s, 10, 22), clothLightMat, 0, 0.58 * s, -0.02 * s, Math.PI / 2 + 0.15, 0, 0);
      addToyPart(torsoMesh, new THREE.CapsuleGeometry(0.055 * s, 0.16 * s, 8, 10), clothLightMat, 0, 0.54 * s, -0.23 * s, 0.35, 0, Math.PI / 2, 1.4, 1.0, 0.9);
      addToyPart(torsoMesh, new THREE.CapsuleGeometry(0.015 * s, 0.16 * s, 6, 8), whiteMat, -0.075 * s, 0.45 * s, 0.235 * s, -0.16, 0, 0);
      addToyPart(torsoMesh, new THREE.CapsuleGeometry(0.015 * s, 0.16 * s, 6, 8), whiteMat, 0.075 * s, 0.45 * s, 0.235 * s, -0.16, 0, 0);
      addToyPart(torsoMesh, new THREE.CapsuleGeometry(0.062 * s, 0.21 * s, 8, 10), clothLightMat, 0, 0.18 * s, 0.235 * s, 0, 0, Math.PI / 2, 1.0, 1.0, 0.45);
    } else if (prof.outfit === 'suit') {
      const tieMat = getToyMat(prof.tie || '#ff7096', { roughness: 0.34, emissive: 0.44 });
      addToyPart(torsoMesh, new THREE.BoxGeometry(0.15 * s, 0.28 * s, 0.06 * s), whiteMat, 0, 0.42 * s, 0.22 * s);
      addToyPart(torsoMesh, new THREE.BoxGeometry(0.065 * s, 0.22 * s, 0.04 * s), tieMat, 0, 0.35 * s, 0.25 * s);
      addToyPart(torsoMesh, new THREE.CapsuleGeometry(0.032 * s, 0.24 * s, 6, 8), clothLightMat, -0.115 * s, 0.42 * s, 0.23 * s, -0.1, 0, 0.26);
      addToyPart(torsoMesh, new THREE.CapsuleGeometry(0.032 * s, 0.24 * s, 6, 8), clothLightMat, 0.115 * s, 0.42 * s, 0.23 * s, -0.1, 0, -0.26);
      addToyPart(torsoMesh, new THREE.SphereGeometry(0.032 * s, 10, 8), goldMat, 0.16 * s, 0.43 * s, 0.25 * s);
    } else if (prof.outfit === 'shirt') {
      addToyPart(torsoMesh, new THREE.BoxGeometry(0.16 * s, 0.42 * s, 0.045 * s), whiteMat, 0, 0.34 * s, 0.23 * s);
      addToyPart(torsoMesh, new THREE.BoxGeometry(0.11 * s, 0.09 * s, 0.03 * s), clothLightMat, 0.17 * s, 0.38 * s, 0.24 * s);
      addToyPart(torsoMesh, new THREE.CylinderGeometry(0.012 * s, 0.012 * s, 0.09 * s, 8), pinkMat, 0.18 * s, 0.44 * s, 0.25 * s);
    } else if (prof.outfit === 'sweater') {
      addToyPart(torsoMesh, new THREE.TorusGeometry(0.165 * s, 0.04 * s, 8, 18), whiteMat, 0, 0.58 * s, 0.01 * s, Math.PI / 2, 0, 0);
      addToyPart(torsoMesh, new THREE.CylinderGeometry(0.305 * s, 0.32 * s, 0.07 * s, 22), clothLightMat, 0, 0.12 * s, 0, 0, 0, 0, 1.06, 1.0, 0.85);
    } else if (prof.outfit === 'turtleneck') {
      addToyPart(torsoMesh, new THREE.CylinderGeometry(0.155 * s, 0.175 * s, 0.18 * s, 20), clothLightMat, 0, 0.63 * s, 0);
    }

    // 亮金工牌
    if (prof.badge || prof.outfit === 'hoodie' || prof.outfit === 'turtleneck') {
      addToyPart(torsoMesh, new THREE.BoxGeometry(0.095 * s, 0.125 * s, 0.025 * s), whiteMat, 0.165 * s, 0.38 * s, 0.245 * s, -0.1, 0.18, 0);
      addToyPart(torsoMesh, new THREE.BoxGeometry(0.095 * s, 0.032 * s, 0.028 * s), goldMat, 0.165 * s, 0.43 * s, 0.242 * s, -0.1, 0.18, 0);
    }

    // 糖果系猫耳耳机 🎧 (headset)
    if (prof.prop === 'headset') {
      const hsMat = getToyMat('#5cc8ff', { roughness: 0.28, emissive: 0.48 });
      addToyPart(torsoMesh, new THREE.TorusGeometry(0.195 * s, 0.028 * s, 8, 20, Math.PI * 1.1), whiteMat, 0, 0.58 * s, -0.02 * s, Math.PI / 2 + 0.18, 0, Math.PI * 0.95);
      [-1, 1].forEach((side) => {
        addToyPart(torsoMesh, new THREE.CylinderGeometry(0.078 * s, 0.078 * s, 0.055 * s, 16), whiteMat, side * 0.21 * s, 0.54 * s, 0.17 * s, 0, 0, Math.PI / 2);
        addToyPart(torsoMesh, new THREE.TorusGeometry(0.052 * s, 0.014 * s, 8, 16), hsMat, side * 0.24 * s, 0.54 * s, 0.17 * s, 0, Math.PI / 2, 0);
        addToyPart(torsoMesh, new THREE.ConeGeometry(0.036 * s, 0.07 * s, 4), pinkMat, side * 0.22 * s, 0.63 * s, 0.17 * s, 0, 0, -side * 0.2);
      });
    }

    // 奶油杏色小背包（西装除外）
    if (key === 'me' && prof.prop !== 'none' && prof.outfit !== 'suit') {
      addToyPart(torsoMesh, new THREE.CapsuleGeometry(0.175 * s, 0.21 * s, 10, 14), getToyMat('#fff2dc', { roughness: 0.40, emissive: 0.44 }), 0, 0.33 * s, -0.26 * s, 0, 0, Math.PI / 2, 1.0, 1.0, 0.72);
      addToyPart(torsoMesh, new THREE.CapsuleGeometry(0.18 * s, 0.18 * s, 8, 12), getToyMat('#ff9478', { roughness: 0.40, emissive: 0.42 }), 0, 0.47 * s, -0.27 * s, 0, 0, Math.PI / 2, 0.65, 1.0, 0.72);
      addToyPart(torsoMesh, new THREE.BoxGeometry(0.07 * s, 0.06 * s, 0.03 * s), goldMat, 0, 0.41 * s, -0.40 * s);
    }

    // =========================================================================
    // 3) 短萌 Q 版手臂 + 智能手表 + 奶油冰美式 / 糖果平板
    // =========================================================================
    const buildArm = (isRight) => {
      const armGrp = new THREE.Group();
      addToyPart(armGrp, new THREE.SphereGeometry(0.095 * s, 12, 12), clothMat, 0, 0, 0);
      const sleeveLen = prof.outfit === 'shirt' ? 0.17 : 0.22;
      addToyPart(armGrp, new THREE.CapsuleGeometry(0.084 * s, sleeveLen * s, 8, 12), clothMat, 0, -0.13 * s, 0);
      if (prof.outfit === 'shirt') {
        addToyPart(armGrp, new THREE.CylinderGeometry(0.074 * s, 0.070 * s, 0.11 * s, 12), skinMat, 0, -0.26 * s, 0);
      }
      addToyPart(armGrp, new THREE.SphereGeometry(0.086 * s, 12, 12), skinMat, 0, -0.33 * s, 0);

      if (!isRight) {
        addToyPart(armGrp, new THREE.TorusGeometry(0.078 * s, 0.018 * s, 8, 16), whiteMat, 0, -0.25 * s, 0, Math.PI / 2, 0, 0);
        addToyPart(armGrp, new THREE.BoxGeometry(0.05 * s, 0.04 * s, 0.02 * s), getToyMat('#5cc8ff', { roughness: 0.2, emissive: 0.55 }), 0, -0.25 * s, 0.08 * s);
      }
      if (isRight && prof.prop === 'coffee') {
        const cup = new THREE.Group();
        cup.position.set(0, -0.34 * s, 0.16 * s);
        cup.rotation.x = 0.25;
        addToyPart(cup, new THREE.CylinderGeometry(0.074 * s, 0.056 * s, 0.19 * s, 16), getToyMat('#fff8ee', { roughness: 0.30, emissive: 0.48 }), 0, 0, 0);
        addToyPart(cup, new THREE.CylinderGeometry(0.076 * s, 0.068 * s, 0.075 * s, 16), getToyMat('#ff9478', { roughness: 0.40, emissive: 0.44 }), 0, -0.01 * s, 0);
        addToyPart(cup, new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 0.028 * s, 16), whiteMat, 0, 0.10 * s, 0);
        addToyPart(cup, new THREE.CylinderGeometry(0.012 * s, 0.012 * s, 0.11 * s, 8), mintMat, 0.018 * s, 0.15 * s, 0, 0, 0, -0.22);
        armGrp.add(cup);
      }
      if (!isRight && prof.prop === 'laptop') {
        const pad = new THREE.Group();
        pad.position.set(-0.02 * s, -0.31 * s, 0.18 * s);
        pad.rotation.set(-0.35, 0.35, 0.15);
        addToyPart(pad, new THREE.BoxGeometry(0.28 * s, 0.20 * s, 0.026 * s), whiteMat, 0, 0, 0);
        addToyPart(pad, new THREE.BoxGeometry(0.23 * s, 0.15 * s, 0.008 * s), getToyMat('#5cc8ff', { roughness: 0.2, emissive: 0.55 }), 0, 0, 0.014 * s);
        addToyPart(pad, new THREE.BoxGeometry(0.08 * s, 0.08 * s, 0.012 * s), goldMat, -0.05 * s, 0.01 * s, 0.016 * s);
        armGrp.add(pad);
      }
      return armGrp;
    };
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.355 * s, 0.94 * s, 0);
    leftArm.add(buildArm(false));
    const rightArm = new THREE.Group();
    rightArm.position.set(0.355 * s, 0.94 * s, 0);
    rightArm.add(buildArm(true));
    group.add(leftArm, rightArm);

    // =========================================================================
    // 4) 短萌小脚 + 糖果厚底小白鞋
    // =========================================================================
    const shoeUpperMat = getToyMat(prof.outfit === 'suit' ? '#3d4d73' : '#ffffff', { roughness: 0.32, emissive: 0.45 });
    const soleMat = getToyMat(prof.outfit === 'suit' ? '#2e3a59' : shadeHex(prof.cloth, 0.08), { roughness: 0.38, emissive: 0.42 });
    const buildLeg = () => {
      const lg = new THREE.Group();
      addToyPart(lg, new THREE.CylinderGeometry(0.11 * s, 0.095 * s, 0.31 * s, 16), pantsMat, 0, -0.155 * s, 0, 0, 0, 0, 1, 1, 1, true);
      addToyPart(lg, new THREE.CapsuleGeometry(0.10 * s, 0.11 * s, 8, 12), shoeUpperMat, 0, -0.33 * s, 0.03 * s, Math.PI / 2, 0, 0, 1.04, 1.0, 0.85, true);
      addToyPart(lg, new THREE.CylinderGeometry(0.11 * s, 0.116 * s, 0.045 * s, 16), soleMat, 0, -0.40 * s, 0.03 * s, 0, 0, 0, 1.04, 1.0, 1.38);
      if (prof.outfit !== 'suit') {
        addToyPart(lg, new THREE.BoxGeometry(0.075 * s, 0.04 * s, 0.04 * s), goldMat, 0, -0.30 * s, 0.11 * s);
      }
      return lg;
    };
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.155 * s, 0.42 * s, 0);
    leftLeg.add(buildLeg());
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.155 * s, 0.42 * s, 0);
    rightLeg.add(buildLeg());
    group.add(leftLeg, rightLeg);

    return { group, head: headPivot, torso: torsoMesh, leftArm, rightArm, leftLeg, rightLeg };
  }

  function animateRig(rig, isMoving, timeSec, phase) {
    phase = phase || 0;
    if (isMoving) {
      const s = Math.sin(timeSec * 10.5 + phase);
      rig.leftLeg.rotation.x = s * 0.62;
      rig.rightLeg.rotation.x = -s * 0.62;
      rig.leftArm.rotation.x = -s * 0.52;
      rig.rightArm.rotation.x = s * 0.52;
      rig.head.rotation.y = Math.sin(timeSec * 2.2 + phase) * 0.06;
    } else {
      rig.leftLeg.rotation.x *= 0.82;
      rig.rightLeg.rotation.x *= 0.82;
      rig.leftArm.rotation.x = Math.sin(timeSec * 2 + phase) * 0.04;
      rig.rightArm.rotation.x = -Math.sin(timeSec * 2 + phase) * 0.04;
      rig.head.rotation.y = Math.sin(timeSec * 1.1 + phase) * 0.16;
    }
  }

  /* ---------- 8 座定制 3D 体素建筑生成器 (含可点亮玻璃/霓虹灯) ---------- */
  function buildBuilding3D(b, solidMat, glowMat) {
    const unit = 0.58;
    const vg = new VoxelGrid();
    const gv = new VoxelGrid();
    const id = b.id;

    const addWin = (x, y, z, c) => { vg.set(x, y, z, c); gv.set(x, y, z, c); };

    if (id === 'hq') {
      vg.fillBox(-6, 0, -5, 6, 1, 5, '#b8c3d4');
      vg.fillBox(-5, 2, -4, 5, 15, 4, (x, y, z) => {
        if (y === 2 && z === 4 && Math.abs(x) <= 1) return null;
        if (z === 4 && (y === 3 || y === 4) && Math.abs(x) <= 1) { addWin(x, y, z, '#7fe0ff'); return null; }
        if ((Math.abs(x) === 5 || Math.abs(z) === 4) && y >= 5 && y <= 14 && (y % 3 !== 1) && (Math.abs(x) % 2 === 1 || Math.abs(z) % 2 === 1)) {
          const wc = (x + y) % 5 === 0 ? '#ffe596' : '#73c6ff';
          addWin(x, y, z, wc);
          return null;
        }
        return (y % 4 === 0) ? '#2f4875' : '#3e5e96';
      });
      vg.fillBox(-2, 5, 5, 2, 5, 6, '#ffcd75');
      vg.fillBox(-5, 16, -4, 5, 16, 4, (x, y, z) => (Math.abs(x) === 5 || Math.abs(z) === 4) ? '#f0f4fa' : '#4a5d82');
      vg.fillBox(-1, 17, -1, 1, 19, 1, '#ffcd75');
      addWin(0, 20, 0, '#ffe994'); addWin(0, 21, 0, '#ffffff');
      vg.fillBox(-3, 17, -2, -3, 21, -2, '#cfd8e6');
      addWin(-3, 22, -2, '#ff6378');
    } else if (id === 'cafe') {
      vg.fillBox(-5, 0, -4, 5, 1, 4, '#c7b8a3');
      vg.fillBox(-4, 2, -3, 4, 8, 3, (x, y, z) => {
        if (z === 3 && y <= 4 && Math.abs(x) <= 1) return '#422918';
        if ((z === 3 || Math.abs(x) === 4) && y >= 4 && y <= 6 && Math.abs(x) === 2) { addWin(x, y, z, '#ffe3a8'); return null; }
        return y === 2 ? '#613c24' : '#8a5a38';
      });
      for (let x = -4; x <= 4; x++) {
        const stripe = Math.abs(x) % 2 === 0 ? '#d85b55' : '#fff5eb';
        vg.set(x, 6, 4, stripe); vg.set(x, 5, 5, stripe);
      }
      vg.fillBox(-5, 9, -4, 5, 10, 4, '#543521');
      vg.fillBox(-2, 11, -2, 2, 14, 2, '#fff5eb');
      vg.fillBox(-1, 14, -1, 1, 14, 1, '#5a3620');
      vg.set(3, 12, 0, '#fff5eb'); vg.set(3, 13, 0, '#fff5eb');
      vg.set(-1, 16, 0, '#ffffff'); vg.set(1, 17, 0, '#ffffff');
    } else if (id === 'tea') {
      vg.fillBox(-4, 0, -4, 4, 1, 4, '#ebd8df');
      vg.fillBox(-4, 2, -3, 4, 8, 3, (x, y, z) => {
        if (z === 3 && y <= 4 && Math.abs(x) <= 1) return '#593446';
        if (z === 3 && y >= 4 && y <= 6 && Math.abs(x) === 2) { addWin(x, y, z, '#9be8ff'); return null; }
        return y === 8 ? '#ffe8f0' : '#c97695';
      });
      for (let x = -4; x <= 4; x++) {
        const stripe = Math.abs(x) % 2 === 0 ? '#55c7a3' : '#fff7fa';
        vg.set(x, 6, 4, stripe); vg.set(x, 5, 5, stripe);
      }
      vg.fillBox(-4, 9, -3, 4, 9, 3, '#fff0f5');
      vg.fillBox(-1, 10, -1, 1, 14, 1, (x, y) => y === 10 ? '#3a2a2d' : '#ffdfb3');
      vg.fillBox(-2, 15, -2, 2, 15, 2, '#f7f9fc');
      vg.set(0, 16, 0, '#e05a6d'); vg.set(0, 17, 0, '#e05a6d'); vg.set(1, 18, 0, '#e05a6d');
    } else if (id === 'home') {
      vg.fillBox(-5, 0, -4, 5, 1, 4, '#88b371');
      vg.fillBox(-5, 2, -3, -1, 7, 2, (x, y, z) => {
        if (z === 2 && y === 4 && x === -3) { addWin(x, y, z, '#ffe8a3'); return null; }
        return '#e2a46b';
      });
      vg.fillBox(0, 2, -3, 5, 8, 2, (x, y, z) => {
        if (z === 2 && y <= 4 && x === 2) return '#5a3a22';
        if (z === 2 && y === 5 && x === 4) { addWin(x, y, z, '#ffe8a3'); return null; }
        return '#d68f59';
      });
      for (let r = 0; r < 3; r++) {
        vg.fillBox(-5 + r, 8 + r, -3, -1 - r, 8 + r, 2, '#b85046');
        vg.fillBox(0 + r, 9 + r, -3, 5 - r, 9 + r, 2, '#c8604f');
      }
      vg.fillBox(4, 10, -2, 4, 13, -2, '#7c5347');
      vg.set(4, 14, -2, '#f0f4ff');
      for (let x = -5; x <= 5; x += 2) {
        if (Math.abs(x - 2) > 1) vg.set(x, 2, 4, '#f7efe3');
      }
    } else if (id === 'arch') {
      vg.fillBox(-6, 0, -5, 6, 1, 5, '#c7bfd9');
      vg.fillBox(-5, 2, -4, 5, 10, 4, (x, y, z) => {
        if (z === 4 && y <= 5 && Math.abs(x) <= 1) return '#32264d';
        if ((Math.abs(x) === 5 || z === 4) && y >= 5 && y <= 8 && (Math.abs(x) === 3 || Math.abs(z) === 2)) {
          addWin(x, y, z, '#ffd980'); return null;
        }
        return (y === 10 || y === 2) ? '#8f7ec2' : '#6b5a9e';
      });
      [-4, -2, 2, 4].forEach(px => vg.fillBox(px, 2, 5, px, 9, 5, '#ede9f7'));
      vg.fillBox(-5, 10, 5, 5, 10, 5, '#ede9f7');
      vg.fillBox(-4, 11, -3, 4, 12, 3, '#584785');
      vg.fillBox(-3, 13, -2, 3, 14, 2, '#4b3b75');
      vg.fillBox(-3, 15, -1, -1, 16, 1, '#ffe394');
      vg.fillBox(1, 15, -1, 3, 16, 1, '#ffd066');
      vg.set(0, 15, -1, '#ffffff'); vg.set(0, 15, 0, '#ffffff'); vg.set(0, 15, 1, '#ffffff');
    } else if (id === 'eng') {
      vg.fillBox(-6, 0, -4, 6, 1, 4, '#92a2a8');
      vg.fillBox(-5, 2, -3, 5, 11, 3, (x, y, z) => {
        if (z === 3 && y <= 4 && Math.abs(x) <= 1) return '#202d30';
        if (z === 3 && y >= 6 && y <= 9 && Math.abs(x) <= 3) {
          if ((x + y) % 2 === 0) { addWin(x, y, z, '#4ad07a'); return null; }
          return '#2a3d42';
        }
        return y % 3 === 0 ? '#3a5659' : '#4d6f73';
      });
      vg.fillBox(-5, 12, -3, 5, 12, 3, '#314447');
      vg.fillBox(-3, 13, 0, 2, 14, 0, '#dce4ec');
      vg.fillBox(-4, 13, -1, -3, 16, 1, '#eef4fa');
      vg.del(-4, 15, 0);
      vg.fillBox(3, 13, -1, 4, 14, 0, '#b8c4cf');
      addWin(4, 15, 0, '#5cb9ff');
    } else if (id === 'data') {
      vg.fillBox(-5, 0, -5, 5, 1, 5, '#9ab2c9');
      vg.fillBox(-4, 2, -4, 4, 12, 4, (x, y, z) => {
        if (z === 4 && y <= 4 && Math.abs(x) <= 1) return '#162840';
        if (z === 4 && y >= 5 && y <= 10 && Math.abs(x) <= 2) {
          if (y === 6 || x === 0) { addWin(x, y, z, '#5cb9ff'); return null; }
          return '#173357';
        }
        return '#335d8a';
      });
      vg.fillBox(-3, 13, -3, 3, 16, 3, '#2b4f78');
      for (let y = 17; y <= 18; y++) addWin(-2, y, 0, '#e05a6d');
      for (let y = 17; y <= 20; y++) addWin(0, y, 0, '#ffcd75');
      for (let y = 17; y <= 22; y++) addWin(2, y, 0, '#4ad07a');
    } else {
      vg.fillBox(-6, 0, -4, 6, 1, 4, '#d9cfa8');
      vg.fillBox(-5, 2, -3, 5, 10, 3, (x, y, z) => {
        if (z === 3 && y <= 5 && Math.abs(x) <= 1) return '#3b2e13';
        if (Math.abs(x) === 5 && y >= 5 && y <= 7) { addWin(x, y, z, '#ffe699'); return null; }
        return y === 10 ? '#ffd980' : '#9c833c';
      });
      [-4, -2, 2, 4].forEach(px => vg.fillBox(px, 2, 4, px, 9, 4, '#f5ebd1'));
      for (let r = 0; r < 3; r++) vg.fillBox(-5 + r * 2, 11 + r, -3, 5 - r * 2, 11 + r, 4, '#c4a852');
      vg.fillBox(-2, 14, 0, 2, 18, 0, (x, y) => (Math.abs(x) === 2 && (y === 14 || y === 18)) ? null : '#ffd55c');
      addWin(0, 16, 1, '#fff6cc');
    }

    const group = new THREE.Group();
    group.add(makeVoxelMesh(vg, unit, [0, 0, 0], solidMat));
    if (gv.map.size > 0) {
      const gm = makeVoxelMesh(gv, unit, [0, 0, 0], glowMat, true);
      gm.castShadow = false;
      group.add(gm);
    }

    const ringGeo = new THREE.RingGeometry(4.4, 5.1, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffcd75, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.06;
    group.add(ring);

    const hitGeo = new THREE.BoxGeometry(8.6, 13.5, 8.6);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitGeo, hitMat);
    hitBox.position.y = 6.5;
    hitBox.userData = { buildingId: id };
    group.add(hitBox);

    return { group, ring, hitBox };
  }

  /* ---------- 星火纪念广场：喷泉塔 + 8 座可解锁雕塑（含未解锁全息蓝图） ---------- */
  function buildMilestoneSculpture(ms, index, glowMat) {
    const group = new THREE.Group();
    const ped = new VoxelGrid();
    const pedR = ms.center ? 2 : 1;
    ped.fillBox(-pedR, 0, -pedR, pedR, 1, pedR, (x, y) => y === 1 ? '#e2e6ef' : '#9ca7b8');
    group.add(makeVoxelMesh(ped, 0.55, [0, 0, 0]));

    const sc = new VoxelGrid();
    const u = ms.center ? 0.52 : 0.44;
    if (index === 0) {
      sc.fillBox(-1, 0, 0, 1, 0, 0, '#ffcd75');
      sc.set(0, 2, 0, '#ffcd75'); sc.set(0, 4, 0, '#ffcd75'); sc.set(1, 5, 0, '#ffcd75');
      sc.fillBox(-1, 6, 0, 1, 6, 0, '#ffe896');
    } else if (index === 1) {
      sc.fillBox(-1, 0, -1, 1, 3, 1, '#fff3e6');
      sc.set(2, 1, 0, '#fff3e6'); sc.set(2, 2, 0, '#fff3e6');
      sc.set(0, 3, 0, '#6e452a'); sc.set(0, 5, 0, '#ffffff');
    } else if (index === 2) {
      sc.fillBox(-1, 0, -1, 1, 5, 1, (x, y) => y % 2 === 0 ? '#4f9df0' : '#ffcd75');
      sc.set(0, 6, 0, '#ffffff');
    } else if (index === 3) {
      sc.fillBox(-2, 0, 0, -2, 4, 0, '#4ad07a');
      sc.fillBox(2, 0, 0, 2, 4, 0, '#4ad07a');
      sc.fillBox(-2, 5, 0, 2, 5, 0, '#9bd4ff'); sc.set(0, 6, 0, '#ffcd75');
    } else if (index === 4) {
      sc.fillBox(-1, 0, -1, 1, 2, 1, '#e8eef5');
      sc.fillBox(0, 3, 0, 0, 5, 0, '#e05a6d'); sc.set(0, 6, 0, '#ffe36e');
    } else if (index === 5) {
      sc.fillBox(-2, 2, 0, 2, 2, 0, '#5cb9ff');
      sc.fillBox(0, 0, 0, 0, 5, 0, '#5cb9ff');
      sc.fillBox(0, 2, -2, 0, 2, 2, '#5cb9ff'); sc.set(0, 3, 0, '#ffe36e');
    } else if (index === 6) {
      sc.fillBox(-1, 0, 0, 1, 4, 0, '#f5c242');
      sc.fillBox(-2, 1, 0, 2, 3, 0, (x, y) => (Math.abs(x) === 2 && (y === 1 || y === 3)) ? null : '#ffd966');
      sc.set(0, 2, 1, '#fff8db');
    } else {
      sc.fillBox(-2, 0, -2, 2, 1, 2, '#3b5a8f');
      sc.fillBox(-1, 2, -1, 1, 5, 1, '#ffd54f');
      sc.fillBox(-3, 6, 0, 3, 6, 0, '#ffe57f');
      sc.fillBox(0, 6, -3, 0, 6, 3, '#ffe57f');
      sc.fillBox(-2, 7, -1, 2, 8, 1, '#ffcd38');
      sc.fillBox(-1, 9, -1, 1, 10, 1, '#ffe885');
      sc.set(0, 11, 0, '#ffffff');
    }

    const artMesh = makeVoxelMesh(sc, u, [0, 0, 0], { roughness: 0.42, metalness: 0.18 });
    artMesh.position.y = pedR === 2 ? 1.1 : 1.05;
    artMesh.visible = false;
    group.add(artMesh);

    // 未解锁时展示青色全息蓝图雕塑（开局广场就充满生机）
    const holoMat = new THREE.MeshBasicMaterial({
      color: '#5ecbff', transparent: true, opacity: 0.28, wireframe: false
    });
    const holoMesh = new THREE.Mesh(artMesh.geometry, holoMat);
    holoMesh.position.copy(artMesh.position);
    holoMesh.scale.setScalar(0.88);
    group.add(holoMesh);
    void glowMat;

    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 5.5, 3.2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.y = 2.6;
    hit.userData = { milestoneId: ms.id };
    group.add(hit);

    return { group, artMesh, holoMesh, hit, ms };
  }

  /* ---------- 树木（松树 / 圆树 / 樱花 / 银杏）与 8 种车辆 ---------- */
  function createTree(kind) {
    const vg = new VoxelGrid();
    if (kind === 'pine') {
      vg.fillBox(0, 0, 0, 0, 2, 0, '#6b472b');
      vg.fillBox(-2, 3, -2, 2, 4, 2, '#287d4a');
      vg.fillBox(-1, 5, -1, 1, 6, 1, '#319659');
      vg.set(0, 7, 0, '#44b56e');
    } else if (kind === 'sakura') {
      vg.fillBox(0, 0, 0, 0, 2, 0, '#6b4738');
      vg.fillBox(-1, 3, -1, 1, 5, 1, '#ff9fc2');
      vg.set(-2, 4, 0, '#ffb8d2'); vg.set(2, 4, 0, '#ff8cb6');
      vg.set(0, 4, -2, '#ffb8d2'); vg.set(0, 4, 2, '#ff8cb6');
      vg.set(0, 6, 0, '#ffd4e5');
    } else if (kind === 'ginkgo') {
      vg.fillBox(0, 0, 0, 0, 2, 0, '#785636');
      vg.fillBox(-1, 3, -1, 1, 5, 1, '#f5c445');
      vg.set(-2, 4, 0, '#ffd569'); vg.set(2, 4, 0, '#ebb134');
      vg.set(0, 4, -2, '#ffd569'); vg.set(0, 4, 2, '#ebb134');
      vg.set(0, 6, 0, '#ffe38c');
    } else {
      vg.fillBox(0, 0, 0, 0, 2, 0, '#785032');
      vg.fillBox(-1, 3, -1, 1, 5, 1, '#3ea85c');
      vg.set(0, 6, 0, '#57c976');
      vg.set(-2, 4, 0, '#369652'); vg.set(2, 4, 0, '#4bc26b');
      vg.set(0, 4, -2, '#369652'); vg.set(0, 4, 2, '#4bc26b');
    }
    return makeVoxelMesh(vg, 0.56, [0, 0, 0], { roughness: 0.88 });
  }

  function createCarMesh(def, glowMat) {
    const vg = new VoxelGrid();
    const gv = new VoxelGrid();
    const isBus = def.kind === 'bus';
    const isVan = def.kind === 'van';

    [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([cx, cz]) => vg.set(cx, 0, cz, '#1c2028'));
    if (isBus) {
      vg.fillBox(-2, 1, -3, 2, 5, 4, def.c);
      vg.fillBox(-2, 2, -2, 2, 2, 3, (x, y, z) => (z === 4 || Math.abs(x) === 2) ? '#9cd8ff' : def.c);
      vg.fillBox(-2, 4, -2, 2, 4, 3, (x, y, z) => (z === 4 || Math.abs(x) === 2) ? '#9cd8ff' : def.c);
      vg.fillBox(-2, 5, -3, 2, 5, 4, def.r || '#ffffff');
    } else if (isVan) {
      vg.fillBox(-2, 1, -2, 2, 3, 3, def.c);
      vg.fillBox(-1, 4, -1, 1, 4, 2, def.r || '#ffffff');
      vg.set(-1, 3, 3, '#9cd8ff'); vg.set(1, 3, 3, '#9cd8ff');
    } else {
      vg.fillBox(-2, 1, -2, 2, 2, 3, def.c);
      vg.fillBox(-1, 3, -1, 1, 4, 2, (x, y, z) => (z === 2 || z === -1) && y === 3 ? '#9cd8ff' : (def.r || def.c));
    }

    // 发光车前灯 (+Z) 与红尾灯 (-Z)
    gv.set(-1, 1, isBus ? 4 : 3, '#fff7cc'); gv.set(1, 1, isBus ? 4 : 3, '#fff7cc');
    gv.set(-1, 1, isBus ? -3 : -2, '#ff4d61'); gv.set(1, 1, isBus ? -3 : -2, '#ff4d61');

    const grp = new THREE.Group();
    grp.add(makeVoxelMesh(vg, 0.34, [-0.5, 0, -0.5], { roughness: 0.5 }));
    const gm = makeVoxelMesh(gv, 0.34, [-0.5, 0, -0.5], glowMat, true);
    gm.castShadow = false;
    grp.add(gm);
    return grp;
  }

  function buildContinentIsland(c) {
    const vg = new VoxelGrid();
    const rx = 11, rz = 9;
    const isAutumn = c.theme === 'autumn';
    const isCrystal = c.theme === 'crystal';
    for (let x = -rx; x <= rx; x++) {
      for (let z = -rz; z <= rz; z++) {
        const d = Math.hypot(x / rx, z / rz) + 0.14 * Math.sin(x * 0.4 + z * 0.3);
        if (d > 1.0) continue;
        const h = d < 0.42 ? 3 : d < 0.72 ? 2 : 1;
        for (let y = -1; y <= h; y++) {
          let col = '#6b5a47';
          if (y === h) {
            if (d > 0.84) col = '#ebd29d';
            else if (isAutumn) col = (hash2(x, z) > 0.5 ? '#e28f4b' : '#d6a449');
            else if (isCrystal) col = (hash2(x, z) > 0.5 ? '#5d84b8' : '#739fd4');
            else col = (hash2(x, z) > 0.5 ? '#e37e8a' : '#76bf9a');
          }
          vg.set(x, y, z, col);
        }
      }
    }
    if (isAutumn) {
      vg.fillBox(-2, 4, -2, -2, 8, -2, '#f5c242');
      vg.fillBox(0, 4, 0, 0, 10, 0, '#ffcd75');
      vg.fillBox(2, 4, 2, 2, 12, 2, '#ff8a5b');
    } else if (isCrystal) {
      vg.fillBox(-1, 4, -1, 1, 9, 1, '#7cf3ff');
      vg.set(0, 10, 0, '#ffffff'); vg.set(0, 11, 0, '#a6f9ff');
    } else {
      vg.fillBox(-2, 4, -1, 2, 7, 1, '#ffd980');
      vg.fillBox(-1, 8, -1, 1, 9, 1, '#ff758f');
    }

    const group = new THREE.Group();
    group.position.set(c.wx, 0, c.wz);
    group.add(makeVoxelMesh(vg, 1.0, [0, 0, 0], { roughness: 0.84 }));
    const hit = new THREE.Mesh(
      new THREE.CylinderGeometry(11, 11, 10, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.y = 4;
    hit.userData = { continentId: c.id };
    group.add(hit);
    return { group, hit, data: c };
  }

  /* ---------- 日/落日/夜 光影参数插值表 ---------- */
  const TOD_PRESETS = {
    day: {
      label: '☀️ 晴昼',
      sky: new THREE.Color('#9ad7ff'),
      fog: new THREE.Color('#c9ecff'),
      fogDensity: 0.0024,
      ocean: new THREE.Color('#2794d1'),
      sunColor: new THREE.Color('#fff7e3'),
      sunPos: new THREE.Vector3(46, 72, 38),
      sunInt: 1.95,
      hemiSky: new THREE.Color('#e6f7ff'),
      hemiGround: new THREE.Color('#4fa85a'),
      hemiInt: 0.96,
      glowInt: 0.06,
      lampInt: 0.0,
      starOp: 0.0,
      moonOp: 0.0,
      beamOp: 0.0,
      fireflyOp: 0.0
    },
    sunset: {
      label: '🌇 黄昏',
      sky: new THREE.Color('#ee8c68'),
      fog: new THREE.Color('#f4a27b'),
      fogDensity: 0.0031,
      ocean: new THREE.Color('#2e6c99'),
      sunColor: new THREE.Color('#ff8e47'),
      sunPos: new THREE.Vector3(-60, 18, 24),
      sunInt: 1.65,
      hemiSky: new THREE.Color('#ffc9a8'),
      hemiGround: new THREE.Color('#48385c'),
      hemiInt: 0.78,
      glowInt: 0.82,
      lampInt: 1.4,
      starOp: 0.35,
      moonOp: 0.5,
      beamOp: 0.16,
      fireflyOp: 0.45
    },
    night: {
      label: '🌙 星夜',
      sky: new THREE.Color('#0c1633'),
      fog: new THREE.Color('#121e42'),
      fogDensity: 0.0034,
      ocean: new THREE.Color('#103159'),
      sunColor: new THREE.Color('#9ec4ff'),
      sunPos: new THREE.Vector3(-42, 56, -34),
      sunInt: 0.65,
      hemiSky: new THREE.Color('#344a82'),
      hemiGround: new THREE.Color('#162336'),
      hemiInt: 0.56,
      glowInt: 1.42,
      lampInt: 2.8,
      starOp: 0.96,
      moonOp: 1.0,
      beamOp: 0.34,
      fireflyOp: 0.95
    }
  };

  /* ============================================================
     PQIsland 主控制器
     ============================================================ */
  const PQIsland = {
    inited: false,
    running: false,
    rafId: 0,
    mode: 'pan',       // 'pan' | 'orbit' | 'walk' | 'fp'
    cinematicMode: 'landing', // 'landing' | 'avatar' | null
    timeMode: 'clock', // 'clock' | 'day' | 'sunset' | 'night' | 'auto'
    autoPhase: 0,
    avTurntableYaw: 0.35,
    avDragging: false,
    _portraitEnv: null,
    _rigCache: null,
    _lastClockStr: '',
    archipelago: false,
    renderer: null,
    scene: null,
    camera: null,
    solidMat: null,
    glowMat: null,
    buildings: {},
    milestones: [],
    continents: [],
    hitTargets: [],
    cars: [],
    citizens: [],
    clouds: [],
    cloudGate: [],
    cloudGateOpen: 0,
    cloudGateTarget: 0,
    balloon: null,
    balloon2: null,
    birds: [],
    sailboat: null,
    ducks: [],
    trafficLights: [],
    waterfallDrops: [],
    fountainDrops: [],
    fireflies: null,
    starsMesh: null,
    moonMesh: null,
    lighthouseBeam: null,
    drone: null,
    ocean: null,
    foam: null,
    sunLight: null,
    hemiLight: null,
    pointLights: [],
    playerRig: null,
    playerPos: null,
    playerYaw: 0.35,
    fpYaw: 0.35,
    fpPitch: -0.05,
    walkGoal: null,
    goalRing: null,
    keys: {},
    joyVec: { x: 0, z: 0 },
    lastMilestoneUnlocked: -1,
    activeBuildingId: null,
    nearBuildingId: null,
    diveAnim: null,

    camTarget: { x: 0, y: 2.2, z: 2 },
    camCurTarget: { x: 0, y: 2.2, z: 2 },
    spherical: { radius: 64, polar: 0.74, azimuth: 0.56 },
    curSpherical: { radius: 64, polar: 0.74, azimuth: 0.56 },
    curTod: null,

    pointers: new Map(),
    dragStart: null,
    pinchDist: 0,

    init() {
      if (this.inited || !window.THREE) return;
      const canvas = document.getElementById('island-canvas');
      if (!canvas) return;
      this.inited = true;

      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (this.renderer.outputColorSpace !== undefined) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      }
      if (THREE.ACESFilmicToneMapping !== undefined) {
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.06;
      }

      this.scene = new THREE.Scene();
      this.scene.background = TOD_PRESETS.day.sky.clone();
      this.scene.fog = new THREE.FogExp2('#c9ecff', 0.0024);

      this.camera = new THREE.PerspectiveCamera(45, 1, 0.25, 450);
      this.raycaster = new THREE.Raycaster();
      this.playerPos = new THREE.Vector3(-10.5, 1.04, 4.5);

      this.solidMat = new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: 0.85, metalness: 0.04
      });
      this.glowMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.35,
        metalness: 0.05,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0.06
      });
      this.glowMat.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= diffuseColor.rgb;'
        );
      };

      this._initTodState();
      this._setupLightsAndSky();
      this._buildOcean();
      this._buildMainIsland();
      this._buildRoadsAndCars();
      this._buildPlazaCenterAndMilestones();
      this._buildBuildingsAndNpcs();
      this._buildDistrictPropsAndLandmarks();
      this._buildCitizens();
      this._buildContinents();
      this.rebuildPlayer();
      this._bindEvents();
      this._bindAvatarTurntable();
      this._resize();
      this.setTimeOfDay(this.timeMode, true);
    },

    _initTodState() {
      const p = TOD_PRESETS.day;
      this.curTod = {
        sky: p.sky.clone(),
        fog: p.fog.clone(),
        fogDensity: p.fogDensity,
        ocean: p.ocean.clone(),
        sunColor: p.sunColor.clone(),
        sunPos: p.sunPos.clone(),
        sunInt: p.sunInt,
        hemiSky: p.hemiSky.clone(),
        hemiGround: p.hemiGround.clone(),
        hemiInt: p.hemiInt,
        glowInt: p.glowInt,
        lampInt: p.lampInt,
        starOp: p.starOp,
        moonOp: p.moonOp,
        beamOp: p.beamOp,
        fireflyOp: p.fireflyOp
      };
    },

    _setupLightsAndSky() {
      this.hemiLight = new THREE.HemisphereLight('#e6f7ff', '#4fa85a', 0.96);
      this.scene.add(this.hemiLight);

      this.sunLight = new THREE.DirectionalLight('#fff7e3', 1.95);
      this.sunLight.position.set(46, 72, 38);
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(2048, 2048);
      this.sunLight.shadow.camera.left = -54;
      this.sunLight.shadow.camera.right = 54;
      this.sunLight.shadow.camera.top = 54;
      this.sunLight.shadow.camera.bottom = -54;
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 175;
      this.sunLight.shadow.bias = -0.0006;
      this.scene.add(this.sunLight);

      const rim = new THREE.DirectionalLight('#9be2ff', 0.36);
      rim.position.set(-40, 24, -45);
      this.scene.add(rim);

      // 夜间岛屿暖色局部点光源（广场 + 4个生活区）
      const lightSpots = [
        [0, 5.5, 0], [-20, 5.5, -12], [-20, 5.0, 12], [18, 5.0, 14], [18, 5.0, -12]
      ];
      this.pointLights = lightSpots.map(([lx, ly, lz]) => {
        const pl = new THREE.PointLight('#ffbe6b', 0, 28, 1.45);
        pl.position.set(lx, ly, lz);
        this.scene.add(pl);
        return pl;
      });

      // 星空粒子
      const starGeo = new THREE.BufferGeometry();
      const sPos = [];
      for (let i = 0; i < 360; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.44;
        const r = 175 + Math.random() * 20;
        sPos.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) + 12, r * Math.sin(phi) * Math.sin(theta));
      }
      starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
      const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 1.5, transparent: true, opacity: 0 });
      this.starsMesh = new THREE.Points(starGeo, starMat);
      this.scene.add(this.starsMesh);

      // 3D 体素月亮
      const moonVg = new VoxelGrid();
      moonVg.fillBox(-2, -2, -2, 2, 2, 2, (x, y, z) => (x * x + y * y + z * z <= 6) ? '#fff5c8' : null);
      this.moonMesh = makeVoxelMesh(moonVg, 1.4, [0, 0, 0], new THREE.MeshBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0
      }), true);
      this.moonMesh.castShadow = false;
      this.moonMesh.position.set(-68, 72, -55);
      this.scene.add(this.moonMesh);

      // 8 朵高空漂浮的 3D 体素云朵（抬高至 y=36..42 避免遮挡镜头）
      const cloudDefs = [
        [-28, 37, -18, 0.85], [14, 39, -26, 0.72], [32, 36, 6, 0.8], [-34, 38, 18, 0.76],
        [4, 41, 28, 0.7], [-12, 36, -32, 0.65], [48, 38, -24, 0.9], [-46, 37, -4, 0.8]
      ];
      this.clouds = cloudDefs.map(([cx, cy, cz, scale], i) => {
        const cv = new VoxelGrid();
        cv.fillBox(-3, 0, -1, 3, 1, 1, '#ffffff');
        cv.fillBox(-2, 2, -1, 1, 2, 1, '#f4f8ff');
        cv.fillBox(-1, 0, -2, 2, 1, 2, '#ffffff');
        const m = makeVoxelMesh(cv, 0.95 * scale, [0, 0, 0], new THREE.MeshStandardMaterial({
          vertexColors: true, roughness: 0.9, transparent: true, opacity: 0.92
        }));
        m.castShadow = false;
        m.position.set(cx, cy, cz);
        this.scene.add(m);
        return { mesh: m, baseX: cx, speed: 0.45 + (i % 3) * 0.18, phase: i * 1.3 };
      });

      // 18 朵环绕大陆的立体柔云云海（首页云雾缭绕，点击开始后向两侧拨开）
      this.cloudGate = [];
      const puffGeo = new THREE.SphereGeometry(1, 14, 12);
      for (let i = 0; i < 18; i++) {
        const ang = (i / 18) * Math.PI * 2 + (i % 2) * 0.22;
        const rad = i < 10 ? (11 + (i % 3) * 5.2) : (26 + (i % 4) * 5.5);
        const bx = Math.cos(ang) * rad;
        const bz = Math.sin(ang) * rad * 0.88;
        const by = i < 10 ? (15.5 + (i % 3) * 2.4) : (12.0 + (i % 4) * 2.1);
        const cMat = new THREE.MeshStandardMaterial({
          color: '#ffffff', roughness: 0.88, transparent: true, opacity: 0.82, depthWrite: false
        });
        const cg = new THREE.Group();
        const sc = i < 10 ? (1.05 + (i % 3) * 0.18) : (1.3 + (i % 3) * 0.25);
        [
          [0, 0, 0, 2.2, 1.35, 1.8],
          [-1.5, -0.15, 0.3, 1.6, 1.1, 1.4],
          [1.6, -0.1, -0.25, 1.7, 1.15, 1.45],
          [0.3, 0.75, 0.1, 1.55, 1.1, 1.35]
        ].forEach(([px, py, pz, sx, sy, sz]) => {
          const pm = new THREE.Mesh(puffGeo, cMat);
          pm.position.set(px, py, pz);
          pm.scale.set(sx, sy, sz);
          cg.add(pm);
        });
        cg.position.set(bx, by, bz);
        cg.scale.setScalar(sc);
        this.scene.add(cg);
        this.cloudGate.push({
          group: cg, mat: cMat, baseX: bx, baseY: by, baseZ: bz,
          baseScale: sc, ang, drift: 0.03 + (i % 4) * 0.012, phase: i * 0.9, inner: i < 10
        });
      }

      // 双热气球绕岛巡航 + 6 只海岸飞鸟群
      const makeBalloon = (c1, c2, top) => {
        const bv = new VoxelGrid();
        bv.fillBox(-2, 3, -2, 2, 7, 2, (x, y, z) => {
          if (Math.abs(x) === 2 && Math.abs(z) === 2 && (y === 3 || y === 7)) return null;
          return (x + z) % 2 === 0 ? c1 : c2;
        });
        bv.fillBox(-1, 8, -1, 1, 8, 1, top);
        bv.fillBox(-1, 0, -1, 1, 1, 1, '#8a5a38');
        bv.set(-1, 2, -1, '#d8c5a3'); bv.set(1, 2, 1, '#d8c5a3');
        return makeVoxelMesh(bv, 0.78, [0, 0, 0], { roughness: 0.7 });
      };
      this.balloon = makeBalloon('#ff6b7a', '#ffcd5c', '#5cb9ff');
      this.balloon.position.set(16, 20, -10);
      this.scene.add(this.balloon);

      this.balloon2 = makeBalloon('#5cb9ff', '#f5f7fc', '#4ad07a');
      this.balloon2.position.set(-20, 17, 14);
      this.scene.add(this.balloon2);

      this.birds = [];
      const wingGeo = new THREE.BoxGeometry(0.45, 0.06, 0.16);
      const birdMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      for (let i = 0; i < 6; i++) {
        const bg = new THREE.Group();
        const lw = new THREE.Mesh(wingGeo, birdMat); lw.position.x = -0.20;
        const rw = new THREE.Mesh(wingGeo, birdMat); rw.position.x = 0.20;
        bg.add(lw, rw);
        this.scene.add(bg);
        this.birds.push({ group: bg, lw, rw, ang: i * 1.05, r: 22 + (i % 3) * 4.5, y: 12.5 + (i % 3) * 1.8, speed: 0.32 + (i % 2) * 0.08, phase: i * 1.3 });
      }

      // 夜间流萤粒子 (绕池塘和草地漂浮)
      const ffGeo = new THREE.BufferGeometry();
      const ffPos = [];
      this._ffSeeds = [];
      for (let i = 0; i < 32; i++) {
        const fx = (Math.random() - 0.5) * 56;
        const fz = (Math.random() - 0.5) * 46;
        const fy = 1.6 + Math.random() * 2.2;
        ffPos.push(fx, fy, fz);
        this._ffSeeds.push({ x: fx, y: fy, z: fz, ph: Math.random() * 6.28 });
      }
      ffGeo.setAttribute('position', new THREE.Float32BufferAttribute(ffPos, 3));
      const ffMat = new THREE.PointsMaterial({ color: '#c4ff6e', size: 0.45, transparent: true, opacity: 0 });
      this.fireflies = new THREE.Points(ffGeo, ffMat);
      this.scene.add(this.fireflies);
    },

    _buildOcean() {
      const seaGeo = new THREE.PlaneGeometry(540, 540, 32, 32);
      seaGeo.rotateX(-Math.PI / 2);
      const seaMat = new THREE.MeshStandardMaterial({
        color: '#2794d1', roughness: 0.55, metalness: 0.05
      });
      this.ocean = new THREE.Mesh(seaGeo, seaMat);
      this.ocean.position.y = 0.15;
      this.ocean.receiveShadow = true;
      this.scene.add(this.ocean);

      const foamGeo = new THREE.RingGeometry(36.6, 38.4, 52);
      foamGeo.rotateX(-Math.PI / 2);
      const foamMat = new THREE.MeshBasicMaterial({
        color: '#dff4ff', transparent: true, opacity: 0.52, side: THREE.DoubleSide
      });
      this.foam = new THREE.Mesh(foamGeo, foamMat);
      this.foam.scale.set(1.06, 1, 0.92);
      this.foam.position.y = 0.22;
      this.scene.add(this.foam);
    },

    _isOnIsland(x, z) {
      const nx = x / 38.5, nz = z / 33.5;
      const angle = Math.atan2(z, x);
      const wobble = 0.085 * Math.sin(angle * 3 + 0.6) + 0.05 * Math.cos(angle * 5 - 1.1);
      return Math.hypot(nx, nz) + wobble;
    },

    _buildMainIsland() {
      const vg = new VoxelGrid();
      const grasses = ['#56bf54', '#4db34c', '#61c95e', '#48ab47'];
      const sands = ['#edd49a', '#e3c78a'];

      for (let x = -43; x <= 43; x++) {
        for (let z = -37; z <= 37; z++) {
          const d = this._isOnIsland(x, z);
          if (d > 1.0) continue;

          let topY = 0;
          let topCol = grasses[(Math.abs(x * 7 + z * 13)) % grasses.length];

          const pondDist = Math.hypot((x + 13) / 4.4, (z - 12) / 3.4);
          const isPondRim = pondDist >= 0.88 && pondDist <= 1.15;
          const isPondWater = pondDist < 0.88;

          // 北方远景丘陵雪峰 + 山涧瀑布通道 (x = -9)
          const ridgeDist = Math.hypot((x + 2) / 26, (z + 31) / 7.5);
          if (d > 0.88) {
            topY = 0;
            topCol = sands[(Math.abs(x + z)) % 2];
          } else if (ridgeDist < 1.0 && z <= -24) {
            const peak1 = Math.max(0, 1 - Math.hypot((x + 12) / 8.0, (z + 29.5) / 5.4));
            const peak2 = Math.max(0, 1 - Math.hypot((x - 10) / 8.5, (z + 30) / 5.5));
            const elev = Math.round(Math.max(peak1 * 12, peak2 * 13));
            topY = Math.max(1, elev);
            if (x === -9 && z >= -28 && z <= -24) {
              topCol = '#58c3ff'; // 雪山瀑布水脉
            } else if (topY >= 9) {
              topCol = '#f4f8ff';
            } else if (topY >= 5) {
              topCol = '#7a8a9e';
            } else {
              topCol = '#4aa84b';
            }
          }

          // 东北角灯塔礁石小高台 (32, -22)
          if (Math.hypot(x - 32, z + 22) <= 2.4) {
            topY = 1;
            topCol = '#9aa6b5';
          }

          const plazaR = Math.hypot(x, z);
          if (plazaR <= 8.8) {
            topY = 0;
            if (plazaR > 7.9) topCol = '#9aa6ba';
            else topCol = ((x + z) & 1) ? '#dce2ec' : '#cfd6e3';
          }

          for (let y = -2; y <= topY; y++) {
            if (y === topY) {
              if (isPondWater) vg.set(x, -1, z, '#728296');
              else if (isPondRim) vg.set(x, 0, z, '#a5b1c2');
              else vg.set(x, y, z, topCol);
            } else {
              vg.set(x, y, z, y <= -1 ? '#6e5a46' : '#856d54');
            }
          }
        }
      }

      this.scene.add(makeVoxelMesh(vg, 1.0, [0, 0, 0], { roughness: 0.9 }));

      // 池塘清澈水体
      const waterVg = new VoxelGrid();
      for (let x = -18; x <= -8; x++) {
        for (let z = 8; z <= 16; z++) {
          if (Math.hypot((x + 13) / 4.4, (z - 12) / 3.4) < 0.88) {
            waterVg.set(x, 0, z, '#3cb5f5');
          }
        }
      }
      this.scene.add(makeVoxelMesh(waterVg, 1.0, [0, -0.15, 0], {
        roughness: 0.16, metalness: 0.08, transparent: true, opacity: 0.86
      }));

      // 睡莲、荷花 & 两只池塘小鸭子
      [[-15.2, 10.6, true], [-10.8, 13.4, false], [-14.2, 13.8, true]].forEach(([wx, wz, flower]) => {
        const pad = new THREE.Mesh(
          new THREE.BoxGeometry(0.88, 0.12, 0.88),
          new THREE.MeshStandardMaterial({ color: '#4fc96a', roughness: 0.7 })
        );
        pad.position.set(wx, 0.88, wz);
        this.scene.add(pad);
        if (flower) {
          const fl = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, 0.28, 0.36),
            new THREE.MeshStandardMaterial({ color: '#ff8fb8', roughness: 0.5 })
          );
          fl.position.set(wx, 1.05, wz);
          this.scene.add(fl);
        }
      });

      this.ducks = [0, 1].map((idx) => {
        const dv = new VoxelGrid();
        dv.fillBox(-1, 0, -1, 1, 1, 1, idx === 0 ? '#ffe169' : '#ffffff');
        dv.set(0, 2, 1, idx === 0 ? '#ffd038' : '#fff5d6');
        dv.set(0, 2, 2, '#f58b38'); // 鸭嘴
        const dm = makeVoxelMesh(dv, 0.22, [0, 0, 0], { roughness: 0.6 });
        this.scene.add(dm);
        return { mesh: dm, angle: idx * Math.PI, r: 1.5 + idx * 0.7 };
      });

      // 跨湖红木小拱桥 (横跨池塘 x=-13, z=12)
      const bridgeVg = new VoxelGrid();
      for (let bx = -4; bx <= 4; bx++) {
        const archY = Math.round(1.6 - Math.abs(bx) * 0.32);
        bridgeVg.fillBox(bx, archY, -1, bx, archY, 1, '#9c5a38');
        if (Math.abs(bx) % 2 === 0) {
          bridgeVg.set(bx, archY + 1, -1, '#c8724b');
          bridgeVg.set(bx, archY + 1, 1, '#c8724b');
        }
      }
      const bridgeMesh = makeVoxelMesh(bridgeVg, 0.78, [0, 0, 0], { roughness: 0.82 });
      bridgeMesh.position.set(-13, 0.85, 12);
      this.scene.add(bridgeMesh);

      // 湖边小凉亭 (-18.5, 13.5)
      const gazVg = new VoxelGrid();
      gazVg.fillBox(-2, 0, -2, 2, 0, 2, '#d8d0c1');
      [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([px, pz]) => gazVg.fillBox(px, 1, pz, px, 4, pz, '#8f4f32'));
      gazVg.fillBox(-3, 5, -3, 3, 5, 3, '#c8534f');
      gazVg.fillBox(-2, 6, -2, 2, 6, 2, '#b0423f');
      gazVg.set(0, 7, 0, '#ffcd75');
      const gazMesh = makeVoxelMesh(gazVg, 0.52, [0, 0, 0]);
      gazMesh.position.set(-19, 1.0, 14.5);
      this.scene.add(gazMesh);

      // 北方瀑布动态水花粒子
      for (let i = 0; i < 10; i++) {
        const drop = new THREE.Mesh(
          new THREE.BoxGeometry(0.45, 0.45, 0.45),
          new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? '#a6e5ff' : '#ffffff', transparent: true, opacity: 0.85 })
        );
        this.scene.add(drop);
        this.waterfallDrops.push({ mesh: drop, t: i / 10 });
      }

      // 丰富多彩的树种（樱花 + 银杏 + 松树 + 绿橡树）共 48 棵
      const treeSpots = [
        [-31, -18, 'pine'], [-30, -8, 'sakura'], [-32, 10, 'pine'], [-29, 20, 'ginkgo'],
        [-10, -24, 'pine'], [12, -24, 'sakura'], [29, -20, 'pine'], [32, -6, 'ginkgo'],
        [33, 12, 'pine'], [28, 22, 'sakura'], [9, 26, 'pine'], [-9, 26, 'round'],
        [-19, 10, 'sakura'], [12, -12, 'sakura'], [14, 11, 'ginkgo'], [-12, -13, 'pine'],
        [27, -23, 'pine'], [-26, -24, 'pine'], [18, -24, 'ginkgo'], [-6, 17, 'round'],
        [-28, -2, 'round'], [-27, 14, 'sakura'], [10, 18, 'ginkgo'], [26, 13, 'round'],
        [29, -11, 'sakura'], [15, -19, 'pine'], [-15, -21, 'ginkgo'], [-4, -26, 'pine'],
        [6, -26, 'round'], [-33, 2, 'round'], [34, 4, 'sakura'], [-22, 26, 'pine'],
        [22, 25, 'round'], [0, 29, 'ginkgo'], [-14, 28, 'sakura'], [14, 28, 'pine']
      ];
      treeSpots.forEach(([tx, tz, kind]) => {
        const t = createTree(kind);
        t.position.set(tx, 1.0, tz);
        t.rotation.y = (hash2(tx, tz) * 4 | 0) * Math.PI * 0.5;
        this.scene.add(t);
      });

      // 花丛与灌木
      const flowerColors = ['#ffd966', '#ff8aa8', '#ffffff', '#8ad6ff'];
      const flVg = new VoxelGrid();
      for (let i = 0; i < 65; i++) {
        const fx = Math.round((hash2(i, 3) - 0.5) * 64);
        const fz = Math.round((hash2(9, i) - 0.5) * 54);
        const r = Math.hypot(fx, fz);
        if (r < 9.5 || (r > 11.2 && r < 15.8)) continue;
        if (this._isOnIsland(fx, fz) > 0.84) continue;
        if (Math.hypot(fx + 13, fz - 12) < 5.5) continue;
        flVg.set(fx * 2, 0, fz * 2, '#3d9949');
        flVg.set(fx * 2, 1, fz * 2, flowerColors[i % flowerColors.length]);
      }
      this.scene.add(makeVoxelMesh(flVg, 0.5, [0, 2.0, 0]));
    },

    _buildRoadsAndCars() {
      const roadMat = new THREE.MeshStandardMaterial({ color: '#393e4a', roughness: 0.92 });
      const curbMat = new THREE.MeshStandardMaterial({ color: '#c4ccd8', roughness: 0.85 });
      const lineMat = new THREE.MeshBasicMaterial({ color: '#f4f7fc' });

      const loopPts = [];
      const segs = 40;
      const R = 13.4;
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        loopPts.push(new THREE.Vector3(Math.cos(a) * R, 1.03, Math.sin(a) * R));
      }
      const loopCurve = new THREE.CatmullRomCurve3(loopPts, true);
      const roadGroup = new THREE.Group();

      const buildRibbon = (curve, width, height, mat, steps) => {
        const pts = curve.getSpacedPoints(steps);
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          const len = a.distanceTo(b);
          if (len < 0.01) continue;
          const seg = new THREE.Mesh(new THREE.BoxGeometry(width, height, len + 0.18), mat);
          seg.position.copy(a).add(b).multiplyScalar(0.5);
          seg.lookAt(b);
          seg.receiveShadow = true;
          roadGroup.add(seg);
        }
      };

      buildRibbon(loopCurve, 3.85, 0.05, curbMat, 68);
      buildRibbon(loopCurve, 3.25, 0.07, roadMat, 68);

      const dashPts = loopCurve.getSpacedPoints(76);
      for (let i = 0; i < dashPts.length - 1; i += 2) {
        const a = dashPts[i], b = dashPts[i + 1];
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, a.distanceTo(b) * 0.85), lineMat);
        dash.position.copy(a).add(b).multiplyScalar(0.5);
        dash.lookAt(b);
        roadGroup.add(dash);
      }

      // 8 条连接建筑门前的支路 + 斑马线
      (PQ.buildings || []).forEach((b) => {
        const dx = b.wx + (b.doorOffset ? b.doorOffset[0] : 0);
        const dz = b.wz + (b.doorOffset ? b.doorOffset[1] : 0);
        const angle = Math.atan2(dz, dx);
        const sx = Math.cos(angle) * R;
        const sz = Math.sin(angle) * R;
        const spur = new THREE.CatmullRomCurve3([
          new THREE.Vector3(sx, 1.025, sz),
          new THREE.Vector3((sx + dx) * 0.5, 1.025, (sz + dz) * 0.5),
          new THREE.Vector3(dx, 1.025, dz)
        ]);
        buildRibbon(spur, 2.7, 0.05, curbMat, 10);
        buildRibbon(spur, 2.2, 0.07, roadMat, 10);

        // 斑马线 (在环路外缘 15.3 处)
        const zx = Math.cos(angle) * 15.6;
        const zz = Math.sin(angle) * 15.6;
        for (let s = -2; s <= 2; s++) {
          const zebra = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 1.15), lineMat);
          const px = zx - Math.sin(angle) * s * 0.44;
          const pz = zz + Math.cos(angle) * s * 0.44;
          zebra.position.set(px, 1.03, pz);
          zebra.rotation.y = -angle + Math.PI / 2;
          roadGroup.add(zebra);
        }
      });

      this.scene.add(roadGroup);

      // 6 盏可发光路灯
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.28;
        const lx = Math.cos(a) * 10.6, lz = Math.sin(a) * 10.6;
        const pv = new VoxelGrid();
        pv.fillBox(0, 0, 0, 0, 5, 0, '#2a3242');
        const lm = makeVoxelMesh(pv, 0.44, [0, 0, 0], this.solidMat);
        lm.position.set(lx, 1.0, lz);
        const bv = new VoxelGrid();
        bv.set(0, 6, 0, '#fff2b2');
        const bm = makeVoxelMesh(bv, 0.44, [0, 0, 0], this.glowMat, true);
        bm.position.set(lx, 1.0, lz);
        this.scene.add(lm, bm);
      }

      // 4 座循环变色红绿灯
      this.trafficLights = [0, 1.57, 3.14, 4.71].map((ang, i) => {
        const tx = Math.cos(ang) * 15.6, tz = Math.sin(ang) * 15.6;
        const pv = new VoxelGrid();
        pv.fillBox(0, 0, 0, 0, 4, 0, '#222836');
        pv.fillBox(0, 5, 0, 0, 6, 0, '#181c24');
        const post = makeVoxelMesh(pv, 0.42, [0, 0, 0], this.solidMat);
        post.position.set(tx, 1.0, tz);
        const bulb = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.32, 0.32),
          new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? '#4ad07a' : '#ff596c' })
        );
        bulb.position.set(tx, 3.35, tz);
        this.scene.add(post, bulb);
        return { bulb, offset: i * 1.5 };
      });

      // 14 辆风格各异的巡航车辆（双车道穿梭更忙碌热闹）
      const carDefs = [
        { kind: 'bus', c: '#d84552', r: '#e8edf5', t: 0.02, speed: 0.036, lane: 0.84 },
        { kind: 'car', c: '#ffcd5c', r: '#fff6d6', t: 0.11, speed: 0.044, lane: 0.84 },
        { kind: 'van', c: '#4f9df0', r: '#e3f2ff', t: 0.19, speed: -0.041, lane: -0.84 },
        { kind: 'car', c: '#4ad07a', r: '#e8fff0', t: 0.28, speed: 0.047, lane: 0.84 },
        { kind: 'bus', c: '#3fae6b', r: '#f0fff4', t: 0.36, speed: -0.035, lane: -0.84 },
        { kind: 'van', c: '#e87fa5', r: '#fff0f5', t: 0.45, speed: -0.039, lane: -0.84 },
        { kind: 'car', c: '#f59242', r: '#ffe8d6', t: 0.54, speed: 0.049, lane: 0.84 },
        { kind: 'car', c: '#ffffff', r: '#80d8ff', t: 0.62, speed: -0.045, lane: -0.84 },
        { kind: 'van', c: '#8e5aa8', r: '#f4e6ff', t: 0.70, speed: 0.038, lane: 0.84 },
        { kind: 'car', c: '#ffcd5c', r: '#ffffff', t: 0.77, speed: -0.048, lane: -0.84 },
        { kind: 'van', c: '#5cb9ff', r: '#ffffff', t: 0.83, speed: 0.042, lane: 0.84 },
        { kind: 'car', c: '#e05a6d', r: '#ffe8ee', t: 0.89, speed: -0.043, lane: -0.84 },
        { kind: 'car', c: '#4ad07a', r: '#e3f2ff', t: 0.94, speed: 0.046, lane: 0.84 },
        { kind: 'van', c: '#ffa94d', r: '#fff4e6', t: 0.98, speed: -0.037, lane: -0.84 }
      ];
      this.cars = carDefs.map((cd) => {
        const mesh = createCarMesh(cd, this.glowMat);
        this.scene.add(mesh);
        return { mesh, curve: loopCurve, t: cd.t, speed: cd.speed, lane: cd.lane };
      });
    },

    _buildPlazaCenterAndMilestones() {
      // 中央广场环形喷泉水池 + 4 张公园长椅 + 底座雕塑
      const fv = new VoxelGrid();
      fv.fillBox(-3, 0, -3, 3, 0, 3, (x, y, z) => (Math.abs(x) === 3 || Math.abs(z) === 3) ? '#b8c4d4' : null);
      fv.fillBox(-2, 0, -2, 2, 0, 2, '#4cc4ff');
      fv.fillBox(-1, 1, -1, 1, 2, 1, '#dce3ee');
      const fountainBase = makeVoxelMesh(fv, 0.58, [0, 0, 0], this.solidMat);
      fountainBase.position.set(0, 1.0, 0);
      this.scene.add(fountainBase);

      // 喷泉跳动水花
      for (let i = 0; i < 8; i++) {
        const drop = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.28, 0.28),
          new THREE.MeshBasicMaterial({ color: '#9ee6ff', transparent: true, opacity: 0.88 })
        );
        this.scene.add(drop);
        this.fountainDrops.push({ mesh: drop, angle: (i / 8) * Math.PI * 2, t: i / 8 });
      }

      // 4 张广场木质长椅
      [[0, -7.2, 0], [0, 7.2, Math.PI], [-7.2, 0, Math.PI / 2], [7.2, 0, -Math.PI / 2]].forEach(([bx, bz, rot]) => {
        const bv = new VoxelGrid();
        bv.fillBox(-2, 0, 0, 2, 0, 0, '#9c663b');
        bv.fillBox(-2, 1, -1, 2, 1, -1, '#7a4d2a');
        bv.set(-2, 0, -1, '#2a3240'); bv.set(2, 0, -1, '#2a3240');
        const bm = makeVoxelMesh(bv, 0.42, [0, 0, 0], this.solidMat);
        bm.position.set(bx, 1.0, bz);
        bm.rotation.y = rot;
        this.scene.add(bm);
      });

      // 公告木牌（放在长椅旁南侧广场边缘）
      const signVg = new VoxelGrid();
      signVg.fillBox(-2, 0, 0, -2, 3, 0, '#6e4a2d');
      signVg.fillBox(2, 0, 0, 2, 3, 0, '#6e4a2d');
      signVg.fillBox(-3, 2, 0, 3, 5, 0, (x, y) => (y === 5 || y === 2 || Math.abs(x) === 3) ? '#8f5a35' : '#f5ebd6');
      const signMesh = makeVoxelMesh(signVg, 0.42, [0, 0, 0]);
      signMesh.position.set(3.2, 1.0, 7.5);
      signMesh.rotation.y = -0.3;
      this.scene.add(signMesh);

      const list = PQ.milestones || [];
      this.milestones = list.map((ms, idx) => {
        const item = buildMilestoneSculpture(ms, idx, this.glowMat);
        if (ms.center) {
          item.group.position.set(0, 1.9, 0);
        } else {
          const r = 5.4;
          item.group.position.set(Math.cos(ms.angle) * r, 1.0, Math.sin(ms.angle) * r);
          item.group.lookAt(0, 1.0, 0);
        }
        this.scene.add(item.group);
        this.hitTargets.push(item.hit);
        return item;
      });
    },

    _buildBuildingsAndNpcs() {
      this.npcRigs = [];
      (PQ.buildings || []).forEach((b, idx) => {
        const built = buildBuilding3D(b, this.solidMat, this.glowMat);
        const dirX = (b.doorDir && b.doorDir[0]) || 0;
        const dirZ = (b.doorDir && b.doorDir[1]) || 1;
        built.group.position.set(b.wx, 1.0, b.wz);
        built.group.rotation.y = Math.atan2(dirX, dirZ);
        this.scene.add(built.group);
        this.hitTargets.push(built.hitBox);

        const doorX = b.wx + (b.doorOffset ? b.doorOffset[0] : dirX * 6.2);
        const doorZ = b.wz + (b.doorOffset ? b.doorOffset[1] : dirZ * 6.2);

        if (b.npcGuard) {
          const rig = buildCharacterRig3D(b.npcGuard, 0.145, this.solidMat);
          const sideX = -dirZ * 1.6;
          const sideZ = dirX * 1.6;
          rig.group.position.set(doorX + sideX, 1.0, doorZ + sideZ);
          rig.group.lookAt(doorX + sideX + dirX * 4, 1.0, doorZ + sideZ + dirZ * 4);
          this.scene.add(rig.group);
          this.npcRigs.push({ rig, phase: idx * 1.1 });
        }

        this.buildings[b.id] = {
          data: b,
          group: built.group,
          ring: built.ring,
          hitBox: built.hitBox,
          doorPos: new THREE.Vector3(doorX, 1.0, doorZ),
          labelAnchor: new THREE.Vector3(b.wx, b.id === 'hq' || b.id === 'data' ? 11.2 : 8.5, b.wz)
        };
      });
    },

    _buildDistrictPropsAndLandmarks() {
      // 1) 西部海岸木质码头 + 海面小帆船
      const pierVg = new VoxelGrid();
      pierVg.fillBox(-12, 1, -1, 0, 1, 2, (x) => (x % 2 === 0 ? '#9c6a43' : '#855836'));
      [[-11, -1], [-11, 2], [-6, -1], [-6, 2], [-1, -1], [-1, 2]].forEach(([px, pz]) => pierVg.fillBox(px, -2, pz, px, 2, pz, '#5c3d24'));
      const pierMesh = makeVoxelMesh(pierVg, 0.72, [0, 0, 0], this.solidMat);
      pierMesh.position.set(-36.5, 0.35, -3);
      this.scene.add(pierMesh);

      const boatVg = new VoxelGrid();
      boatVg.fillBox(-3, 0, -1, 3, 1, 1, '#a6623a');
      boatVg.fillBox(0, 2, 0, 0, 7, 0, '#6e4427');
      boatVg.fillBox(0, 3, 1, 0, 6, 3, '#ffffff');
      boatVg.set(0, 7, 1, '#e05a6d');
      this.sailboat = makeVoxelMesh(boatVg, 0.6, [0, 0, 0], this.solidMat);
      this.sailboat.position.set(-48.5, 0.25, -4);
      this.scene.add(this.sailboat);

      // 2) 东北角红色灯塔 + 旋转夜间灯锥
      const lhVg = new VoxelGrid();
      const lhGv = new VoxelGrid();
      lhVg.fillBox(-2, 0, -2, 2, 1, 2, '#9aa6b5');
      for (let y = 2; y <= 11; y++) {
        const col = (Math.floor((y - 2) / 2) % 2 === 0) ? '#e05a6d' : '#f4f7fc';
        lhVg.fillBox(-1, y, -1, 1, y, 1, col);
      }
      lhGv.fillBox(-1, 12, -1, 1, 13, 1, '#fff3a8');
      lhVg.fillBox(-1, 14, -1, 1, 14, 1, '#263042');
      const lhGrp = new THREE.Group();
      lhGrp.position.set(32, 2.0, -22);
      lhGrp.add(makeVoxelMesh(lhVg, 0.65, [0, 0, 0], this.solidMat));
      const lhGlow = makeVoxelMesh(lhGv, 0.65, [0, 0, 0], this.glowMat, true);
      lhGlow.castShadow = false;
      lhGrp.add(lhGlow);

      const beamGeo = new THREE.ConeGeometry(4.2, 24, 16, 1, true);
      beamGeo.translate(0, -12, 0);
      beamGeo.rotateX(Math.PI / 2);
      const beamMat = new THREE.MeshBasicMaterial({
        color: '#fff4a8', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false
      });
      this.lighthouseBeam = new THREE.Mesh(beamGeo, beamMat);
      this.lighthouseBeam.position.set(0, 8.2, 0);
      this.lighthouseBeam.rotation.order = 'YXZ';
      this.lighthouseBeam.rotation.x = -0.18;
      lhGrp.add(this.lighthouseBeam);
      this.scene.add(lhGrp);

      // 3) 咖啡馆 & 奶茶店 户外遮阳伞桌椅
      const addUmbrellaTable = (x, z, col1, col2) => {
        const uv = new VoxelGrid();
        uv.fillBox(-1, 1, -1, 1, 1, 1, '#f5efe6');
        uv.fillBox(0, 0, 0, 0, 4, 0, '#5e4532');
        uv.fillBox(-2, 5, -2, 2, 5, 2, (px) => (Math.abs(px) % 2 === 0 ? col1 : col2));
        uv.set(0, 6, 0, col1);
        const um = makeVoxelMesh(uv, 0.42, [0, 0, 0], this.solidMat);
        um.position.set(x, 1.0, z);
        this.scene.add(um);
      };
      addUmbrellaTable(-20, 7.5, '#d85b55', '#ffffff');
      addUmbrellaTable(-22, 10.5, '#d85b55', '#ffffff');
      addUmbrellaTable(13, 18.5, '#55c7a3', '#fff7fa');

      // 4) 工程部草坪无人机停机坪 & 悬停无人机
      const padMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.14, 2.6),
        new THREE.MeshStandardMaterial({ color: '#394c52', roughness: 0.7 })
      );
      padMesh.position.set(7.5, 1.05, 21.5);
      this.scene.add(padMesh);
      const dv = new VoxelGrid();
      dv.fillBox(-1, 0, -1, 1, 0, 1, '#5cb9ff');
      dv.set(-2, 0, -2, '#1f2836'); dv.set(2, 0, -2, '#1f2836');
      dv.set(-2, 0, 2, '#1f2836'); dv.set(2, 0, 2, '#1f2836');
      dv.set(0, 1, 0, '#ffcd75');
      this.drone = makeVoxelMesh(dv, 0.28, [0, 0, 0], this.glowMat);
      this.drone.position.set(7.5, 2.6, 21.5);
      this.scene.add(this.drone);

      // 5) 交易所门前金色体素公牛雕像
      const bullVg = new VoxelGrid();
      bullVg.fillBox(-2, 0, -1, 2, 0, 1, '#dce3ee');
      bullVg.fillBox(-1, 1, -1, 1, 2, 2, '#f5c242');
      bullVg.set(-1, 3, 2, '#ffe896'); bullVg.set(1, 3, 2, '#ffe896');
      const bull = makeVoxelMesh(bullVg, 0.45, [0, 0, 0], { roughness: 0.35, metalness: 0.3 });
      bull.position.set(20.5, 1.0, 6.8);
      bull.rotation.y = -Math.PI / 2;
      this.scene.add(bull);

      // 6) 公交站亭 & 3 台发光自动售货机
      const busVg = new VoxelGrid();
      busVg.fillBox(-3, 0, -1, 3, 0, 1, '#b8c3d4');
      busVg.fillBox(-3, 1, -1, -3, 4, -1, '#4f9df0');
      busVg.fillBox(3, 1, -1, 3, 4, -1, '#4f9df0');
      busVg.fillBox(-3, 5, -1, 3, 5, 2, '#e6eef8');
      const busStop = makeVoxelMesh(busVg, 0.48, [0, 0, 0], this.solidMat);
      busStop.position.set(14.5, 1.0, 6.2);
      busStop.rotation.y = -Math.PI / 3;
      this.scene.add(busStop);

      [[15.5, 13.5, '#ff758f'], [-15.5, -12.5, '#4f9df0'], [-4.5, 17.8, '#4ad07a']].forEach(([vx, vz, vc]) => {
        const vv = new VoxelGrid();
        const vgv = new VoxelGrid();
        vv.fillBox(-1, 0, -1, 1, 3, 0, vc);
        vgv.fillBox(0, 1, 1, 0, 2, 1, '#e6f9ff');
        const vm = makeVoxelMesh(vv, 0.4, [0, 0, 0], this.solidMat);
        const vgm = makeVoxelMesh(vgv, 0.4, [0, 0, 0], this.glowMat, true);
        vm.position.set(vx, 1.0, vz);
        vgm.position.set(vx, 1.0, vz);
        this.scene.add(vm, vgm);
      });
    },

    _buildCitizens() {
      const roles = [
        'citizen1', 'citizen2', 'citizen3', 'citizen4',
        'citizen5', 'citizen6', 'akai', 'xiaoyu',
        'citizen1', 'citizen3', 'citizen5', 'citizen6'
      ];
      const rings = [8.8, 10.6, 16.4];
      this.citizens = roles.map((role, idx) => {
        const rig = buildCharacterRig3D(role, 0.14, this.solidMat);
        this.scene.add(rig.group);
        return {
          rig,
          angle: (idx / roles.length) * Math.PI * 2,
          speed: (idx % 2 === 0 ? 1 : -1) * (0.16 + (idx % 4) * 0.035),
          radius: rings[idx % rings.length] + (idx % 2) * 0.35,
          phase: idx * 1.4
        };
      });
    },

    _buildContinents() {
      this.continents = (PQ.continents || []).map((c) => {
        const item = buildContinentIsland(c);
        this.scene.add(item.group);
        this.hitTargets.push(item.hit);
        return item;
      });
    },

    rebuildPlayer() {
      if (!this.scene) return;
      if (this.playerRig) {
        this.scene.remove(this.playerRig.group);
      }
      this.playerRig = buildCharacterRig3D('me', 0.15, this.solidMat);
      this.playerRig.group.position.copy(this.playerPos);
      this.playerRig.group.visible = (this.mode !== 'fp');
      this.scene.add(this.playerRig.group);

      if (!this.goalRing) {
        const geo = new THREE.RingGeometry(0.45, 0.75, 24);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({
          color: '#ffcd75', transparent: true, opacity: 0.85, side: THREE.DoubleSide
        });
        this.goalRing = new THREE.Mesh(geo, mat);
        this.goalRing.visible = false;
        this.scene.add(this.goalRing);
      }
    },

    /* ---------- 3D 人物肖像 / 旋转展示台渲染器 ---------- */
    _ensurePortraitEnv() {
      if (this._portraitEnv || !window.THREE) return this._portraitEnv;
      try {
        const w = 320, h = 420;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(1);
        renderer.setSize(w, h, false);
        if (renderer.outputColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 40);
        camera.position.set(0, 1.98, 6.2);
        camera.lookAt(0, 1.32, 0);

        scene.add(new THREE.HemisphereLight('#ffffff', '#ffdce8', 1.85));
        const keyLight = new THREE.DirectionalLight('#fffdf8', 1.55);
        keyLight.position.set(2, 4, 6);
        const rimLight = new THREE.DirectionalLight('#a8e6ff', 0.9);
        rimLight.position.set(-4, 3, -3);
        scene.add(keyLight, rimLight);

        const pv = new VoxelGrid();
        pv.fillBox(-3, 0, -3, 3, 0, 3, (x, y, z) => (Math.abs(x) === 3 && Math.abs(z) === 3) ? null : (Math.abs(x) === 3 || Math.abs(z) === 3) ? '#ffd454' : '#ffffff');
        const pedestal = makeVoxelMesh(pv, 0.24, [-0.5, -1, -0.5], { roughness: 0.32, emissive: '#fff9ef', emissiveIntensity: 0.18 });
        pedestal.castShadow = false;
        scene.add(pedestal);

        const holder = new THREE.Group();
        scene.add(holder);

        this._rigCache = new Map();
        this._portraitEnv = { renderer, scene, camera, pedestal, holder, w, h };
      } catch (e) {
        this._portraitEnv = null;
      }
      return this._portraitEnv;
    },

    renderCharacterToCanvas(canvas, key, opt) {
      if (!canvas) return;
      const env = this._ensurePortraitEnv();
      if (!env) return;
      opt = opt || {};
      const avSig = (key === 'me' && typeof G !== 'undefined' && G && G.avatar)
        ? `${G.avatar.style}|${G.avatar.outfit}|${G.avatar.hair}|${G.avatar.skin}|${G.avatar.cloth}|${G.avatar.glasses}|${G.avatar.prop}`
        : '';
      const cacheKey = `${key}|${avSig}|${opt.mouthOpen ? 1 : 0}|${opt.blink ? 1 : 0}`;
      let rig = this._rigCache.get(cacheKey);
      if (!rig) {
        rig = buildCharacterRig3D(key, 0.165, this.solidMat || { roughness: 0.78 }, {
          mouthOpen: !!opt.mouthOpen,
          blink: !!opt.blink
        });
        if (this._rigCache.size > 48) {
          const firstKey = this._rigCache.keys().next().value;
          this._rigCache.delete(firstKey);
        }
        this._rigCache.set(cacheKey, rig);
      }

      while (env.holder.children.length > 0) env.holder.remove(env.holder.children[0]);
      env.holder.add(rig.group);
      env.pedestal.visible = opt.pedestal !== false;
      const yaw = opt.yaw !== undefined ? opt.yaw : 0.28;
      rig.group.rotation.y = yaw;
      env.pedestal.rotation.y = yaw;
      animateRig(rig, !!opt.walking, opt.timeSec || 0, opt.phase || 0);

      env.renderer.render(env.scene, env.camera);
      if (canvas.width !== env.w || canvas.height !== env.h) {
        canvas.width = env.w;
        canvas.height = env.h;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(env.renderer.domElement, 0, 0, canvas.width, canvas.height);
      }
    },

    _bindAvatarTurntable() {
      const avCanvas = document.getElementById('av-prev');
      if (!avCanvas || avCanvas.dataset.bound3d) return;
      avCanvas.dataset.bound3d = '1';
      let lastX = 0;
      avCanvas.addEventListener('pointerdown', (e) => {
        avCanvas.setPointerCapture(e.pointerId);
        this.avDragging = true;
        lastX = e.clientX;
      });
      avCanvas.addEventListener('pointermove', (e) => {
        if (!this.avDragging) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        this.avTurntableYaw += dx * 0.015;
      });
      const stop = () => { this.avDragging = false; };
      avCanvas.addEventListener('pointerup', stop);
      avCanvas.addEventListener('pointercancel', stop);
    },

    _syncTimeButtons(label) {
      ['isl-time-btn', 'land-time-btn'].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.textContent = label;
          btn.classList.toggle('active', this.timeMode !== 'clock' && this.timeMode !== 'day');
        }
      });
    },

    /* ---------- 实时时间 & 日夜切换控制 ---------- */
    cycleTimeOfDay() {
      const order = ['clock', 'day', 'sunset', 'night', 'auto'];
      const next = order[(order.indexOf(this.timeMode) + 1) % order.length];
      this.setTimeOfDay(next);
    },

    setTimeOfDay(mode, silent) {
      this.timeMode = mode;
      if (mode === 'clock') {
        const info = this._getClockTodTarget();
        this._syncTimeButtons(info.label);
      } else {
        const map = { day: '☀️ 晴昼', sunset: '🌇 黄昏', night: '🌙 星夜', auto: '🔄 昼夜' };
        this._syncTimeButtons(map[mode] || '☀️ 晴昼');
      }
      if (!silent) {
        const tips = {
          clock: '已同步本地实时时间，天色与光影随现实时间自动变化',
          day: '晴昼光照：全岛阳光明媚',
          sunset: '黄昏落日：城市华灯初上，流萤渐起',
          night: '星夜模式：星空、明月、旋转灯塔与万家灯火已点亮',
          auto: '自动昼夜流转演示已开启'
        };
        this.setStatus(tips[mode] || '', 3000);
      }
    },

    _lerpPreset(a, b, k) {
      return {
        sky: a.sky.clone().lerp(b.sky, k),
        fog: a.fog.clone().lerp(b.fog, k),
        fogDensity: a.fogDensity + (b.fogDensity - a.fogDensity) * k,
        ocean: a.ocean.clone().lerp(b.ocean, k),
        sunColor: a.sunColor.clone().lerp(b.sunColor, k),
        sunPos: a.sunPos.clone().lerp(b.sunPos, k),
        sunInt: a.sunInt + (b.sunInt - a.sunInt) * k,
        hemiSky: a.hemiSky.clone().lerp(b.hemiSky, k),
        hemiGround: a.hemiGround.clone().lerp(b.hemiGround, k),
        hemiInt: a.hemiInt + (b.hemiInt - a.hemiInt) * k,
        glowInt: a.glowInt + (b.glowInt - a.glowInt) * k,
        lampInt: a.lampInt + (b.lampInt - a.lampInt) * k,
        starOp: a.starOp + (b.starOp - a.starOp) * k,
        moonOp: a.moonOp + (b.moonOp - a.moonOp) * k,
        beamOp: a.beamOp + (b.beamOp - a.beamOp) * k,
        fireflyOp: a.fireflyOp + (b.fireflyOp - a.fireflyOp) * k
      };
    },

    _getClockTodTarget() {
      const now = new Date();
      const hr = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      let preset, period;
      if (hr >= 5.5 && hr < 7.5) {
        const k = (hr - 5.5) / 2.0;
        preset = k < 0.5
          ? this._lerpPreset(TOD_PRESETS.night, TOD_PRESETS.sunset, k * 2)
          : this._lerpPreset(TOD_PRESETS.sunset, TOD_PRESETS.day, (k - 0.5) * 2);
        period = '破晓';
      } else if (hr >= 7.5 && hr < 16.5) {
        const t = (hr - 7.5) / 9.0;
        const sunX = 56 - t * 112;
        const sunY = 46 + Math.sin(t * Math.PI) * 32;
        preset = Object.assign({}, TOD_PRESETS.day, {
          sunPos: new THREE.Vector3(sunX, sunY, 36)
        });
        period = '晴昼';
      } else if (hr >= 16.5 && hr < 19.0) {
        const k = (hr - 16.5) / 2.5;
        preset = k < 0.5
          ? this._lerpPreset(TOD_PRESETS.day, TOD_PRESETS.sunset, k * 2)
          : this._lerpPreset(TOD_PRESETS.sunset, TOD_PRESETS.night, (k - 0.5) * 2);
        period = '黄昏';
      } else {
        preset = TOD_PRESETS.night;
        period = '星夜';
      }
      return { preset, label: `🕒 ${hh}:${mm} · ${period}` };
    },

    /* ---------- 进度同步 ---------- */
    refreshState() {
      if (!this.inited) return;
      const progress = (typeof G !== 'undefined' && G.progress) || 0;
      const levels = PQ.levels || [];
      const curLv = Math.min(progress, Math.max(0, levels.length - 1));
      const curId = levels[curLv] && levels[curLv].id;

      let curBldId = 'hq';
      (PQ.buildings || []).forEach((b) => {
        const states = (b.levels || []).map((id) => {
          const i = levels.findIndex((l) => l.id === id);
          return i < progress ? 'done' : i === progress ? 'current' : 'locked';
        });
        const isCurrent = progress < levels.length && (b.levels || []).includes(curId);
        if (isCurrent) curBldId = b.id;
        const allDone = b.levels && b.levels.length > 0 && states.every((s) => s === 'done');

        const entry = this.buildings[b.id];
        if (entry) {
          entry.isCurrent = isCurrent;
          entry.allDone = allDone;
          entry.doneCount = states.filter((s) => s === 'done').length;
          entry.totalCount = (b.levels || []).length;
          entry.ring.material.color.set(isCurrent ? '#ffcd75' : allDone ? '#4ad07a' : '#8fa7c9');
          entry.ring.material.opacity = isCurrent ? 0.88 : (this.activeBuildingId === b.id ? 0.7 : 0.16);
        }
      });
      this.currentQuestBldId = progress >= levels.length ? 'hq' : curBldId;

      let unlockedCount = 0;
      let newlyUnlocked = null;
      this.milestones.forEach((m) => {
        const lvIdx = levels.findIndex((l) => l.id === m.ms.bossId);
        const unlocked = lvIdx >= 0 && lvIdx < progress;
        if (unlocked) unlockedCount++;
        const wasVisible = m.artMesh.visible;
        m.artMesh.visible = unlocked;
        m.holoMesh.visible = !unlocked;
        m.unlocked = unlocked;
        if (unlocked && !wasVisible && this.lastMilestoneUnlocked >= 0) {
          newlyUnlocked = m;
          m.popStart = performance.now();
        }
      });
      if (this.lastMilestoneUnlocked === -1) {
        this.lastMilestoneUnlocked = unlockedCount;
      } else if (unlockedCount > this.lastMilestoneUnlocked) {
        this.lastMilestoneUnlocked = unlockedCount;
        if (newlyUnlocked) {
          this.setStatus(`Sculpting voxels... 新里程碑「${newlyUnlocked.ms.title}」已在中央广场落成！`, 4500);
        }
      }

      const chip = document.getElementById('isl-quest-chip');
      if (chip) {
        if (progress >= levels.length) {
          chip.textContent = '★ 全章通关 · 欢迎漫游星火岛';
        } else {
          const bName = (this.buildings[this.currentQuestBldId] && this.buildings[this.currentQuestBldId].data.name) || '星火科技';
          const lvName = (levels[curLv] && levels[curLv].name) || '';
          chip.textContent = `主线任务：${bName} · ${lvName}`;
        }
      }
      this._ensureLabels();
    },

    /* ---------- 生命周期与模式控制 & 云层拨开俯冲 ---------- */
    setCloudOpen(val, snap) {
      this.cloudGateTarget = val;
      if (snap) this.cloudGateOpen = val;
    },

    partCloudsAndDiveTo(stage, callback) {
      this.init();
      clearTimeout(this._cloudTimer);
      this.cloudGateTarget = 1;
      const veil = document.getElementById('cloud-veil');
      if (veil) {
        veil.classList.remove('active');
        void veil.offsetWidth;
        veil.classList.add('active');
      }
      if (stage === 'avatar') {
        this.cinematicMode = 'avatar';
        this.archipelago = false;
        this.camTarget = { x: 0, y: 2.2, z: 2 };
        this.spherical = { radius: 24, polar: 0.88, azimuth: this.curSpherical.azimuth + 0.35 };
        this.diveAnim = {
          start: performance.now(),
          dur: 760,
          fromTarget: { ...this.camCurTarget },
          toTarget: { x: 0, y: 2.2, z: 2 },
          fromRadius: this.curSpherical.radius,
          toRadius: 24,
          fromPolar: this.curSpherical.polar,
          toPolar: 0.88
        };
      } else if (stage === 'map') {
        this.cinematicMode = null;
        this.archipelago = false;
        this.camTarget = { x: 0, y: 1.8, z: 2 };
        this.spherical = { radius: this.mode === 'walk' ? 14.5 : 54, polar: this.mode === 'walk' ? 1.02 : 0.80, azimuth: 0.56 };
        this.diveAnim = {
          start: performance.now(),
          dur: 780,
          fromTarget: { ...this.camCurTarget },
          toTarget: { ...this.camTarget },
          fromRadius: this.curSpherical.radius,
          toRadius: this.spherical.radius,
          fromPolar: this.curSpherical.polar,
          toPolar: this.spherical.polar
        };
      }
      if (callback) {
        this._cloudTimer = setTimeout(callback, 320);
      }
    },

    setCinematic(mode, snap) {
      this.cinematicMode = mode || null;
      if (this.cinematicMode === 'landing') {
        this.archipelago = false;
        this.camTarget = { x: 0, y: 2.2, z: 2 };
        this.spherical.radius = 64;
        this.spherical.polar = 0.74;
        this.cloudGateTarget = 0;
        if (snap) this.cloudGateOpen = 0;
      } else if (this.cinematicMode === 'avatar') {
        this.archipelago = false;
        this.camTarget = { x: 0, y: 2.2, z: 2 };
        this.spherical.radius = 24;
        this.spherical.polar = 0.88;
        this.cloudGateTarget = 1;
        if (snap) this.cloudGateOpen = 1;
      }
      if (snap) {
        Object.assign(this.camCurTarget, this.camTarget);
        Object.assign(this.curSpherical, this.spherical);
      }
    },

    onShow(opts) {
      opts = opts || {};
      this.init();
      this.refreshState();
      this._resize();

      if (opts.diveFromBadge) {
        this.partCloudsAndDiveTo('map');
      } else {
        this.diveAnim = null;
        if (opts.cinematic) {
          this.setCinematic(opts.cinematic, !!opts.snap);
        } else {
          this.setCinematic(null);
          this.setCloudOpen(1, !!opts.snap);
          if (opts.archipelago) {
            this.setArchipelago(true, true);
          } else {
            this.setArchipelago(false, true);
            if (opts.focusCurrent !== false && this.mode !== 'walk' && this.mode !== 'fp') {
              this.recentre(true);
            }
          }
        }
      }

      if (!this.running) {
        this.running = true;
        this._lastTime = performance.now();
        this._loop(this._lastTime);
      }
    },

    onHide() {
      this.running = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = 0;
      }
      this.keys = {};
      this.joyVec = { x: 0, z: 0 };
    },

    setMode(mode) {
      this.mode = mode;
      this.walkGoal = null;
      if (this.goalRing) this.goalRing.visible = false;
      if (this.archipelago) this.setArchipelago(false);

      const mapScreen = document.getElementById('map-screen');
      if (mapScreen) mapScreen.dataset.mode = mode;

      document.querySelectorAll('#isl-toolbar [data-cam]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.cam === mode);
      });
      const joy = document.getElementById('isl-joy');
      if (joy) joy.classList.toggle('show', mode === 'walk' || mode === 'fp');
      if (this.playerRig) {
        this.playerRig.group.visible = (mode !== 'fp');
      }

      if (mode === 'fp') {
        this.fpYaw = this.playerYaw;
        this.fpPitch = -0.04;
        this.setStatus('第一人称模式：拖拽环视街道，WASD / 方向键 / 点击地面行走，靠近建筑按 E 互动', 4200);
      } else if (mode === 'walk') {
        this.camTarget.x = this.playerPos.x;
        this.camTarget.y = 2.0;
        this.camTarget.z = this.playerPos.z;
        this.spherical.radius = 14.5;
        this.spherical.polar = 1.02;
        this.setStatus('漫步模式：WASD / 方向键 或 点击地面移动立体小人，靠近建筑按 E 互动', 3800);
      } else if (mode === 'orbit') {
        this.spherical.radius = Math.max(24, Math.min(this.spherical.radius, 76));
        this.spherical.polar = 0.84;
        this.setStatus('环绕模式：左键拖拽 360° 旋转视角，滚轮缩放，右键平移', 3000);
      } else {
        this.spherical.radius = 54;
        this.spherical.polar = 0.80;
        this.spherical.azimuth = 0.56;
        this.setStatus('平移模式：拖拽探索星火岛，点击建筑开启关卡，右上角可切换第一人称与昼夜', 3200);
      }
    },

    setArchipelago(on, snap) {
      this.archipelago = !!on;
      const btn = document.getElementById('isl-arch-btn');
      if (btn) btn.classList.toggle('active', this.archipelago);

      if (this.archipelago) {
        if (this.mode === 'fp') this.setMode('pan');
        this.camTarget = { x: 18, y: 1.5, z: 6 };
        this.spherical = { radius: 132, polar: 0.76, azimuth: 0.44 };
        this.setStatus('群岛全览：点击「产品大陆 · 星火岛」着陆，或查看周边待开放大陆', 4000);
      } else {
        this.camTarget = { x: 0, y: 1.8, z: 2 };
        this.spherical = { radius: this.mode === 'walk' ? 14.5 : 54, polar: this.mode === 'walk' ? 1.02 : 0.80, azimuth: 0.56 };
        this.setStatus('已着陆「产品大陆 · 星火岛」：点击建筑开启关卡，或切换漫步 / 第一人称探索', 3200);
      }
      if (snap) {
        Object.assign(this.camCurTarget, this.camTarget);
        Object.assign(this.curSpherical, this.spherical);
      }
    },

    toggleArchipelago() {
      this.setArchipelago(!this.archipelago);
    },

    recentre(snap) {
      if (this.archipelago) this.setArchipelago(false, snap);
      if (!this.cinematicMode && (this.mode === 'walk' || this.mode === 'fp')) {
        this.camTarget = { x: this.playerPos.x, y: 2.0, z: this.playerPos.z };
        if (this.mode === 'walk') { this.spherical.radius = 14.5; this.spherical.polar = 1.02; }
        else { this.fpPitch = -0.04; }
      } else {
        const b = this.buildings[this.currentQuestBldId];
        if (b) this.camTarget = { x: b.data.wx * 0.65, y: 2.0, z: b.data.wz * 0.65 };
        else this.camTarget = { x: 0, y: 2.0, z: 0 };
        this.spherical.radius = 54;
        this.spherical.polar = 0.80;
        this.spherical.azimuth = 0.56;
      }
      if (snap) {
        Object.assign(this.camCurTarget, this.camTarget);
        Object.assign(this.curSpherical, this.spherical);
      }
    },

    focusBuilding(id, skipPanel) {
      if (this.archipelago) this.setArchipelago(false);
      const entry = this.buildings[id];
      if (!entry) return;
      this.activeBuildingId = id;
      if (this.mode !== 'walk' && this.mode !== 'fp') {
        this.camTarget = { x: entry.data.wx, y: 3.0, z: entry.data.wz };
        this.spherical.radius = Math.min(this.spherical.radius, 34);
      }
      Object.values(this.buildings).forEach((b) => {
        b.ring.material.opacity = b.data.id === id ? 0.9 : b.isCurrent ? 0.72 : 0.16;
      });
      if (!skipPanel && typeof G !== 'undefined' && G.openBuilding) {
        G.openBuilding(entry.data);
      }
    },

    zoomIntoBuilding(id, callback) {
      const entry = this.buildings[id];
      if (!entry || !this.running) {
        callback && callback();
        return;
      }
      if (this.mode === 'fp') {
        this.setMode('walk');
      }
      this.diveAnim = {
        start: performance.now(),
        dur: 520,
        fromTarget: { ...this.camCurTarget },
        toTarget: { x: entry.doorPos.x, y: 3.2, z: entry.doorPos.z },
        fromRadius: this.curSpherical.radius,
        toRadius: 9.5,
        cb: callback
      };
    },

    setStatus(text, ttl) {
      const el = document.getElementById('isl-status');
      if (!el) return;
      el.textContent = text;
      el.classList.add('show');
      clearTimeout(this._statusTimer);
      if (ttl) this._statusTimer = setTimeout(() => el.classList.remove('show'), ttl);
    },

    /* ---------- 3D 浮标投影 ---------- */
    _ensureLabels() {
      const layer = document.getElementById('island-labels');
      if (!layer) return;
      if (!this._labelEls) {
        layer.innerHTML = '';
        this._labelEls = {};
        Object.values(this.buildings).forEach((entry) => {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'isl-pin';
          el.onclick = (e) => { e.stopPropagation(); this.focusBuilding(entry.data.id); };
          layer.appendChild(el);
          this._labelEls['b_' + entry.data.id] = el;
        });
        this.continents.forEach((c) => {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'isl-pin isl-cont-pin';
          el.innerHTML = `<span class="pin-nm">${c.data.name}</span><span class="pin-badge soon">开发中</span>`;
          el.onclick = (e) => {
            e.stopPropagation();
            this.setStatus(`「${c.data.name}」${c.data.sub} — 主线目前集中在「星火岛」`, 3200);
          };
          layer.appendChild(el);
          this._labelEls['c_' + c.data.id] = el;
        });
        const homePin = document.createElement('button');
        homePin.type = 'button';
        homePin.className = 'isl-pin isl-home-pin';
        homePin.innerHTML = `<span class="pin-nm">产品大陆 · 星火岛</span><span class="pin-badge done">点击着陆</span>`;
        homePin.onclick = (e) => { e.stopPropagation(); this.setArchipelago(false); };
        layer.appendChild(homePin);
        this._labelEls['home'] = homePin;

        // 城市热闹氛围微浮标（着陆页与大陆远景凸显生机与忙碌感）
        this._bustleList = [
          { key: 'b1', x: -2,  y: 12.2, z: -18, text: '💡 激辩 MVP 中' },
          { key: 'b2', x: 18,  y: 11.4, z: -16, text: '📈 留存率 +18%' },
          { key: 'b3', x: -20, y: 9.6,  z: -5,  text: '☕ 手冲续命中' },
          { key: 'b4', x: -16, y: 10.6, z: 20,  text: '🔥 紧急发版中' },
          { key: 'b5', x: 14,  y: 9.6,  z: 18,  text: '🧋 需求对齐会' },
          { key: 'b6', x: 2,   y: 6.4,  z: 2,   text: '📊 A/B 实验跑通' }
        ];
        this._bustleList.forEach((bs, idx) => {
          const el = document.createElement('div');
          el.className = 'isl-bustle';
          el.textContent = bs.text;
          el.style.animationDelay = `${(idx * 0.45).toFixed(2)}s`;
          layer.appendChild(el);
          this._labelEls['bustle_' + bs.key] = el;
        });
      }

      Object.values(this.buildings).forEach((entry) => {
        const el = this._labelEls['b_' + entry.data.id];
        if (!el) return;
        const b = entry.data;
        let badge = '';
        el.classList.toggle('current', !!entry.isCurrent);
        el.classList.toggle('done', !!entry.allDone);
        if (b.archive) badge = '<span class="pin-badge side">支线</span>';
        else if (entry.isCurrent) badge = '<span class="pin-badge quest">! 主线</span>';
        else if (entry.allDone) badge = '<span class="pin-badge done">✔</span>';
        else if (entry.totalCount) badge = `<span class="pin-badge">${entry.doneCount}/${entry.totalCount}</span>`;
        el.innerHTML = `<span class="pin-nm">${b.name}</span>${badge}`;
      });
    },

    _updateLabels() {
      if (!this._labelEls || !this.renderer) return;
      const w = this.renderer.domElement.clientWidth;
      const h = this.renderer.domElement.clientHeight;
      const v = new THREE.Vector3();

      const project = (worldPos, el, visible) => {
        if (!el) return;
        if (!visible) { el.style.display = 'none'; return; }
        v.copy(worldPos).project(this.camera);
        if (v.z > 1 || v.z < -1) { el.style.display = 'none'; return; }
        const sx = (v.x * 0.5 + 0.5) * w;
        const sy = (-v.y * 0.5 + 0.5) * h;
        if (sx < -60 || sx > w + 60 || sy < -40 || sy > h + 40) {
          el.style.display = 'none';
          return;
        }
        el.style.display = 'inline-flex';
        el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
      };

      const isLanding = this.cinematicMode === 'landing';
      const isAvatar = this.cinematicMode === 'avatar';
      Object.values(this.buildings).forEach((entry) => {
        project(entry.labelAnchor, this._labelEls['b_' + entry.data.id], !isLanding && !isAvatar && !this.archipelago);
      });
      this.continents.forEach((c) => {
        const showC = !isAvatar && (isLanding || this.archipelago || (this.mode !== 'fp' && this.curSpherical.radius > 60));
        project(new THREE.Vector3(c.data.wx, 12, c.data.wz), this._labelEls['c_' + c.data.id], showC);
      });
      project(new THREE.Vector3(0, 14, 0), this._labelEls['home'], !isLanding && !isAvatar && this.archipelago);
      if (this._bustleList) {
        const showBustle = isLanding || (!isAvatar && !this.archipelago && this.mode === 'pan');
        this._bustleList.forEach((bs) => {
          project(new THREE.Vector3(bs.x, bs.y, bs.z), this._labelEls['bustle_' + bs.key], showBustle);
        });
      }
    },

    /* ---------- 交互事件 ---------- */
    _bindEvents() {
      const canvas = this.renderer.domElement;
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());

      canvas.addEventListener('pointerdown', (e) => {
        canvas.setPointerCapture(e.pointerId);
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, btn: e.button });
        if (this.pointers.size === 1) {
          this.dragStart = { x: e.clientX, y: e.clientY, moved: 0, btn: e.button };
        } else if (this.pointers.size === 2) {
          const pts = [...this.pointers.values()];
          this.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        }
      });

      canvas.addEventListener('pointermove', (e) => {
        const prev = this.pointers.get(e.pointerId);
        if (!prev) return;
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, btn: prev.btn });

        if (this.pointers.size === 2) {
          const pts = [...this.pointers.values()];
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          if (this.pinchDist > 0 && this.mode !== 'fp') {
            const delta = (this.pinchDist - dist) * 0.14;
            this.spherical.radius = Math.max(12, Math.min(135, this.spherical.radius + delta));
          }
          this.pinchDist = dist;
          return;
        }

        if (this.dragStart) this.dragStart.moved += Math.hypot(dx, dy);

        if (this.mode === 'fp') {
          this.fpYaw -= dx * 0.0055;
          this.fpPitch = Math.max(-0.78, Math.min(0.85, this.fpPitch - dy * 0.0045));
          return;
        }

        const isRight = prev.btn === 2 || e.shiftKey;
        if (this.mode === 'pan' && !isRight && !this.archipelago) {
          this._panByScreenDelta(dx, dy);
        } else if (this.mode === 'orbit' && isRight) {
          this._panByScreenDelta(dx, dy);
        } else {
          this.spherical.azimuth -= dx * 0.0075;
          this.spherical.polar = Math.max(0.32, Math.min(1.28, this.spherical.polar - dy * 0.0065));
        }
      });

      const endPtr = (e) => {
        const wasSingle = this.pointers.size === 1;
        this.pointers.delete(e.pointerId);
        if (this.pointers.size < 2) this.pinchDist = 0;
        if (wasSingle && this.dragStart && this.dragStart.moved < 7 && this.dragStart.btn === 0) {
          this._handleTap(e.clientX, e.clientY);
        }
        if (this.pointers.size === 0) this.dragStart = null;
      };
      canvas.addEventListener('pointerup', endPtr);
      canvas.addEventListener('pointercancel', endPtr);

      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (this.mode === 'fp') return;
        const factor = e.deltaY * 0.045;
        const maxR = this.archipelago ? 148 : 96;
        const minR = this.mode === 'walk' ? 9 : 15;
        this.spherical.radius = Math.max(minR, Math.min(maxR, this.spherical.radius + factor));
      }, { passive: false });

      window.addEventListener('keydown', (e) => {
        if (!this.running) return;
        const k = e.key.toLowerCase();
        this.keys[k] = true;
        if (k === 'e' && (this.mode === 'walk' || this.mode === 'fp') && this.nearBuildingId) {
          this.focusBuilding(this.nearBuildingId);
        }
      });
      window.addEventListener('keyup', (e) => {
        this.keys[e.key.toLowerCase()] = false;
      });
      window.addEventListener('resize', () => this._resize());

      const joy = document.getElementById('isl-joy');
      const knob = document.getElementById('isl-joy-knob');
      if (joy && knob) {
        let jId = null;
        const updateJoy = (cx, cy) => {
          const rect = joy.getBoundingClientRect();
          const mx = rect.left + rect.width / 2;
          const my = rect.top + rect.height / 2;
          const maxR = rect.width * 0.38;
          let dx = cx - mx, dy = cy - my;
          const len = Math.hypot(dx, dy);
          if (len > maxR) { dx = dx / len * maxR; dy = dy / len * maxR; }
          knob.style.transform = `translate(${dx}px, ${dy}px)`;
          this.joyVec.x = dx / maxR;
          this.joyVec.z = dy / maxR;
        };
        joy.addEventListener('pointerdown', (e) => {
          e.stopPropagation(); joy.setPointerCapture(e.pointerId); jId = e.pointerId; updateJoy(e.clientX, e.clientY);
        });
        joy.addEventListener('pointermove', (e) => { if (e.pointerId === jId) updateJoy(e.clientX, e.clientY); });
        const endJoy = (e) => {
          if (e.pointerId !== jId) return;
          jId = null; knob.style.transform = ''; this.joyVec.x = 0; this.joyVec.z = 0;
        };
        joy.addEventListener('pointerup', endJoy);
        joy.addEventListener('pointercancel', endJoy);
      }
    },

    _panByScreenDelta(dx, dy) {
      const speed = this.curSpherical.radius * 0.0018;
      const sinA = Math.sin(this.curSpherical.azimuth);
      const cosA = Math.cos(this.curSpherical.azimuth);
      this.camTarget.x -= (dx * cosA + dy * sinA) * speed;
      this.camTarget.z -= (-dx * sinA + dy * cosA) * speed;
      this.camTarget.x = Math.max(-36, Math.min(36, this.camTarget.x));
      this.camTarget.z = Math.max(-30, Math.min(30, this.camTarget.z));
    },

    _handleTap(clientX, clientY) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(ndc, this.camera);

      const hits = this.raycaster.intersectObjects(this.hitTargets, false);
      if (hits.length > 0) {
        const ud = hits[0].object.userData;
        if (ud.buildingId) { this.focusBuilding(ud.buildingId); return; }
        if (ud.milestoneId) {
          const item = this.milestones.find((m) => m.ms.id === ud.milestoneId);
          if (item) {
            this.setStatus(
              item.unlocked
                ? `★ 广场雕塑「${item.ms.title}」（${item.ms.ch}）：${item.ms.desc}`
                : `🔮 蓝图「${item.ms.title}」：通关「${item.ms.ch}」后在此筑起实体雕塑`,
              4500
            );
          }
          return;
        }
        if (ud.continentId) {
          const cont = this.continents.find((c) => c.data.id === ud.continentId);
          if (cont) this.setStatus(`「${cont.data.name}」${cont.data.sub} — 主线目前集中在星火岛`, 3200);
          return;
        }
      }

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.02);
      const pt = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(plane, pt)) {
        if (this.archipelago && this._isOnIsland(pt.x, pt.z) < 1.05) {
          this.setArchipelago(false);
          return;
        }
        if ((this.mode === 'walk' || this.mode === 'fp') && this._isOnIsland(pt.x, pt.z) < 0.88) {
          this.walkGoal = new THREE.Vector3(pt.x, 1.04, pt.z);
          if (this.goalRing) {
            this.goalRing.position.set(pt.x, 1.09, pt.z);
            this.goalRing.visible = true;
          }
        }
      }
    },

    _resize() {
      if (!this.renderer || !this.camera) return;
      const vp = document.getElementById('island-viewport');
      const w = (vp && vp.clientWidth) || window.innerWidth;
      const h = (vp && vp.clientHeight) || window.innerHeight;
      if (w <= 0 || h <= 0) return;
      this.renderer.setSize(w, h, false);
      const aspect = w / h;
      this.camera.aspect = aspect;
      this.camera.fov = aspect < 0.68 ? 62 : aspect < 1.0 ? 52 : 45;
      this.camera.updateProjectionMatrix();
    },

    /* ---------- 主循环 ---------- */
    _loop(now) {
      if (!this.running) return;
      this.rafId = requestAnimationFrame((t) => this._loop(t));
      const dt = Math.min(0.05, Math.max(0.001, (now - (this._lastTime || now)) / 1000));
      this._lastTime = now;

      const tSec = now * 0.001;
      this._updateTimeOfDay(dt, tSec);
      this._updatePlayer(dt, tSec);
      this._updateCars(dt);
      this._updateCitizens(dt, tSec);
      this._updateAmbient(dt, tSec);
      this._updateCamera(dt, now, tSec);
      this.renderer.render(this.scene, this.camera);
      this._updatePortraits(dt, tSec);
      this._updateLabels();
    },

    _updatePortraits(dt, tSec) {
      const landing = document.getElementById('landing');
      if (landing && landing.classList.contains('active')) {
        [['cast-me', 'me'], ['cast-boss', 'boss'], ['cast-xiaomei', 'xiaomei'], ['cast-lijie', 'lijie']].forEach(([id, key], idx) => {
          const c = document.getElementById(id);
          if (c) {
            this.renderCharacterToCanvas(c, key, {
              yaw: Math.sin(tSec * 1.4 + idx * 1.3) * 0.52,
              walking: true,
              timeSec: tSec,
              phase: idx * 1.5,
              pedestal: true
            });
          }
        });
      }
      const avScreen = document.getElementById('avatar-screen');
      if (avScreen && avScreen.classList.contains('active')) {
        if (!this.avDragging) this.avTurntableYaw += dt * 0.55;
        const c = document.getElementById('av-prev');
        if (c) {
          this.renderCharacterToCanvas(c, 'me', {
            yaw: this.avTurntableYaw,
            walking: true,
            timeSec: tSec,
            phase: 0,
            pedestal: true
          });
        }
      }
      const badgeModal = document.getElementById('badge-modal');
      if (badgeModal && badgeModal.classList.contains('show')) {
        const bc = document.getElementById('badge-canvas');
        if (bc) {
          this.renderCharacterToCanvas(bc, 'me', {
            yaw: Math.sin(tSec * 1.8) * 0.25,
            walking: false,
            timeSec: tSec,
            pedestal: false
          });
        }
      }
    },

    _updateTimeOfDay(dt, tSec) {
      let target;
      if (this.timeMode === 'clock') {
        const info = this._getClockTodTarget();
        target = info.preset;
        if (info.label !== this._lastClockStr) {
          this._lastClockStr = info.label;
          this._syncTimeButtons(info.label);
        }
      } else if (this.timeMode === 'auto') {
        this.autoPhase = (this.autoPhase + dt / 36) % 1;
        const p = this.autoPhase;
        if (p < 0.35) target = TOD_PRESETS.day;
        else if (p < 0.5) target = this._lerpPreset(TOD_PRESETS.day, TOD_PRESETS.sunset, (p - 0.35) / 0.15);
        else if (p < 0.65) target = this._lerpPreset(TOD_PRESETS.sunset, TOD_PRESETS.night, (p - 0.5) / 0.15);
        else if (p < 0.85) target = TOD_PRESETS.night;
        else target = this._lerpPreset(TOD_PRESETS.night, TOD_PRESETS.day, (p - 0.85) / 0.15);
      } else {
        target = TOD_PRESETS[this.timeMode] || TOD_PRESETS.day;
      }

      const k = 1 - Math.exp(-3.6 * dt);
      const c = this.curTod;
      c.sky.lerp(target.sky, k);
      c.fog.lerp(target.fog, k);
      c.fogDensity += (target.fogDensity - c.fogDensity) * k;
      c.ocean.lerp(target.ocean, k);
      c.sunColor.lerp(target.sunColor, k);
      c.sunPos.lerp(target.sunPos, k);
      c.sunInt += (target.sunInt - c.sunInt) * k;
      c.hemiSky.lerp(target.hemiSky, k);
      c.hemiGround.lerp(target.hemiGround, k);
      c.hemiInt += (target.hemiInt - c.hemiInt) * k;
      c.glowInt += (target.glowInt - c.glowInt) * k;
      c.lampInt += (target.lampInt - c.lampInt) * k;
      c.starOp += (target.starOp - c.starOp) * k;
      c.moonOp += (target.moonOp - c.moonOp) * k;
      c.beamOp += (target.beamOp - c.beamOp) * k;
      c.fireflyOp += (target.fireflyOp - c.fireflyOp) * k;

      this.scene.background.copy(c.sky);
      this.scene.fog.color.copy(c.fog);
      this.scene.fog.density = c.fogDensity;
      if (this.ocean) this.ocean.material.color.copy(c.ocean);
      this.sunLight.color.copy(c.sunColor);
      this.sunLight.position.copy(c.sunPos);
      this.sunLight.intensity = c.sunInt;
      this.hemiLight.color.copy(c.hemiSky);
      this.hemiLight.groundColor.copy(c.hemiGround);
      this.hemiLight.intensity = c.hemiInt;
      this.glowMat.emissiveIntensity = c.glowInt;
      this.pointLights.forEach((pl) => { pl.intensity = c.lampInt; });

      if (this.starsMesh) this.starsMesh.material.opacity = c.starOp;
      if (this.moonMesh) {
        this.moonMesh.visible = c.moonOp > 0.03;
        this.moonMesh.material.opacity = c.moonOp;
      }
      if (this.lighthouseBeam) {
        this.lighthouseBeam.visible = c.beamOp > 0.02;
        this.lighthouseBeam.material.opacity = c.beamOp;
        this.lighthouseBeam.rotation.y = tSec * 0.75;
      }
      if (this.fireflies) {
        this.fireflies.visible = c.fireflyOp > 0.03;
        this.fireflies.material.opacity = c.fireflyOp * (0.7 + 0.3 * Math.sin(tSec * 4));
      }
    },

    _updatePlayer(dt, timeSec) {
      if (!this.playerRig) return;
      let moveX = 0, moveZ = 0;

      if (!this.cinematicMode && (this.mode === 'walk' || this.mode === 'fp')) {
        const up = this.keys['w'] || this.keys['arrowup'] ? 1 : 0;
        const dn = this.keys['s'] || this.keys['arrowdown'] ? 1 : 0;
        const lf = this.keys['a'] || this.keys['arrowleft'] ? 1 : 0;
        const rt = this.keys['d'] || this.keys['arrowright'] ? 1 : 0;
        const kx = (rt - lf) + this.joyVec.x;
        const kz = (dn - up) + this.joyVec.z;

        if (Math.hypot(kx, kz) > 0.08) {
          this.walkGoal = null;
          if (this.goalRing) this.goalRing.visible = false;
          if (this.mode === 'fp') {
            const fwd = -kz;
            const fx = Math.sin(this.fpYaw), fz = Math.cos(this.fpYaw);
            const rx = -fz, rz = fx;
            moveX = fwd * fx + kx * rx;
            moveZ = fwd * fz + kx * rz;
          } else {
            const sinA = Math.sin(this.curSpherical.azimuth);
            const cosA = Math.cos(this.curSpherical.azimuth);
            moveX = kx * cosA + kz * sinA;
            moveZ = -kx * sinA + kz * cosA;
          }
        } else if (this.walkGoal) {
          const dx = this.walkGoal.x - this.playerPos.x;
          const dz = this.walkGoal.z - this.playerPos.z;
          if (Math.hypot(dx, dz) < 0.45) {
            this.walkGoal = null;
            if (this.goalRing) this.goalRing.visible = false;
          } else {
            moveX = dx;
            moveZ = dz;
            if (this.mode === 'fp') {
              const targetYaw = Math.atan2(dx, dz);
              let diff = targetYaw - this.fpYaw;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              this.fpYaw += diff * Math.min(1, dt * 6);
            }
          }
        }
      }

      const moveLen = Math.hypot(moveX, moveZ);
      const isMoving = moveLen > 0.01;
      if (isMoving) {
        const speed = 9.2;
        const nx = this.playerPos.x + (moveX / moveLen) * speed * dt;
        const nz = this.playerPos.z + (moveZ / moveLen) * speed * dt;
        if (this._canWalkTo(nx, nz)) {
          this.playerPos.x = nx;
          this.playerPos.z = nz;
        } else if (this._canWalkTo(nx, this.playerPos.z)) {
          this.playerPos.x = nx;
        } else if (this._canWalkTo(this.playerPos.x, nz)) {
          this.playerPos.z = nz;
        }
        const targetYaw = this.mode === 'fp' ? this.fpYaw : Math.atan2(moveX, moveZ);
        let diff = targetYaw - this.playerYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.playerYaw += diff * Math.min(1, dt * 12);

        this.playerRig.group.position.x = this.playerPos.x;
        this.playerRig.group.position.z = this.playerPos.z;
        this.playerRig.group.position.y = 1.04 + Math.abs(Math.sin(timeSec * 10.5)) * 0.16;
        this.playerRig.group.rotation.y = this.playerYaw;
      } else {
        this.playerRig.group.position.x = this.playerPos.x;
        this.playerRig.group.position.z = this.playerPos.z;
        this.playerRig.group.position.y = 1.04;
        this.playerRig.group.rotation.y = this.mode === 'fp' ? this.fpYaw : this.playerYaw;
      }
      this._playerMoving = isMoving;
      animateRig(this.playerRig, isMoving, timeSec, 0);

      if (this.mode === 'walk') {
        this.camTarget.x = this.playerPos.x;
        this.camTarget.y = 2.1;
        this.camTarget.z = this.playerPos.z;
        this._checkProximity();
      } else if (this.mode === 'fp') {
        this._checkProximity();
      } else {
        this._setPrompt(null);
      }
    },

    _canWalkTo(x, z) {
      if (this._isOnIsland(x, z) > 0.87) return false;
      if (Math.hypot((x + 13) / 4.4, (z - 12) / 3.4) < 0.95) return false;
      if (Math.hypot(x, z) < 2.4) return false; // 避开中央喷泉水池
      const entries = Object.values(this.buildings);
      for (let i = 0; i < entries.length; i++) {
        const b = entries[i].data;
        if (Math.abs(x - b.wx) < 3.7 && Math.abs(z - b.wz) < 3.4) return false;
      }
      return true;
    },

    _checkProximity() {
      let bestId = null, bestD = 5.4;
      Object.values(this.buildings).forEach((b) => {
        const d = this.playerPos.distanceTo(b.doorPos);
        if (d < bestD) { bestD = d; bestId = b.data.id; }
      });
      if (bestId !== this.nearBuildingId) {
        this.nearBuildingId = bestId;
        this._setPrompt(bestId ? this.buildings[bestId].data : null);
      }
    },

    _setPrompt(b) {
      const el = document.getElementById('isl-prompt');
      if (!el) return;
      if (!b) { el.classList.remove('show'); return; }
      el.textContent = `按 E 或点此进入「${b.name}」▶`;
      el.onclick = () => this.focusBuilding(b.id);
      el.classList.add('show');
    },

    _updateCars(dt) {
      const pPos = this.playerPos;
      this.cars.forEach((car) => {
        const pt = car.curve.getPointAt((car.t + 1) % 1);
        const tangent = car.curve.getTangentAt((car.t + 1) % 1).normalize();
        const right = new THREE.Vector3(-tangent.z, 0, tangent.x);
        const worldPos = pt.clone().addScaledVector(right, car.lane);

        const nearPlayer = (this.mode === 'walk' || this.mode === 'fp') && pPos && worldPos.distanceTo(pPos) < 3.5;
        if (!nearPlayer) car.t = (car.t + car.speed * dt + 1) % 1;

        car.mesh.position.set(worldPos.x, 1.07, worldPos.z);
        const ahead = car.curve.getPointAt((car.t + (car.speed > 0 ? 0.01 : -0.01) + 1) % 1)
          .addScaledVector(right, car.lane);
        car.mesh.lookAt(ahead.x, 1.07, ahead.z);
      });
    },

    _updateCitizens(dt, tSec) {
      this.citizens.forEach((c) => {
        c.angle += c.speed * dt;
        const nx = Math.cos(c.angle) * c.radius;
        const nz = Math.sin(c.angle) * c.radius;
        const dx = -Math.sin(c.angle) * c.speed;
        const dz = Math.cos(c.angle) * c.speed;
        c.rig.group.position.set(nx, 1.04 + Math.abs(Math.sin(tSec * 10.5 + c.phase)) * 0.14, nz);
        c.rig.group.rotation.y = Math.atan2(dx, dz);
        animateRig(c.rig, true, tSec, c.phase);
      });
      if (this.npcRigs) {
        this.npcRigs.forEach((n) => animateRig(n.rig, false, tSec, n.phase));
      }
    },

    _updateAmbient(dt, tSec) {
      if (this.foam) {
        const s = 1 + Math.sin(tSec * 1.6) * 0.012;
        this.foam.scale.set(1.06 * s, 1, 0.92 * s);
      }
      if (this.goalRing && this.goalRing.visible) {
        const gs = 0.9 + Math.sin(tSec * 6) * 0.16;
        this.goalRing.scale.set(gs, gs, 1);
      }
      // 小帆船摇曳
      if (this.sailboat) {
        this.sailboat.position.y = 0.25 + Math.sin(tSec * 1.8) * 0.18;
        this.sailboat.rotation.z = Math.sin(tSec * 1.3) * 0.06;
        this.sailboat.rotation.x = Math.cos(tSec * 1.1) * 0.04;
      }
      // 池塘小鸭子划水
      this.ducks.forEach((d, idx) => {
        d.angle += dt * (0.45 + idx * 0.12);
        const dx = -13 + Math.cos(d.angle) * d.r;
        const dz = 12 + Math.sin(d.angle) * (d.r * 0.75);
        d.mesh.position.set(dx, 0.88 + Math.sin(tSec * 4 + idx) * 0.04, dz);
        d.mesh.rotation.y = -d.angle;
      });
      // 云海环绕层动画：首页合拢飘浮，拨云后向四周散开淡出
      this.cloudGateOpen += (this.cloudGateTarget - this.cloudGateOpen) * (1 - Math.exp(-3.4 * dt));
      if (this.cloudGate && this.cloudGate.length) {
        const gOpen = this.cloudGateOpen;
        this.cloudGate.forEach((cg) => {
          const curA = cg.ang + tSec * cg.drift;
          const spread = 1 + gOpen * (cg.inner ? 2.4 : 1.5);
          const dist = Math.hypot(cg.baseX, cg.baseZ) * spread;
          cg.group.position.set(
            Math.cos(curA) * dist,
            cg.baseY + Math.sin(tSec * 0.65 + cg.phase) * 0.7 + gOpen * 10,
            Math.sin(curA) * dist * 0.88
          );
          const sc = cg.baseScale * (1 + gOpen * 0.35);
          cg.group.scale.setScalar(sc);
          const op = Math.max(0.06, 0.84 * (1 - gOpen * 0.86));
          cg.mat.opacity = op;
          cg.group.visible = op > 0.08;
        });
      }

      // 高空体素云朵 & 双热气球 & 飞鸟群
      this.clouds.forEach((cl) => {
        cl.mesh.position.x = ((cl.baseX + tSec * cl.speed + 65) % 130) - 65;
        cl.mesh.position.y += Math.sin(tSec * 0.7 + cl.phase) * 0.004;
      });
      if (this.balloon) {
        const ba = tSec * 0.11;
        this.balloon.position.set(Math.cos(ba) * 24, 19 + Math.sin(tSec * 0.8) * 1.2, Math.sin(ba) * 20);
        this.balloon.rotation.y = -ba;
      }
      if (this.balloon2) {
        const ba2 = -tSec * 0.09 + 2.4;
        this.balloon2.position.set(Math.cos(ba2) * 28, 16.5 + Math.cos(tSec * 0.75) * 1.1, Math.sin(ba2) * 24);
        this.balloon2.rotation.y = -ba2;
      }
      if (this.birds) {
        this.birds.forEach((b) => {
          const ba = b.ang + tSec * b.speed;
          const flap = Math.sin(tSec * 9.5 + b.phase) * 0.45;
          b.group.position.set(Math.cos(ba) * b.r, b.y + Math.sin(tSec * 1.6 + b.phase) * 0.5, Math.sin(ba) * b.r * 0.88);
          b.group.rotation.y = -ba;
          b.lw.rotation.z = flap;
          b.rw.rotation.z = -flap;
        });
      }
      // 工程部无人机悬停
      if (this.drone) {
        this.drone.position.y = 2.6 + Math.sin(tSec * 3.4) * 0.35;
        this.drone.rotation.y = tSec * 0.9;
      }
      // 喷泉水花 & 瀑布水花
      this.fountainDrops.forEach((fd) => {
        fd.t = (fd.t + dt * 0.95) % 1;
        const r = fd.t * 1.4;
        const y = 2.4 + Math.sin(fd.t * Math.PI) * 1.9;
        fd.mesh.position.set(Math.cos(fd.angle) * r, y, Math.sin(fd.angle) * r);
      });
      this.waterfallDrops.forEach((wd) => {
        wd.t = (wd.t + dt * 1.2) % 1;
        const y = 8.5 - wd.t * 7.4;
        const z = -28.5 + wd.t * 5.0;
        wd.mesh.position.set(-9 + Math.sin(wd.t * 12) * 0.25, y, z);
      });
      // 红绿灯闪烁
      this.trafficLights.forEach((tl) => {
        const cycle = Math.floor((tSec + tl.offset) * 0.4) % 3;
        tl.bulb.material.color.set(cycle === 0 ? '#4ad07a' : cycle === 1 ? '#ffcd5c' : '#ff596c');
      });
      // 夜间流萤飘动
      if (this.fireflies && this.fireflies.visible && this._ffSeeds) {
        const attr = this.fireflies.geometry.getAttribute('position');
        for (let i = 0; i < this._ffSeeds.length; i++) {
          const s = this._ffSeeds[i];
          attr.setXYZ(
            i,
            s.x + Math.sin(tSec * 0.9 + s.ph) * 1.4,
            s.y + Math.sin(tSec * 1.7 + s.ph) * 0.6,
            s.z + Math.cos(tSec * 1.1 + s.ph) * 1.4
          );
        }
        attr.needsUpdate = true;
      }
      // 建筑光环呼吸 & 雕塑解锁弹起
      Object.values(this.buildings).forEach((b) => {
        if (b.isCurrent) {
          const p = 1 + Math.sin(tSec * 4) * 0.07;
          b.ring.scale.set(p, p, 1);
        } else {
          b.ring.scale.set(1, 1, 1);
        }
      });
      this.milestones.forEach((m) => {
        if (m.popStart) {
          const t = Math.min(1, (performance.now() - m.popStart) / 700);
          const ease = 1 - Math.pow(1 - t, 3);
          m.artMesh.scale.set(1, ease, 1);
          if (t >= 1) m.popStart = 0;
        }
      });
    },

    _updateCamera(dt, now, tSec) {
      if (this.cinematicMode === 'landing') {
        this.spherical.azimuth += dt * 0.11;
      } else if (this.cinematicMode === 'avatar') {
        this.spherical.azimuth += dt * 0.06;
      }

      if (this.mode === 'fp' && !this.cinematicMode && !this.diveAnim) {
        const bob = this._playerMoving ? Math.abs(Math.sin(tSec * 10.5)) * 0.14 : 0;
        const ex = this.playerPos.x;
        const ey = 2.75 + bob;
        const ez = this.playerPos.z;
        const tx = ex + Math.cos(this.fpPitch) * Math.sin(this.fpYaw) * 10;
        const ty = ey + Math.sin(this.fpPitch) * 10;
        const tz = ez + Math.cos(this.fpPitch) * Math.cos(this.fpYaw) * 10;
        this.camera.position.set(ex, ey, ez);
        this.camera.lookAt(tx, ty, tz);
        return;
      }

      if (this.diveAnim) {
        const a = this.diveAnim;
        const raw = Math.min(1, (now - a.start) / a.dur);
        const t = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
        this.camCurTarget.x = a.fromTarget.x + (a.toTarget.x - a.fromTarget.x) * t;
        this.camCurTarget.y = a.fromTarget.y + (a.toTarget.y - a.fromTarget.y) * t;
        this.camCurTarget.z = a.fromTarget.z + (a.toTarget.z - a.fromTarget.z) * t;
        this.curSpherical.radius = a.fromRadius + (a.toRadius - a.fromRadius) * t;
        if (a.fromPolar !== undefined && a.toPolar !== undefined) {
          this.curSpherical.polar = a.fromPolar + (a.toPolar - a.fromPolar) * t;
        }
        if (raw >= 1) {
          const cb = a.cb;
          this.diveAnim = null;
          cb && cb();
        }
      } else {
        const k = 1 - Math.exp(-8.5 * dt);
        this.camCurTarget.x += (this.camTarget.x - this.camCurTarget.x) * k;
        this.camCurTarget.y += (this.camTarget.y - this.camCurTarget.y) * k;
        this.camCurTarget.z += (this.camTarget.z - this.camCurTarget.z) * k;
        this.curSpherical.radius += (this.spherical.radius - this.curSpherical.radius) * k;
        this.curSpherical.polar += (this.spherical.polar - this.curSpherical.polar) * k;
        this.curSpherical.azimuth += (this.spherical.azimuth - this.curSpherical.azimuth) * k;
      }

      const r = this.curSpherical.radius;
      const p = this.curSpherical.polar;
      const a = this.curSpherical.azimuth;
      const cx = this.camCurTarget.x + r * Math.sin(p) * Math.sin(a);
      const cy = this.camCurTarget.y + r * Math.cos(p);
      const cz = this.camCurTarget.z + r * Math.sin(p) * Math.cos(a);
      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(this.camCurTarget.x, this.camCurTarget.y, this.camCurTarget.z);
    }
  };

  window.PQIsland = PQIsland;
})();
