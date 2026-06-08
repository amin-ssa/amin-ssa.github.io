/* bg-3d.js – WebGL-powered animated 3D starfield + floating orbs */
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  /* ── fallback CSS gradient if WebGL unavailable ── */
  if (!gl) {
    document.body.style.background =
      'radial-gradient(ellipse at 20% 50%,#1e0a3c 0%,#030712 60%)';
    spawnParticles();
    return;
  }

  /* ────────── resize ────────── */
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  /* ────────── shaders ────────── */
  const vsSource = `
    attribute vec4 a_pos;
    attribute float a_size;
    attribute vec4 a_color;
    uniform mat4 u_proj;
    uniform float u_time;
    varying vec4 v_color;
    void main(){
      vec4 p = a_pos;
      p.y += sin(u_time * 0.5 + a_pos.x * 3.0) * 0.04;
      p.x += cos(u_time * 0.3 + a_pos.y * 2.0) * 0.03;
      gl_Position = u_proj * p;
      gl_PointSize = a_size;
      v_color = a_color;
    }`;
  const fsSource = `
    precision mediump float;
    varying vec4 v_color;
    void main(){
      float d = distance(gl_PointCoord, vec2(0.5));
      if(d > 0.5) discard;
      float alpha = 1.0 - smoothstep(0.3,0.5,d);
      gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
    }`;

  function compileShader(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vsSource));
  gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fsSource));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  /* ────────── star data ────────── */
  const N = 600;
  const positions = new Float32Array(N * 3);
  const sizes     = new Float32Array(N);
  const colors    = new Float32Array(N * 4);

  const palette = [
    [0.49,0.23,0.93], // purple
    [0.66,0.33,0.96],
    [0.98,0.74,0.27], // gold
    [0.2 ,0.6 ,1.0 ], // cyan
    [1.0 ,1.0 ,1.0 ], // white
  ];

  for (let i = 0; i < N; i++) {
    positions[i*3]   = (Math.random() - 0.5) * 3.5;
    positions[i*3+1] = (Math.random() - 0.5) * 3.5;
    positions[i*3+2] = (Math.random() - 0.5) * 3.5;
    sizes[i] = Math.random() * 4 + 1;
    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i*4]   = c[0];
    colors[i*4+1] = c[1];
    colors[i*4+2] = c[2];
    colors[i*4+3] = Math.random() * 0.7 + 0.3;
  }

  /* ────────── buffers ────────── */
  function mkBuf(data) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return b;
  }

  const posBuf   = mkBuf(positions);
  const sizeBuf  = mkBuf(sizes);
  const colorBuf = mkBuf(colors);

  const a_pos   = gl.getAttribLocation(prog, 'a_pos');
  const a_size  = gl.getAttribLocation(prog, 'a_size');
  const a_color = gl.getAttribLocation(prog, 'a_color');
  const u_proj  = gl.getUniformLocation(prog, 'u_proj');
  const u_time  = gl.getUniformLocation(prog, 'u_time');

  /* ────────── ortho-ish projection ────────── */
  function ortho(l,r,b,t,n,f) {
    return new Float32Array([
      2/(r-l),0,0,0,
      0,2/(t-b),0,0,
      0,0,-2/(f-n),0,
      -(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1
    ]);
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  /* mouse parallax */
  let mx = 0, my = 0;
  window.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth  - 0.5) * 0.15;
    my = (e.clientY / window.innerHeight - 0.5) * 0.15;
  });

  /* ────────── render loop ────────── */
  let lastT = 0;
  function draw(t) {
    t /= 1000;
    gl.clearColor(0.01, 0.02, 0.07, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const aspect = canvas.width / canvas.height;
    const proj = ortho(-aspect - mx, aspect - mx, -1 - my, 1 - my, -10, 10);
    gl.uniformMatrix4fv(u_proj, false, proj);
    gl.uniform1f(u_time, t);

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.enableVertexAttribArray(a_pos);
    gl.vertexAttribPointer(a_pos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuf);
    gl.enableVertexAttribArray(a_size);
    gl.vertexAttribPointer(a_size, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
    gl.enableVertexAttribArray(a_color);
    gl.vertexAttribPointer(a_color, 4, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, N);
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  spawnParticles();

  /* ────────── DOM particles ────────── */
  function spawnParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 25; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 6 + 3;
      const colors = ['rgba(124,58,237,.6)','rgba(245,158,11,.5)','rgba(99,102,241,.5)','rgba(255,255,255,.3)'];
      p.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random()*100}%;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        animation-duration:${6 + Math.random()*10}s;
        animation-delay:${Math.random()*8}s;
        filter:blur(${Math.random()*2}px);
      `;
      container.appendChild(p);
    }
  }
})();
