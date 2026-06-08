/* security.js – Professional Adblock Detection & Overlay */

(function() {
  'use strict';

  async function checkAdblock() {
    // Method 1: Try fetching a known Google AdSense URL
    try {
      await fetch(new Request('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
        method: 'HEAD',
        mode: 'no-cors'
      }));
    } catch (e) {
      return true;
    }

    // Method 2: Try fetching one of the active monetization domains
    try {
      await fetch(new Request('https://5gvci.com/act/files/tag.min.js?z=11119968', {
        method: 'HEAD',
        mode: 'no-cors'
      }));
    } catch (e) {
      return true;
    }

    // Method 3: DOM bait check
    return new Promise(resolve => {
      const bait = document.createElement('div');
      bait.setAttribute('class', 'ad-banner ads adsbygoogle adsbox ad-container ad-image');
      bait.setAttribute('id', 'ad-bait-check');
      bait.style.cssText = 'height:1px;width:1px;position:absolute;top:-999px;left:-999px;opacity:0;display:block !important;visibility:visible !important;';
      document.body.appendChild(bait);

      setTimeout(() => {
        const el = document.getElementById('ad-bait-check');
        const isBlocked = !el ||
          el.offsetHeight === 0 ||
          el.offsetParent === null ||
          window.getComputedStyle(el).display === 'none' ||
          window.getComputedStyle(el).visibility === 'hidden';
        if (el) el.remove();
        resolve(isBlocked);
      }, 150);
    });
  }

  function showAdblockOverlay() {
    if (document.getElementById('adblock-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'adblock-overlay';
    overlay.innerHTML = `
      <div class="adblock-modal">
        <div class="adblock-icon">🚫</div>
        <h2>اكتشفنا استخدامك لـ Adblock</h2>
        <p>
          هذا الموقع مجاني تماماً بفضل الإعلانات.<br/>
          الرجاء إيقاف مانع الإعلانات لمواصلة الاستخدام.
        </p>
        <div class="adblock-steps">
          <div class="step-item">
            <span class="step-num">1</span>
            <span>اضغط على أيقونة Adblock في شريط المتصفح</span>
          </div>
          <div class="step-item">
            <span class="step-num">2</span>
            <span>اختر "إيقاف التشغيل على هذا الموقع"</span>
          </div>
          <div class="step-item">
            <span class="step-num">3</span>
            <span>أعد تحميل الصفحة</span>
          </div>
        </div>
        <button class="adblock-refresh-btn" onclick="window.location.reload()">
          🔄 أعدت تعطيل Adblock، أعد التحميل
        </button>
        <p class="adblock-note">شكراً لدعمك! 🙏</p>
      </div>
    `;
    document.body.appendChild(overlay);

    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
      #adblock-overlay {
        position: fixed;
        inset: 0;
        background: rgba(3, 7, 18, 0.97);
        backdrop-filter: blur(20px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        animation: fadeInOverlay 0.5s ease;
      }
      @keyframes fadeInOverlay {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .adblock-modal {
        background: linear-gradient(145deg, rgba(20, 10, 40, 0.95), rgba(10, 5, 25, 0.95));
        border: 1px solid rgba(124, 58, 237, 0.4);
        border-radius: 24px;
        padding: 2.5rem 2rem;
        max-width: 460px;
        width: 100%;
        text-align: center;
        font-family: 'Cairo', sans-serif;
        box-shadow: 0 0 80px rgba(124, 58, 237, 0.25), 0 25px 60px rgba(0,0,0,0.6);
        animation: slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        direction: rtl;
      }
      @keyframes slideUp {
        from { transform: translateY(40px) scale(0.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }
      .adblock-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        animation: pulse 2s ease infinite;
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      .adblock-modal h2 {
        font-size: 1.5rem;
        font-weight: 900;
        color: #f1f5f9;
        margin-bottom: 0.8rem;
      }
      .adblock-modal > p {
        color: #94a3b8;
        font-size: 0.95rem;
        line-height: 1.7;
        margin-bottom: 1.5rem;
      }
      .adblock-steps {
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
        margin-bottom: 1.8rem;
        text-align: right;
      }
      .step-item {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 10px;
        padding: 0.7rem 1rem;
        color: #cbd5e1;
        font-size: 0.88rem;
      }
      .step-num {
        background: linear-gradient(135deg, #7c3aed, #a855f7);
        color: white;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.8rem;
        flex-shrink: 0;
      }
      .adblock-refresh-btn {
        background: linear-gradient(135deg, #7c3aed, #a855f7);
        color: white;
        border: none;
        padding: 0.9rem 1.8rem;
        border-radius: 50px;
        font-family: 'Cairo', sans-serif;
        font-size: 0.95rem;
        font-weight: 700;
        cursor: pointer;
        width: 100%;
        transition: 0.3s;
        box-shadow: 0 4px 20px rgba(124,58,237,0.35);
        margin-bottom: 1rem;
      }
      .adblock-refresh-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(124,58,237,0.5);
      }
      .adblock-note {
        color: #64748b;
        font-size: 0.8rem;
        margin: 0;
      }
    `;
    document.head.appendChild(style);
  }

  // Run check after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        checkAdblock().then(blocked => {
          if (blocked) showAdblockOverlay();
        });
      }, 500);
    });
  } else {
    setTimeout(() => {
      checkAdblock().then(blocked => {
        if (blocked) showAdblockOverlay();
      });
    }, 500);
  }
})();
