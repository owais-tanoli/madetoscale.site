/* Made to Scale — site-wide animated Earth (Three.js r0.143, gold palette)
   Put this file at: js/earth.js
   Needs: the importmap snippet in each page <head> (see instructions). */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/* ===== EDIT ME: where the 3 asset files live ===== */
const LOCAL_BASE  = '/assets/earth/';   // download the 3 files here (recommended)
const REMOTE_BASE = 'https://api.getlayers.ai/storage/v1/object/public/public/assets/ascend-d9857ad1f2/'; // fallback
const FILES = { planet: 'planet.glb', lights: 'planet-lights.glb', clouds: 'planet-clouds.png' };

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE  = matchMedia('(max-width: 820px), (pointer: coarse)').matches;

const CONFIG = {
  rimColor:'#ffe0a0', rimPower:2.4, nightLights:10, terrainDepth:0.33, terrainShade:1.3,
  oceanGlint:0.45, oceanDeep:0.12, oceanFlow:3, oceanFlowSpeed:0.8, oceanFlowScale:2.1,
  glowColor:'#d9a84a', glowIntensity:1.7, planetRadius:1.95, spin:0.03, initRotation:2.07, tilt:0.37,
  cloud1Height:1.005, cloud1Opacity:0.6, cloud1Spin:0.06,
  cloud2Height:1.03,  cloud2Opacity:0.5, cloud2Spin:0.14,
  cloud3Height:1.075, cloud3Opacity:0.5, cloud3Spin:0.1,
  bgColor:'#050403', flameColor:'#d4a23a', flameColor2:'#fff1c9', flameAmt:0.12,
  atmoColor:'#f2d58a', atmoCount: MOBILE ? 120 : 320, atmoSize:22, atmoSpeed:0.8,
  starColor:'#fff3d6', starCount: MOBILE ? 600 : 1400, starSize:1.6, starFlicker:1,
  markerColor:'#ffd27a', markerCount: MOBILE ? 30 : 60, markerSize:16, markerSpeed:0.5,
};

const Lerp = (a,b,t) => a + (b-a)*t;
const clamp = (v,lo,hi) => Math.min(hi, Math.max(lo, v));
const hexToVec3 = h => { const n = parseInt(h.replace('#',''),16); return new THREE.Vector3(((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255); };
function sample(stops, p){
  if (p <= stops[0].p) return stops[0].v;
  for (let i = 0; i < stops.length-1; i++){
    const a = stops[i], b = stops[i+1];
    if (p <= b.p){ let t = (p-a.p)/(b.p-a.p); t = t*t*(3-2*t); return Lerp(a.v,b.v,t); }
  }
  return stops[stops.length-1].v;
}

const SNOISE = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx; vec3 x2 = x0 - i2 + 2.0 * C.xxx; vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;
const VERT_MAIN = /void\s+main\s*\(\s*\)\s*\{/;

async function init(){
  /* ---- canvas + renderer (bail out quietly if WebGL is missing) ---- */
  const canvas = document.createElement('canvas');
  canvas.className = 'earth-canvas';
  let renderer;
  try {
    renderer = new THREE.WebGL1Renderer({ canvas, antialias: !MOBILE, powerPreference: 'high-performance' });
  } catch (e) { console.warn('[earth] WebGL not available', e); return; }
  const veil = document.createElement('div');
  veil.className = 'earth-veil';
  document.body.prepend(veil);
  document.body.prepend(canvas);

  let W = innerWidth, H = innerHeight;
  const PR = () => Math.min(devicePixelRatio || 1, MOBILE ? 1.25 : 2);
  renderer.setPixelRatio(PR());
  renderer.setSize(W, H, false);
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(40, W/H, 0.1, 200);
  camera.position.set(0, 0, 8);
  scene.add(camera);
  scene.add(new THREE.AmbientLight(0xffffff, 1.8));
  const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(0, 10, 2); scene.add(dl);

  const blackTex = new THREE.DataTexture(new Uint8Array([0,0,0,255]), 1, 1, THREE.RGBAFormat);
  blackTex.needsUpdate = true;

  /* ---- final composite: dark bg + gold corner flame ---- */
  const FinalPass = {
    uniforms: {
      iTime:{value:0}, tDiffuse:{value:null}, torusTexture:{value:null}, bloomTexture:{value:null}, haloTexture:{value:null},
      uBg:{value:hexToVec3(CONFIG.bgColor)}, uFlameA:{value:hexToVec3(CONFIG.flameColor)},
      uFlameB:{value:hexToVec3(CONFIG.flameColor2)}, uFlameAmt:{value:CONFIG.flameAmt},
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float iTime; uniform sampler2D tDiffuse; uniform sampler2D bloomTexture; uniform sampler2D torusTexture; uniform sampler2D haloTexture;
      uniform vec3 uBg; uniform vec3 uFlameA; uniform vec3 uFlameB; uniform float uFlameAmt;
      varying vec2 vUv;
      vec3 warp3d(vec3 pos, float t){ float curv=.8,a=1.9,b=0.7; pos*=2.;
        pos.x+=curv*sin(t+a*pos.y)+t*b; pos.y+=curv*cos(t+a*pos.x);
        pos.y+=curv*sin(t+a*pos.z)+t*b; pos.z+=curv*cos(t+a*pos.y);
        pos.z+=curv*sin(t+a*pos.x)+t*b; pos.x+=curv*cos(t+a*pos.z);
        return 0.5+0.5*cos(pos.xyz+vec3(1,2,4)); }
      void main(){
        vec2 uv = 2.*vUv - 1.;
        vec3 w = pow(warp3d(vec3(uv.x, sin(uv.y), uv.y), iTime*1.5), vec3(1.5));
        vec3 flame = 1.5*uFlameA*w.x; flame*=w.y; flame += uFlameB*w.z;
        flame *= smoothstep(0.25, 1., abs(uv.y));
        float md = smoothstep(-0.7, 1., -uv.y*uv.x); flame *= md*md;
        vec3 bg = uBg * (1.0 - 0.4 * length(uv));
        vec3 halo = texture2D(haloTexture, vUv).xyz;
        gl_FragColor = vec4(bg + flame*uFlameAmt + texture2D(bloomTexture, vUv).xyz + texture2D(torusTexture, vUv).xyz + texture2D(tDiffuse, vUv).xyz + halo, 1.);
      }`,
  };
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const finalPass = new ShaderPass(FinalPass);
  finalPass.uniforms.bloomTexture.value = blackTex;
  finalPass.uniforms.torusTexture.value = blackTex;
  finalPass.uniforms.haloTexture.value = blackTex;
  composer.addPass(finalPass);

  /* ---- groups ---- */
  const STOPS_X = [{p:0,v:0},{p:0.32,v:-3.1},{p:0.64,v:3.2},{p:1,v:0}];
  const STOPS_Y = [{p:0,v:-4.5},{p:0.32,v:0.55},{p:0.64,v:0.45},{p:1,v:0.15}];
  const STOPS_S = [{p:0,v:2.15},{p:0.32,v:1.0},{p:0.64,v:0.92},{p:1,v:1.12}];

  const world = new THREE.Group();
  world.position.set(STOPS_X[0].v, STOPS_Y[0].v, 0);
  world.scale.setScalar(STOPS_S[0].v);
  scene.add(world);
  const planetGroup = new THREE.Group();
  planetGroup.rotation.order = 'ZYX';
  planetGroup.rotation.z = CONFIG.tilt;
  world.add(planetGroup);
  const cloudGroup = new THREE.Group();
  cloudGroup.rotation.z = CONFIG.tilt;
  cloudGroup.visible = false;
  world.add(cloudGroup);

  const planetTimeU = {value:0}, cloudTimeU = {value:0}, starTimeU = {value:0}, markerTimeU = {value:0};
  let planetTime = 0, cloudTime = 0, starTime = 0, markerTime = 0;
  const resU = { value: new THREE.Vector2(W*PR(), H*PR()) };

  /* ---- glow halo ---- */
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.ShaderMaterial({
    transparent:true, side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending,
    uniforms:{ uGlow:{value:hexToVec3(CONFIG.glowColor)}, uIntensity:{value:CONFIG.glowIntensity} },
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`uniform vec3 uGlow; uniform float uIntensity; varying vec2 vUv;
      void main(){ float d = length(vUv - 0.5) * 2.0; float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.2); gl_FragColor = vec4(uGlow * a * uIntensity, a); }`,
  }));
  glow.scale.setScalar(CONFIG.planetRadius * 2.3);
  world.add(glow);

  /* ---- motes ---- */
  let motes;
  {
    const n = CONFIG.atmoCount, pos = new Float32Array(n*3), size = new Float32Array(n), seed = new Float32Array(n);
    for (let i=0;i<n;i++){ pos[i*3]=Math.random()*2-1; pos[i*3+1]=Math.random()*2-1; pos[i*3+2]=Math.random()*2-1; size[i]=CONFIG.atmoSize*(0.4+Math.random()); seed[i]=Math.random()*100; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos,3));
    g.setAttribute('size', new THREE.BufferAttribute(size,1));
    g.setAttribute('seed', new THREE.BufferAttribute(seed,1));
    const m = new THREE.ShaderMaterial({
      transparent:true, depthWrite:false, depthTest:false, blending:THREE.AdditiveBlending,
      uniforms:{ uTime:{value:0}, uRes:resU, uColor:{value:hexToVec3(CONFIG.atmoColor)} },
      vertexShader:`
        attribute float size; attribute float seed; uniform float uTime; uniform vec2 uRes; varying float vA;
        vec3 warp(vec3 p, float t){ float c=0.9,a=1.9,b=0.02,s=0.05; p*=2.;
          p.x+=c*sin(s*t+a*p.y)+t*b; p.y+=c*cos(s*t+a*p.x); p.y+=c*sin(s*t+a*p.z)+t*b;
          p.z+=c*cos(s*t+a*p.y); p.z+=c*sin(s*t+a*p.x)+t*b; p.x+=c*cos(s*t+a*p.z);
          return cos(p+vec3(1,2,4)); }
        void main(){
          vec3 v = position*4.0 + warp(position, uTime)*1.2;
          vec4 mv = modelViewMatrix * vec4(v, 1.0);
          float r = length(v); float farF = 1.0 - smoothstep(5.0, 6.5, r); float nearF = smoothstep(0.0, 0.5, -mv.z);
          vA = farF * nearF;
          gl_PointSize = size * uRes.y / 900.0 / -mv.z; gl_PointSize = max(gl_PointSize, 1.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader:`uniform vec3 uColor; varying float vA;
        void main(){ vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard;
          float tex = smoothstep(0.5, 0.0, l); gl_FragColor = vec4(uColor * tex, tex * vA * 0.55); }`,
    });
    motes = new THREE.Points(g, m);
    motes.frustumCulled = false;
    scene.add(motes);
  }

  /* ---- stars ---- */
  {
    const n = CONFIG.starCount, pos = new Float32Array(n*3), seed = new Float32Array(n), bright = new Float32Array(n);
    for (let i=0;i<n;i++){
      const u = Math.random()*2-1, th = Math.random()*Math.PI*2, s = Math.sqrt(1-u*u);
      pos[i*3]=90*s*Math.cos(th); pos[i*3+1]=90*u; pos[i*3+2]=90*s*Math.sin(th);
      seed[i]=Math.random()*100; bright[i]=0.35+Math.random()*0.65;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos,3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed,1));
    g.setAttribute('bright', new THREE.BufferAttribute(bright,1));
    const m = new THREE.ShaderMaterial({
      transparent:true, depthWrite:false, depthTest:true, blending:THREE.AdditiveBlending,
      uniforms:{ uTime:starTimeU, uSize:{value:CONFIG.starSize}, uFlicker:{value:CONFIG.starFlicker}, uColor:{value:hexToVec3(CONFIG.starColor)}, uRes:resU },
      vertexShader:`
        attribute float seed; attribute float bright;
        uniform float uTime; uniform float uSize; uniform float uFlicker; uniform vec2 uRes; varying float vTw;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float tw = 0.6 + 0.4 * sin(uTime * uFlicker + seed);
          vTw = bright * tw;
          gl_PointSize = max(uSize * uRes.y / 900.0 * (90.0 / max(-mv.z, 1.0)), 1.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader:`uniform vec3 uColor; varying float vTw;
        void main(){ vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard;
          float core = smoothstep(0.5, 0.0, l); gl_FragColor = vec4(uColor, core * vTw); }`,
    });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts);
  }

  /* ---- asset loading: local first, remote fallback ---- */
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/');
  const gltfLoader = new GLTFLoader(); gltfLoader.setDRACOLoader(draco);
  async function loadGLB(name){
    try { return await gltfLoader.loadAsync(LOCAL_BASE + name); }
    catch (e) { return await gltfLoader.loadAsync(REMOTE_BASE + name); }
  }
  function loadTex(name){
    const tl = new THREE.TextureLoader();
    return new Promise((res, rej) => tl.load(LOCAL_BASE + name, res, undefined,
      () => tl.load(REMOTE_BASE + name, res, undefined, rej)));
  }

  /* ---- clouds ---- */
  const cloudMeshes = [];
  loadTex(FILES.clouds).then(tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(5,5);
    [ {h:CONFIG.cloud1Height,o:CONFIG.cloud1Opacity,k:'cloud1Spin',ry:0.0,ph:0.0},
      {h:CONFIG.cloud2Height,o:CONFIG.cloud2Opacity,k:'cloud2Spin',ry:2.2,ph:13.0},
      {h:CONFIG.cloud3Height,o:CONFIG.cloud3Opacity,k:'cloud3Spin',ry:4.3,ph:27.0} ].forEach(L => {
      const mat = new THREE.MeshStandardMaterial({ map:tex, transparent:true, depthWrite:false });
      mat.onBeforeCompile = sh => {
        sh.uniforms.uTime = cloudTimeU; sh.uniforms.noiseScale = {value:20};
        sh.uniforms.uSpeedX = {value:1}; sh.uniforms.uSpeedY = {value:2}; sh.uniforms.uSpeedZ = {value:2};
        sh.uniforms.uOpacity = {value:L.o}; sh.uniforms.uPhase = {value:L.ph};
        sh.vertexShader = 'varying vec2 vCloudUv;\n' + sh.vertexShader.replace(VERT_MAIN, m => m + '\n vCloudUv = uv;');
        sh.fragmentShader = `varying vec2 vCloudUv;
          uniform float uTime; uniform float noiseScale; uniform float uSpeedX; uniform float uSpeedY; uniform float uSpeedZ; uniform float uOpacity; uniform float uPhase;
          ${SNOISE}` + sh.fragmentShader.replace('#include <dithering_fragment>', `
          #include <dithering_fragment>
          gl_FragColor.rgb = vec3(1.0);
          float cloudNoise = snoise(vec3(vCloudUv.x * noiseScale + uTime * uSpeedX + uPhase, vCloudUv.y * noiseScale - uTime * uSpeedY + uPhase, uTime * uSpeedZ + uPhase));
          float cloudNdv = max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
          float cloudEdge = pow(1.0 - cloudNdv, 3.0);
          float cloudMod = mix(cloudNoise, 1.0, cloudEdge);
          float cloudNdl = dot(normalize(vNormal), normalize(vec3(-0.9, 0.18, 0.4)));
          float cloudDay = 1.0 - smoothstep(0.30, -0.30, cloudNdl) * 0.9;
          gl_FragColor.a *= cloudMod * uOpacity * cloudDay;`);
      };
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(CONFIG.planetRadius * L.h, MOBILE ? 40 : 64, MOBILE ? 40 : 64), mat);
      mesh.rotation.y = L.ry; mesh.renderOrder = 2; mesh.userData.k = L.k;
      cloudGroup.add(mesh); cloudMeshes.push(mesh);
    });
  }).catch(e => console.warn('[earth] clouds failed', e));

  /* ---- land markers ---- */
  function buildMarkers(mesh){
    const geo = mesh.geometry, posA = geo.attributes.position, uvA = geo.attributes.uv, idx = geo.index;
    if (!posA || !uvA) return;
    const triCount = idx ? idx.count/3 : posA.count/3;
    const ti = (t,k) => idx ? idx.getX(t*3+k) : t*3+k;
    let data = null, cw = 0, ch = 0;
    try {
      const img = mesh.material.map && mesh.material.map.image;
      if (img){
        const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight, k = Math.min(1, 1024/iw);
        cw = Math.max(1, Math.round(iw*k)); ch = Math.max(1, Math.round(ih*k));
        const c = document.createElement('canvas'); c.width = cw; c.height = ch;
        const cx = c.getContext('2d', { willReadFrequently:true }); cx.drawImage(img, 0, 0, cw, ch);
        data = cx.getImageData(0, 0, cw, ch).data;
      }
    } catch (e) { data = null; }
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    const cum = new Float64Array(triCount); let total = 0;
    for (let t=0;t<triCount;t++){
      A.fromBufferAttribute(posA, ti(t,0)); B.fromBufferAttribute(posA, ti(t,1)); C.fromBufferAttribute(posA, ti(t,2));
      e1.subVectors(B,A); e2.subVectors(C,A); total += e1.cross(e2).length()*0.5; cum[t] = total;
    }
    const pickTri = r => { let lo=0, hi=triCount-1; while (lo<hi){ const mid=(lo+hi)>>1; if (cum[mid]<r) lo=mid+1; else hi=mid; } return lo; };
    const out = [], seeds = []; let tries = 0;
    while (seeds.length < CONFIG.markerCount && tries < CONFIG.markerCount*60){
      tries++;
      const t = pickTri(Math.random()*total); let u = Math.random(), v = Math.random();
      if (u+v>1){ u=1-u; v=1-v; } const w = 1-u-v;
      const i0 = ti(t,0), i1 = ti(t,1), i2 = ti(t,2);
      const px = posA.getX(i0)*w + posA.getX(i1)*u + posA.getX(i2)*v;
      const py = posA.getY(i0)*w + posA.getY(i1)*u + posA.getY(i2)*v;
      const pz = posA.getZ(i0)*w + posA.getZ(i1)*u + posA.getZ(i2)*v;
      if (data){
        const tu = uvA.getX(i0)*w + uvA.getX(i1)*u + uvA.getX(i2)*v;
        const tv = uvA.getY(i0)*w + uvA.getY(i1)*u + uvA.getY(i2)*v;
        const x = clamp(Math.floor(((tu%1)+1)%1*cw), 0, cw-1), y = clamp(Math.floor(((tv%1)+1)%1*ch), 0, ch-1);
        const o = (y*cw+x)*4, cr = data[o], cg = data[o+1], cb = data[o+2];
        if (cb > cr+6 && cb > cg+6) continue;
      }
      out.push(px*1.012, py*1.012, pz*1.012); seeds.push(Math.random());
    }
    if (!seeds.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(out), 3));
    g.setAttribute('seed', new THREE.BufferAttribute(new Float32Array(seeds), 1));
    const m = new THREE.ShaderMaterial({
      transparent:true, depthTest:true, depthWrite:false, blending:THREE.AdditiveBlending,
      uniforms:{ uTime:markerTimeU, uColor:{value:hexToVec3(CONFIG.markerColor)}, uSize:{value:CONFIG.markerSize}, uSpeed:{value:CONFIG.markerSpeed}, uRes:resU },
      vertexShader:`
        attribute float seed; uniform float uSize; uniform vec2 uRes; varying float vSeed; varying float vFade;
        void main(){
          vSeed = seed;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 vn = normalize(normalMatrix * normalize(position));
          vec3 vd = normalize(-mv.xyz);
          vFade = smoothstep(0.15, 0.5, dot(vn, vd));
          gl_PointSize = max(uSize * uRes.y / 900.0 * (7.0 / max(-mv.z, 1.0)), 2.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader:`
        uniform vec3 uColor; uniform float uTime; uniform float uSpeed; varying float vSeed; varying float vFade;
        void main(){
          if (vFade <= 0.001) discard;
          vec2 p = gl_PointCoord - 0.5; float d = length(p) * 2.0; if (d > 1.0) discard;
          float core = smoothstep(0.30, 0.0, d) * 1.2;
          float ph = fract(uTime * uSpeed + vSeed);
          float ring = smoothstep(0.07, 0.0, abs(d - ph)) * (1.0 - ph);
          gl_FragColor = vec4(uColor, clamp(core + ring, 0.0, 1.0) * vFade);
        }`,
    });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; mesh.add(pts);
  }

  /* ---- planet ---- */
  let entryStart = null;
  const ENTRY_DUR = 1.9, ENTRY_START_Y = -6.5;
  let nightTex = blackTex;
  try {
    const lg = await loadGLB(FILES.lights);
    lg.scene.traverse(o => { if (nightTex === blackTex && o.isMesh && o.material && o.material.map) nightTex = o.material.map; });
  } catch (e) { console.warn('[earth] city lights failed', e); }

  let pg;
  try { pg = await loadGLB(FILES.planet); }
  catch (e) { console.warn('[earth] planet failed — keeping the normal site background', e); canvas.remove(); veil.remove(); return; }

  let mesh = null;
  pg.scene.traverse(o => { if (!mesh && o.isMesh) mesh = o; });
  if (!mesh){ canvas.remove(); veil.remove(); return; }
  mesh.geometry.computeBoundingSphere();
  const bs = mesh.geometry.boundingSphere, sc = CONFIG.planetRadius / bs.radius;
  mesh.scale.setScalar(sc); mesh.position.copy(bs.center).multiplyScalar(-sc); mesh.quaternion.identity();
  const mat = mesh.material.clone();
  mat.metalness = 0; mat.roughness = 1; mat.envMapIntensity = 0;
  mat.extensions = Object.assign({}, mat.extensions, { derivatives:true });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, {
      time:planetTimeU, noiseScale:{value:30}, speedX:{value:1.5}, speedY:{value:2.0}, speedZ:{value:2.5},
      rimColor:{value:new THREE.Color(CONFIG.rimColor)}, rimPower:{value:CONFIG.rimPower},
      nightBlendTexture:{value:nightTex}, nightLights:{value:CONFIG.nightLights},
      terrainDepth:{value:CONFIG.terrainDepth}, terrainShade:{value:CONFIG.terrainShade},
      oceanGlint:{value:CONFIG.oceanGlint}, oceanDeep:{value:CONFIG.oceanDeep},
      oceanFlow:{value:CONFIG.oceanFlow}, oceanFlowSpeed:{value:CONFIG.oceanFlowSpeed}, oceanFlowScale:{value:CONFIG.oceanFlowScale},
    });
    sh.vertexShader = 'varying vec2 vCustomUv;\n' + sh.vertexShader.replace(VERT_MAIN, m => m + '\n vCustomUv = uv;');
    sh.fragmentShader = `varying vec2 vCustomUv;
      uniform float time; uniform float noiseScale; uniform float speedX; uniform float speedY; uniform float speedZ;
      uniform vec3 rimColor; uniform float rimPower; uniform sampler2D nightBlendTexture; uniform float nightLights;
      uniform float terrainDepth; uniform float terrainShade; uniform float oceanGlint; uniform float oceanDeep;
      uniform float oceanFlow; uniform float oceanFlowSpeed; uniform float oceanFlowScale;
      ${SNOISE}` + sh.fragmentShader.replace('#include <dithering_fragment>', `
      #include <dithering_fragment>
      vec3 normalizedNormal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      float rim = 1.0 - max(dot(viewDir, normalizedNormal), 0.0);
      rim = pow(rim, rimPower); rim = pow(rim, 1.5); rim *= 0.7;
      vec3 currentColor = gl_FragColor.rgb;
      float blueDom = currentColor.b - max(currentColor.r, currentColor.g);
      float waterMask = clamp(smoothstep(-0.005, 0.03, blueDom), 0.0, 1.0);
      float shimmer = snoise(vec3(vCustomUv.x * noiseScale + time * speedX, vCustomUv.y * noiseScale - time * speedY, time * speedZ));
      gl_FragColor.rgb += waterMask * shimmer * 0.025;
      float fT = time * oceanFlowSpeed * 4.0;
      float fS = 4.0 * oceanFlowScale;
      float warp = snoise(vec3(vCustomUv.x * fS - fT * 0.5, vCustomUv.y * fS + fT * 0.4, fT * 0.5));
      float flow = snoise(vec3(vCustomUv.x * fS * 2.0 + fT * 0.6 + warp, vCustomUv.y * fS * 2.0 - fT * 0.5, fT * 0.7));
      flow = warp * 0.6 + flow * 0.4;
      gl_FragColor.rgb += waterMask * flow * 0.12 * oceanFlow;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.01, 0.06, 0.16), waterMask * oceanDeep);
      vec3 finalColor = mix(gl_FragColor.rgb, rimColor, rim);
      gl_FragColor = vec4(finalColor, 1.0);
      vec3 surfPos = -vViewPosition;
      float terrH = dot(texture2D(map, vCustomUv).rgb, vec3(0.299, 0.587, 0.114));
      vec3 sigX = dFdx(surfPos), sigY = dFdy(surfPos);
      vec3 vR1 = cross(sigY, normalizedNormal), vR2 = cross(normalizedNormal, sigX);
      float fDet = dot(sigX, vR1);
      vec3 vGrad = sign(fDet) * (dFdx(terrH) * vR1 + dFdy(terrH) * vR2);
      vec3 bumpedNormal = normalize(abs(fDet) * normalizedNormal - terrainDepth * vGrad);
      vec3 shadeNormal = mix(bumpedNormal, normalizedNormal, waterMask);
      vec3 cityLights = texture2D(nightBlendTexture, vCustomUv).rgb * gl_FragColor.rgb * nightLights;
      vec3 viewSunDir = normalize(vec3(-0.9, 0.18, 0.4));
      float ndl = dot(normalizedNormal, viewSunDir);
      float dayAmt = smoothstep(-0.05, 0.35, ndl);
      float relief = dot(shadeNormal, viewSunDir) - ndl;
      gl_FragColor.rgb *= clamp(1.0 + relief * terrainShade * dayAmt, 0.55, 1.6);
      float nightFactor  = smoothstep(0.18, -0.30, ndl);
      float lightsFactor = smoothstep(0.30, -0.35, ndl);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.08, nightFactor);
      gl_FragColor.rgb += cityLights * lightsFactor;
      vec3 halfDir = normalize(viewSunDir + viewDir);
      float ripple = snoise(vec3(vCustomUv * 240.0, time * 4.0));
      float ndh = max(dot(normalizedNormal, halfDir) + ripple * 0.02, 0.0);
      float glint = pow(ndh, 140.0);
      gl_FragColor.rgb += glint * waterMask * dayAmt * oceanGlint * vec3(1.0, 0.97, 0.88);`);
  };
  mesh.material = mat;
  planetGroup.add(mesh);
  try { buildMarkers(mesh); } catch (e) { console.warn('[earth] markers failed', e); }
  cloudGroup.visible = true;
  entryStart = performance.now();

  /* ---- resize (ignore mobile address-bar jitter) ---- */
  addEventListener('resize', () => {
    const nw = innerWidth, nh = innerHeight;
    if (nw === W && Math.abs(nh - H) < 150) return;
    W = nw; H = nh;
    camera.aspect = W/H; camera.updateProjectionMatrix();
    renderer.setPixelRatio(PR()); renderer.setSize(W, H, false);
    composer.setPixelRatio(PR()); composer.setSize(W, H);
    resU.value.set(W*PR(), H*PR());
  });

  /* ---- loop ---- */
  let curP = 0, curX = STOPS_X[0].v, curY = STOPS_Y[0].v, curS = STOPS_S[0].v, spin = 0;
  let last = performance.now(), shown = false;
  function frame(now){
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last)/1000); last = now;
    const tdt = REDUCED ? 0 : dt;
    planetTime += tdt/12; cloudTime += tdt/20; starTime += tdt; markerTime += tdt;
    planetTimeU.value = planetTime; cloudTimeU.value = cloudTime; starTimeU.value = starTime; markerTimeU.value = markerTime;

    const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const pT = clamp(scrollY / maxScroll, 0, 1);
    curP += (pT - curP) * Math.min(1, dt*4.5);

    const sideScale = clamp(innerWidth/1200, 0.5, 1);
    const aspect = innerWidth / innerHeight;
    const fit = aspect < 1 ? clamp(aspect*1.3, 0.55, 1) : 1;   // keep the globe inside tall phone screens
    const k = Math.min(1, dt*3.2);
    curX += (sample(STOPS_X, curP) * sideScale - curX) * k;
    curY += (sample(STOPS_Y, curP) - curY) * k;
    curS += (sample(STOPS_S, curP) * fit - curS) * k;

    let entryY = 0;
    if (entryStart !== null && !REDUCED){
      const t = clamp((now - entryStart)/1000/ENTRY_DUR, 0, 1);
      entryY = ENTRY_START_Y * Math.pow(1 - t, 3);
    }
    world.position.set(curX, curY + entryY, 0);
    world.scale.setScalar(curS);

    spin += tdt * CONFIG.spin;
    planetGroup.rotation.y = CONFIG.initRotation + spin + curP * Math.PI * 1.6;
    cloudMeshes.forEach(m => { m.rotation.y += tdt * CONFIG[m.userData.k]; });
    glow.quaternion.copy(camera.quaternion);
    motes.position.copy(camera.position);
    const t = now/1000;
    motes.material.uniforms.uTime.value = t * CONFIG.atmoSpeed * 8;
    finalPass.uniforms.iTime.value = REDUCED ? 0 : t * CONFIG.atmoSpeed * 0.4;
    composer.render();
    if (!shown){ shown = true; document.documentElement.classList.add('earth-on'); }  /* switch the site to earth mode only once the globe is really on screen */
  }
  requestAnimationFrame(frame);
}

init().catch(e => console.warn('[earth] failed', e));
