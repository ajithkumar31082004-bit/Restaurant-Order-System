/**
 * Theme & Navigation
 */
const Theme = {
  init() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    this.updateIcon(saved);

    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => this.toggle());
    });

    window.addEventListener('scroll', () => {
      const navbar = document.querySelector('.navbar-custom');
      if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    Cart.updateBadge();
    this.updateAuthNav();
    window.addEventListener('cartUpdated', () => Cart.updateBadge());

    // PWA Manifest Injection
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest.json';
      document.head.appendChild(link);
    }

    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered successfully:', reg.scope))
        .catch(err => console.warn('SW registration failed:', err));
    }
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    this.updateIcon(next);
  },

  updateIcon(theme) {
    document.querySelectorAll('.theme-toggle i').forEach(icon => {
      icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
  },

  updateAuthNav() {
    const user = Utils.getUser();
    const authLinks = document.getElementById('auth-links');
    if (!authLinks) return;

    if (user) {
      authLinks.innerHTML = `
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
            <i class="fa-solid fa-user"></i> ${user.name.split(' ')[0]}
          </a>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><a class="dropdown-item" href="profile.html"><i class="fa-solid fa-id-card me-2"></i>Profile</a></li>
            <li><a class="dropdown-item" href="track-order.html"><i class="fa-solid fa-location-dot me-2"></i>Track Order</a></li>
            ${user.role === 'admin' ? '<li><a class="dropdown-item" href="admin/dashboard.html"><i class="fa-solid fa-gauge me-2"></i>Admin</a></li>' : ''}
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item" href="#" onclick="Utils.logout(); return false;"><i class="fa-solid fa-right-from-bracket me-2"></i>Logout</a></li>
          </ul>
        </li>`;
    }
  },

  setActiveNav(page) {
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Theme.init();

  // Load Google Translate script dynamically
  if (!document.getElementById('google-translate-script')) {
    const s = document.createElement('script');
    s.id = 'google-translate-script';
    s.type = 'text/javascript';
    s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.body.appendChild(s);
  }
});

// Google Translate callback
window.googleTranslateElementInit = function() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    includedLanguages: 'en,ta,hi',
    layout: google.translate.TranslateElement.InlineLayout.SIMPLE
  }, 'google_translate_element');
};

// Accessibility: Adjust Font Size helper
let activeSizeState = 'medium';
window.adjustFontSize = function() {
  const root = document.documentElement;
  if (activeSizeState === 'medium') {
    root.style.setProperty('font-size', '18px', 'important');
    activeSizeState = 'large';
    if (typeof Utils !== 'undefined') Utils.showToast('Font size set to Large', 'info');
  } else if (activeSizeState === 'large') {
    root.style.setProperty('font-size', '14px', 'important');
    activeSizeState = 'small';
    if (typeof Utils !== 'undefined') Utils.showToast('Font size set to Small', 'info');
  } else {
    root.style.setProperty('font-size', '16px', 'important');
    activeSizeState = 'medium';
    if (typeof Utils !== 'undefined') Utils.showToast('Font size set to Medium', 'info');
  }
};

window.Theme = Theme;
