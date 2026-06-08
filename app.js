/* app.js – home page logic */

/* ── animated counters ── */
document.querySelectorAll('.stat-num[data-count]').forEach(el => {
  const target = +el.dataset.count;
  let current = 0;
  const step = target / 60;
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = Math.floor(current).toLocaleString('ar-MA');
    if (current >= target) clearInterval(timer);
  }, 24);
});

/* ── navbar scroll effect ── */
window.addEventListener('scroll', () => {
  document.querySelector('.navbar')?.classList.toggle('scrolled', window.scrollY > 50);
});
