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

document.addEventListener('DOMContentLoaded', () => Theme.init());
window.Theme = Theme;
