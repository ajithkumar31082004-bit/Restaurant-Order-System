/**
 * Utility Functions — FoodHub Restaurant Order System
 */
const Utils = {
  formatPrice(amount) {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  },

  formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  formatDateOnly(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  },

  showToast(message, icon = 'success') {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon,
        title: message,
        showConfirmButton: false,
        timer: 2800,
        timerProgressBar: true,
        customClass: { popup: 'rounded-4' }
      });
    }
  },

  showConfirm(title, text, confirmText = 'Yes, proceed') {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff6b35',
      cancelButtonColor: '#6c757d',
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancel',
      customClass: { popup: 'rounded-4' }
    });
  },

  showLoader(show = true) {
    let overlay = document.getElementById('loader-overlay');
    if (show) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loader-overlay';
        overlay.className = 'spinner-overlay';
        overlay.innerHTML = '<div class="spinner-ring"></div>';
        document.body.appendChild(overlay);
      }
    } else if (overlay) {
      overlay.remove();
    }
  },

  getFoodImage(food) {
    if (food && food.image) {
      const base = (typeof API !== 'undefined') ? API.baseURL.replace('/api', '') : '';
      return food.image.startsWith('http') ? food.image : base + food.image;
    }
    const placeholders = [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
      'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400',
      'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
    ];
    const id = food && food.id ? food.id : 0;
    return placeholders[id % placeholders.length];
  },

  getDiscountPercent(price, discountPrice) {
    if (!discountPrice || discountPrice >= price) return 0;
    return Math.round((1 - discountPrice / price) * 100);
  },

  debounce(fn, delay = 350) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  isLoggedIn() {
    return !!localStorage.getItem('token');
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/pages/login.html';
  },

  requireAuth(redirect = '/pages/login.html') {
    if (!this.isLoggedIn()) {
      window.location.href = redirect + '?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  },

  /**
   * Get initials from a full name (e.g. "Ajith K" → "AK")
   */
  getAvatarInitials(name = '') {
    return name.trim().split(' ')
      .filter(Boolean)
      .map(w => w[0].toUpperCase())
      .slice(0, 2)
      .join('');
  },

  /**
   * Copy text to clipboard and show toast
   */
  async copyToClipboard(text, label = 'Text') {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(`${label} copied!`, 'success');
    } catch {
      this.showToast('Copy failed', 'error');
    }
  },

  /**
   * Generate skeleton card HTML (n cards)
   */
  skeletonCards(n = 4, colClass = 'col-md-6 col-lg-4 col-xl-3') {
    return Array.from({ length: n }, () => `
      <div class="${colClass} mb-4">
        <div class="skeleton-card glass-card no-hover">
          <div class="skeleton skeleton-img"></div>
          <div style="padding:1rem">
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line short"></div>
            <div class="skeleton skeleton-line shorter" style="margin-top:0.5rem"></div>
          </div>
        </div>
      </div>`).join('');
  },

  /**
   * Get status badge HTML
   */
  statusBadge(status) {
    const map = {
      'Pending':          'warning',
      'Confirmed':        'info',
      'Preparing':        'info',
      'Cooking':          'info',
      'Packed':           'primary',
      'Out for Delivery': 'primary',
      'Delivered':        'success',
      'Cancelled':        'danger'
    };
    const cls = map[status] || 'secondary';
    return `<span class="badge bg-${cls}">${status}</span>`;
  },

  /**
   * Payment method badge HTML
   */
  paymentBadge(method) {
    const icons = {
      'COD':         'fa-money-bill',
      'UPI':         'fa-mobile-screen',
      'Credit Card': 'fa-credit-card',
      'Debit Card':  'fa-credit-card',
      'Net Banking': 'fa-building-columns'
    };
    return `<i class="fa-solid ${icons[method] || 'fa-credit-card'} me-1"></i>${method}`;
  },

  /**
   * Scroll to element with offset
   */
  scrollTo(selector, offset = 80) {
    const el = document.querySelector(selector);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  },

  categoryIcons: {
    'Starters':                  'fa-solid fa-bowl-food',
    'Soups':                     'fa-solid fa-mug-hot',
    'Salads':                    'fa-solid fa-leaf',
    'Vegetarian Main Course':    'fa-solid fa-seedling',
    'Paneer Specials':           'fa-solid fa-cheese',
    'Chicken':                   'fa-solid fa-drumstick-bite',
    'Mutton':                    'fa-solid fa-fire-burner',
    'Seafood':                   'fa-solid fa-fish',
    'Biryani':                   'fa-solid fa-bowl-rice',
    'Chinese':                   'fa-solid fa-chopstick-noodles',
    'Fast Food':                 'fa-solid fa-burger',
    'Desserts':                  'fa-solid fa-ice-cream',
    'Beverages':                 'fa-solid fa-glass-water',
    'Main Course':               'fa-solid fa-utensils',
    'Pizza':                     'fa-solid fa-pizza-slice',
    'Combos':                    'fa-solid fa-box-open'
  }
};

window.Utils = Utils;
