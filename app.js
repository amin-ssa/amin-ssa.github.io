/* app.js – Premium Interactive Logic & Effects */

// ===== Click Burst Explosion Particles =====
document.addEventListener('click', (e) => {
  // Do not explode inside input boxes or buttons that trigger modals to avoid cluttering
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const colors = ['#7c3aed', '#a855f7', '#fbbf24', '#f59e0b', '#10b981', '#ffffff'];
  const count = 12;
  
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'click-particle';
    const size = Math.random() * 6 + 3;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 70 + 20;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      left: ${e.clientX}px;
      top: ${e.clientY}px;
      position: fixed;
      pointer-events: none;
      border-radius: 50%;
      --tx: ${tx}px;
      --ty: ${ty}px;
      box-shadow: 0 0 10px ${color};
      z-index: 99999;
      transform: translate(-50%, -50%);
    `;
    document.body.appendChild(p);
    
    setTimeout(() => {
      p.remove();
    }, 800);
  }
});

// ===== Animated Counters =====
document.querySelectorAll('.stat-num[data-count]').forEach(el => {
  const target = +el.dataset.count;
  let current = 0;
  const duration = 1500; // ms
  const frameRate = 1000 / 60; // 60fps
  const totalFrames = duration / frameRate;
  const step = target / totalFrames;
  
  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      el.textContent = target.toLocaleString('ar-MA');
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(current).toLocaleString('ar-MA');
    }
  }, frameRate);
});
