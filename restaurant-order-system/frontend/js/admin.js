/**
 * Admin Panel JS — FoodHub Restaurant Order System
 */
const Admin = {
  requireAdmin() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      window.location.href = '/pages/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    const parsed = JSON.parse(user);
    if (parsed.role !== 'admin') {
      alert('Access denied. Admin only area.');
      window.location.href = '/';
      return false;
    }
    return true;
  },

  getUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/pages/login.html';
  },

  layout(activePage, content) {
    const user = this.getUser();
    const initials = user ? (user.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'AD';

    const navItems = [
      { id: 'dashboard',  icon: 'fa-gauge-high',     label: 'Dashboard',   href: 'dashboard.html'  },
      { id: 'orders',     icon: 'fa-bag-shopping',   label: 'Orders',      href: 'orders.html'     },
      { id: 'foods',      icon: 'fa-utensils',       label: 'Foods',       href: 'foods.html'      },
      { id: 'categories', icon: 'fa-layer-group',    label: 'Categories',  href: 'categories.html' },
      { id: 'coupons',    icon: 'fa-tag',            label: 'Coupons',     href: 'coupons.html'    },
      { id: 'customers',  icon: 'fa-users',          label: 'Customers',   href: 'customers.html'  }
    ];

    return `
    <div class="admin-wrapper">
      <!-- Sidebar -->
      <aside class="admin-sidebar" id="adminSidebar">
        <div class="sidebar-brand">
          <a href="/pages/index.html" class="navbar-brand" style="font-size:1.25rem">
            <i class="fa-solid fa-utensils"></i> FoodHub
          </a>
          <div class="mt-1 text-muted" style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:1px">Admin Panel</div>
        </div>

        <nav class="nav flex-column">
          ${navItems.map(item => `
            <a class="nav-link ${activePage === item.id ? 'active' : ''}" href="${item.href}">
              <i class="fa-solid ${item.icon}"></i>
              <span>${item.label}</span>
            </a>`).join('')}
        </nav>

        <div style="position:absolute;bottom:0;left:0;right:0;padding:1.25rem;border-top:1px solid var(--border)">
          <div class="d-flex align-items-center gap-2 mb-2">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--gradient);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;flex-shrink:0">${initials}</div>
            <div style="overflow:hidden">
              <div style="font-size:0.82rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user ? user.name : 'Admin'}</div>
              <div class="text-muted" style="font-size:0.7rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user ? user.email : ''}</div>
            </div>
          </div>
          <button onclick="Admin.logout()" class="btn btn-sm w-100" style="background:rgba(220,53,69,0.1);color:var(--danger);border:1px solid rgba(220,53,69,0.2);border-radius:8px;font-size:0.8rem;font-weight:600">
            <i class="fa-solid fa-right-from-bracket me-1"></i>Logout
          </button>
        </div>
      </aside>

      <!-- Main -->
      <main class="admin-main">
        <!-- Top bar -->
        <div class="admin-topbar">
          <div class="d-flex align-items-center gap-3">
            <button class="btn btn-sm d-lg-none" style="background:var(--glass);border:1px solid var(--border)" onclick="document.getElementById('adminSidebar').classList.toggle('open')">
              <i class="fa-solid fa-bars"></i>
            </button>
            <h5 class="mb-0 fw-700 text-capitalize">${activePage}</h5>
          </div>
          <div class="d-flex align-items-center gap-3">
            <div class="theme-toggle" onclick="Theme && Theme.toggle()" title="Toggle theme">
              <i class="fa-solid fa-moon" id="theme-icon"></i>
            </div>
            <a href="/pages/index.html" target="_blank" class="btn btn-sm" style="background:var(--primary-light);color:var(--primary);border:none;border-radius:8px;font-weight:600;font-size:0.8rem">
              <i class="fa-solid fa-arrow-up-right-from-square me-1"></i>View Site
            </a>
          </div>
        </div>

        <!-- Page Content -->
        <div style="padding:2rem">
          ${content}
        </div>
      </main>
    </div>`;
  }
};

window.Admin = Admin;
