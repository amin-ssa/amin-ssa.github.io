/* request.js – full request flow logic */

const serviceNames = {
  followers: 'متابعين',
  views:     'مشاهدات',
  shares:    'مشاركات (شير)',
  likes:     'إعجابات'
};

const state = {
  username: '',
  service:  '',
  qty:      0,
  price:    0,
  orderId:  '',
  userEmail: ''
};

/* ─── STEP 1 → STEP 2 ─── */
const btnNext1 = document.getElementById('btn-next-step1');
btnNext1.addEventListener('click', () => {
  const val = document.getElementById('instagram-username').value.trim();
  if (!val) {
    shakeInput();
    return;
  }
  // strip leading @ if already typed, then re-add for consistency
  const clean = val.replace(/^@+/, '');
  state.username = '@' + clean;
  // force LTR on the username span to avoid RTL flip
  const dispEl = document.getElementById('display-username');
  dispEl.textContent = state.username;
  dispEl.style.direction = 'ltr';
  dispEl.style.unicodeBidi = 'embed';
  switchStep('step-instagram', 'step-services');
});

function shakeInput() {
  const inp = document.querySelector('.input-group');
  inp.style.borderColor = '#ef4444';
  inp.style.animation = 'shake 0.4s ease';
  setTimeout(() => {
    inp.style.borderColor = '';
    inp.style.animation = '';
  }, 500);
}

/* ─── SERVICE TABS ─── */
document.querySelectorAll('.stab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.stab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const svc = tab.dataset.service;
    document.querySelectorAll('.packages').forEach(p => p.classList.add('hidden'));
    document.getElementById('pkg-' + svc).classList.remove('hidden');

    /* clear any previous selection */
    document.querySelectorAll('.pkg-card.selected').forEach(c => c.classList.remove('selected'));
    state.service = '';
    state.qty = 0;
    state.price = 0;
  });
});

/* ─── PACKAGE SELECTION ─── */
document.querySelectorAll('.pkg-card:not(.locked)').forEach(card => {
  card.addEventListener('click', () => {
    const svc   = card.dataset.service;
    const qty   = +card.dataset.qty;
    const price = +card.dataset.price;

    /* deselect siblings */
    document.querySelectorAll(`.pkg-card[data-service="${svc}"]`).forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');

    state.service = svc;
    state.qty     = qty;
    state.price   = price;

    /* short delay then go to step 3 */
    setTimeout(() => {
      fillOrderSummary();
      switchStep('step-services', 'step-login');
    }, 380);
  });
});

function fillOrderSummary() {
  document.getElementById('sum-username').textContent = state.username;
  document.getElementById('sum-service').textContent  = serviceNames[state.service] || state.service;
  document.getElementById('sum-qty').textContent      = state.qty;
  document.getElementById('sum-price').textContent    = state.price + ' درهم';
}

/* ─── GOOGLE LOGIN (Firebase) ─── */
function handleGoogleLogin() {
  const auth     = window.__firebaseAuth;
  const provider = window.__googleProvider;
  const signIn   = window.__signInWithPopup;
  const btn      = document.getElementById('btn-google-login');

  if (!auth || !signIn) {
    btn.textContent = '⏳ جارٍ التحميل…';
    btn.disabled = true;
    window.addEventListener('firebase-ready', () => {
      btn.textContent = '🔄 حاول مرة أخرى';
      btn.disabled = false;
    });
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span style="display:inline-block;animation:spin .8s linear infinite">⏳</span> جارٍ الاتصال…';

  signIn(auth, provider)
    .then(result => {
      state.userEmail = result.user.email || result.user.displayName || 'مستخدم';
      state.orderId   = generateOrderId();
      document.getElementById('order-id-display').textContent = state.orderId;
      buildFinalMessage();
      switchStep('step-login', 'step-complete');
    })
    .catch(err => {
      console.error(err);
      btn.disabled = false;
      btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> حاول مجدداً`;
      showToast('فشل تسجيل الدخول — حاول مرة أخرى');
    });
}

document.getElementById('btn-google-login').addEventListener('click', handleGoogleLogin);

/* wait for firebase-ready if not yet loaded */
if (!window.__firebaseAuth) {
  window.addEventListener('firebase-ready', () => {
    document.getElementById('btn-google-login').disabled = false;
  });
}

/* ─── GENERATE ORDER ID ─── */
function generateOrderId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

/* ─── BUILD FINAL MESSAGE ─── */
function buildFinalMessage() {
  const msg =
`🌟 مرحباً Hicham Y Saif!

📋 طلب جديد:
━━━━━━━━━━━━━━━━━━
👤 حساب إنستاغرم: ${state.username}
⚙️ الخدمة: ${serviceNames[state.service]}
📊 الكمية: ${state.qty}
💰 السعر: ${state.price} درهم
🆔 رقم الطلب: #${state.orderId}
━━━━━━━━━━━━━━━━━━
✅ الرجاء تأكيد الطلب وإعلامي بطريقة الدفع.
شكراً! 🙏`;

  document.getElementById('final-message-box').textContent = msg;
  window.__orderMessage = msg;
}

/* ─── COPY MESSAGE ─── */
document.getElementById('btn-copy-message').addEventListener('click', () => {
  const msg = window.__orderMessage || '';
  navigator.clipboard.writeText(msg).then(() => {
    const btn = document.getElementById('btn-copy-message');
    const txt = btn.querySelector('.btn-text');
    txt.textContent = '✓ تم النسخ!';
    setTimeout(() => { txt.textContent = 'نسخ الرسالة'; }, 2500);
  });
});

/* ─── SWITCH STEPS (animated) ─── */
function switchStep(fromId, toId) {
  const from = document.getElementById(fromId);
  const to   = document.getElementById(toId);

  from.style.opacity = '0';
  from.style.transform = 'scale(.95)';
  setTimeout(() => {
    from.classList.add('hidden');
    from.style.opacity = '';
    from.style.transform = '';
    to.classList.remove('hidden');
    to.style.opacity = '0';
    to.style.transform = 'scale(1.04)';
    requestAnimationFrame(() => {
      to.style.transition = 'opacity .45s ease, transform .45s ease';
      to.style.opacity = '1';
      to.style.transform = 'scale(1)';
    });
  }, 300);
}

/* ─── TOAST NOTIFICATION ─── */
function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `
    position:fixed; bottom:2rem; left:50%; transform:translateX(-50%);
    background:rgba(30,10,60,.95); color:#f1f5f9; padding:.7rem 1.5rem;
    border-radius:30px; font-family:'Cairo',sans-serif; font-size:.9rem;
    border:1px solid rgba(124,58,237,.4); z-index:9999;
    animation: toastIn .3s ease; pointer-events:none;
    box-shadow: 0 4px 20px rgba(0,0,0,.5);
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ─── Allow Enter key on input ─── */
document.getElementById('instagram-username').addEventListener('keydown', e => {
  if (e.key === 'Enter') btnNext1.click();
});

/* ─── CSS animations injected ─── */
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%,100%{transform:translateX(0);}
    20%{transform:translateX(-8px);}
    40%{transform:translateX(8px);}
    60%{transform:translateX(-5px);}
    80%{transform:translateX(5px);}
  }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(10px);} to{opacity:1;transform:translateX(-50%) translateY(0);} }
  .page-wrapper { transition: opacity .3s ease, transform .3s ease; }
`;
document.head.appendChild(shakeStyle);
