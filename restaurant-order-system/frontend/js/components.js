/**
 * Shared UI Components — FoodHub Restaurant Order System
 */
const Components = {

  navbar(activePage = '') {
    const user = typeof Utils !== 'undefined' ? Utils.getUser() : null;
    const initials = user && typeof Utils !== 'undefined' ? Utils.getAvatarInitials(user.name) : '';

    const authLinks = user
      ? `<li class="nav-item dropdown">
           <a class="nav-link dropdown-toggle d-flex align-items-center gap-2" href="#" data-bs-toggle="dropdown">
             <div class="nav-user-avatar">${initials}</div>
             <span class="d-none d-lg-inline" style="font-size:0.85rem;font-weight:600">${user.name.split(' ')[0]}</span>
           </a>
           <ul class="dropdown-menu dropdown-menu-end" style="border-radius:12px;border:1px solid var(--border);background:var(--bg-card)">
             <li><a class="dropdown-item" href="profile.html"><i class="fa-solid fa-user me-2"></i>My Profile</a></li>
             <li><a class="dropdown-item" href="profile.html?tab=orders"><i class="fa-solid fa-bag-shopping me-2"></i>My Orders</a></li>
             ${user.role === 'admin' ? '<li><a class="dropdown-item" href="../pages/admin/dashboard.html"><i class="fa-solid fa-gauge me-2"></i>Admin Panel</a></li>' : ''}
             <li><hr class="dropdown-divider"></li>
             <li><button class="dropdown-item text-danger" onclick="Utils.logout()"><i class="fa-solid fa-right-from-bracket me-2"></i>Logout</button></li>
           </ul>
         </li>`
      : `<li class="nav-item"><a class="nav-link" href="login.html">Login</a></li>
         <li class="nav-item"><a class="btn btn-primary-custom btn-sm ms-1" href="register.html">Register</a></li>`;

    return `
    <nav class="navbar navbar-expand-lg navbar-custom fixed-top" id="mainNav">
      <div class="container">
        <a class="navbar-brand" href="index.html">
          <i class="fa-solid fa-utensils"></i>FoodHub
        </a>
        <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav mx-auto gap-1">
            <li class="nav-item"><a class="nav-link ${activePage === 'home' ? 'active' : ''}" href="index.html">Home</a></li>
            <li class="nav-item"><a class="nav-link ${activePage === 'menu' ? 'active' : ''}" href="menu.html">Menu</a></li>
            <li class="nav-item"><a class="nav-link ${activePage === 'experience' ? 'active' : ''}" href="restaurant-experience.html">Dining</a></li>
            <li class="nav-item"><a class="nav-link ${activePage === 'loyalty' ? 'active' : ''}" href="loyalty.html">Loyalty</a></li>
            <li class="nav-item"><a class="nav-link ${activePage === 'feedback' ? 'active' : ''}" href="feedback.html">Feedback</a></li>
            <li class="nav-item"><a class="nav-link ${activePage === 'bill' ? 'active' : ''}" href="bill.html">Bill</a></li>
            <li class="nav-item"><a class="nav-link" href="menu.html?offers=true">Offers</a></li>
            <li class="nav-item"><a class="nav-link" href="index.html#about">About</a></li>
            <li class="nav-item"><a class="nav-link ${activePage === 'contact' ? 'active' : ''}" href="contact.html">Contact</a></li>
          </ul>
          <ul class="navbar-nav align-items-center gap-2" id="auth-links">
            ${authLinks}
          </ul>
          <div class="d-flex align-items-center gap-2 ms-3">
            <!-- Language Dropdown -->
            <div id="google_translate_element" class="me-2" style="font-size:0.75rem;"></div>

            <!-- Font Adjuster -->
            <div class="theme-toggle me-1" title="Adjust font size" onclick="adjustFontSize()" style="padding:4px 8px; border-radius:8px;">
              <i class="fa-solid fa-font"></i>
            </div>

            <!-- Theme Toggle -->
            <div class="theme-toggle" title="Toggle dark/light mode" id="themeToggle">
              <i class="fa-solid fa-moon" id="theme-icon"></i>
            </div>
            <a href="cart.html" class="nav-link position-relative" aria-label="Cart">
              <i class="fa-solid fa-cart-shopping fa-lg"></i>
              <span class="cart-badge cart-count" style="display:none">0</span>
            </a>
          </div>
        </div>
      </div>
    </nav>`;
  },

  promoBar() {
    return `
    <div class="promo-banner" id="promoBanner">
      <span class="promo-scroll">
        🎉 WELCOME10 — 10% off your first order &nbsp;&nbsp;|&nbsp;&nbsp;
        🚚 FREE delivery on orders above ₹400 &nbsp;&nbsp;|&nbsp;&nbsp;
        🍕 FOOD20 — 20% off orders above ₹500 &nbsp;&nbsp;|&nbsp;&nbsp;
        ⏰ Order now, delivered in 45 mins &nbsp;&nbsp;|&nbsp;&nbsp;
        🎉 WELCOME10 — 10% off your first order &nbsp;&nbsp;|&nbsp;&nbsp;
        🚚 FREE delivery on orders above ₹400
      </span>
      <button class="close-promo" onclick="document.getElementById('promoBanner').remove()">✕</button>
    </div>`;
  },

  footer() {
    return `
    <footer class="footer">
      <div class="container">
        <div class="row g-4">
          <div class="col-md-4">
            <div class="footer-brand mb-2"><i class="fa-solid fa-utensils me-2"></i>FoodHub</div>
            <p class="text-muted small" style="max-width:280px">Delicious meals delivered to your doorstep. Fresh ingredients, authentic flavors — every single time.</p>
            <div class="footer-social d-flex gap-2 mt-3">
              <a href="#" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
              <a href="#" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
              <a href="#" aria-label="Twitter"><i class="fa-brands fa-twitter"></i></a>
              <a href="#" aria-label="YouTube"><i class="fa-brands fa-youtube"></i></a>
            </div>
          </div>
          <div class="col-md-2">
            <h5>Quick Links</h5>
            <ul>
              <li><a href="menu.html">Menu</a></li>
              <li><a href="restaurant-experience.html">Dining</a></li>
              <li><a href="cart.html">Cart</a></li>
              <li><a href="track-order.html">Track Order</a></li>
              <li><a href="loyalty.html">Loyalty</a></li>
              <li><a href="bill.html">Bill</a></li>
              <li><a href="feedback.html">Feedback</a></li>
              <li><a href="contact.html">Contact</a></li>
              <li><a href="menu.html?offers=true">Offers</a></li>
            </ul>
          </div>
          <div class="col-md-3">
            <h5>Contact Us</h5>
            <ul>
              <li><a href="tel:+919876543210"><i class="fa-solid fa-phone me-2"></i>+91 98765 43210</a></li>
              <li><a href="mailto:info@foodhub.com"><i class="fa-solid fa-envelope me-2"></i>info@foodhub.com</a></li>
              <li><a href="#"><i class="fa-solid fa-location-dot me-2"></i>Chennai, Tamil Nadu</a></li>
            </ul>
          </div>
          <div class="col-md-3">
            <h5>Working Hours</h5>
            <ul class="list-unstyled text-muted">
              <li class="mb-1 small"><i class="fa-regular fa-clock me-2"></i>Mon – Fri: 10 AM – 11 PM</li>
              <li class="mb-1 small"><i class="fa-regular fa-clock me-2"></i>Sat – Sun: 9 AM – 12 AM</li>
            </ul>
            <div class="mt-3">
              <span class="badge" style="background:var(--primary-light);color:var(--primary);border-radius:20px;padding:0.4rem 1rem;font-size:0.78rem">
                <i class="fa-solid fa-circle me-1" style="font-size:0.5rem;vertical-align:middle;color:#28a745"></i>We're Open
              </span>
            </div>
          </div>
        </div>
        <hr class="my-4" style="border-color:var(--border)">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <p class="text-muted small mb-0">© 2026 FoodHub Restaurant. All rights reserved.</p>
          <div class="d-flex gap-3">
            <a href="#" class="text-muted small">Privacy Policy</a>
            <a href="#" class="text-muted small">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
    <a href="cart.html" class="floating-cart d-md-none" aria-label="Cart">
      <i class="fa-solid fa-cart-shopping"></i>
      <span class="cart-badge cart-count" style="display:none;top:0;right:0">0</span>
    </a>

    <!-- Floating AI Chatbot Button & Window -->
    <style>
      .ai-chatbot-btn {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--gradient);
        color: #fff;
        border: none;
        box-shadow: 0 4px 16px rgba(255, 107, 53, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        cursor: pointer;
        z-index: 9990;
        transition: all 0.3s ease;
      }
      .ai-chatbot-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(255, 107, 53, 0.6);
      }
      .ai-chatbot-window {
        position: fixed;
        bottom: 6rem;
        right: 2rem;
        width: 330px;
        height: 440px;
        border-radius: 18px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        display: none;
        flex-direction: column;
        overflow: hidden;
        z-index: 9991;
        transition: all 0.3s ease;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }
      .ai-chatbot-header {
        padding: 0.85rem 1rem;
        background: var(--gradient);
        color: #fff;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 700;
        font-size: 0.95rem;
      }
      .ai-chatbot-messages {
        flex-grow: 1;
        padding: 0.85rem;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }
      .ai-msg {
        padding: 0.5rem 0.75rem;
        border-radius: 12px;
        max-width: 85%;
        font-size: 0.82rem;
        line-height: 1.4;
      }
      .ai-msg.user {
        background: var(--primary-light);
        color: var(--primary);
        align-self: flex-end;
        border-bottom-right-radius: 2px;
      }
      .ai-msg.bot {
        background: var(--border);
        align-self: flex-start;
        border-bottom-left-radius: 2px;
      }
      .ai-chatbot-input {
        padding: 0.65rem;
        border-top: 1px solid var(--border);
        display: flex;
        gap: 0.4rem;
        background: var(--bg-card);
      }
      .ai-chatbot-input input {
        flex-grow: 1;
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 0.35rem 0.65rem;
        font-size: 0.82rem;
        background: transparent;
        color: var(--text-color);
      }
      .ai-chatbot-input input:focus {
        outline: none;
        border-color: var(--primary);
      }
    </style>

    <button class="ai-chatbot-btn" onclick="toggleChatbot()" title="Ask FoodHub AI">
      <i class="fa-solid fa-robot"></i>
    </button>

    <div class="ai-chatbot-window" id="aiChatbotWindow">
      <div class="ai-chatbot-header">
        <span><i class="fa-solid fa-brain me-1 small"></i>FoodHub Assistant</span>
        <button class="btn btn-link text-white p-0" onclick="toggleChatbot()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ai-chatbot-messages" id="aiChatbotMsgs">
        <div class="ai-msg bot">Hello! I am your AI Assistant. Ask me about our menu, special offers, or reservations! 🍕</div>
      </div>
      <div class="ai-chatbot-input">
        <input type="text" id="aiChatbotInputText" placeholder="Type a message..." onkeydown="if(event.key==='Enter') sendChatMsg()">
        <button class="btn btn-primary-custom btn-sm" onclick="sendChatMsg()"><i class="fa-solid fa-paper-plane"></i></button>
      </div>
    </div>

    `;
  },

  foodCard(food, options = {}) {
    const effectivePrice = food.discount_price || food.price;
    const discount = Utils.getDiscountPercent(food.price, food.discount_price);
    const img = Utils.getFoodImage(food);
    const stars = '★'.repeat(Math.round(food.rating || 0)) + '☆'.repeat(5 - Math.round(food.rating || 0));
    const foodDataStr = JSON.stringify({
      id: food.id, name: food.name,
      price: effectivePrice, discount_price: food.discount_price,
      image: food.image
    }).replace(/'/g, '&#39;');

    return `
    <div class="col-md-6 col-lg-4 col-xl-3 mb-4" data-aos="fade-up">
      <div class="glass-card food-card h-100">
        <div class="card-img-wrap position-relative">
          <img src="${img}" alt="${food.name}" class="food-img" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'">
          ${discount ? `<span class="badge-discount">${discount}% OFF</span>` : ''}
          <span class="badge-veg ${food.is_veg ? 'veg' : 'non-veg'}"></span>
          <div class="qv-overlay">
            <button class="btn-qv quick-view-btn" data-id="${food.id}">
              <i class="fa-solid fa-eye me-1"></i>Quick View
            </button>
          </div>
        </div>
        <div class="p-3 d-flex flex-column flex-grow-1">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <h6 class="fw-bold mb-0" style="font-size:0.95rem">${food.name}</h6>
            <button class="fav-btn ms-1 ${options.isFav ? 'active' : ''}"
                    data-id="${food.id}" aria-label="Favorite">
              <i class="fa-${options.isFav ? 'solid' : 'regular'} fa-heart"></i>
            </button>
          </div>
          <p class="text-muted small mb-2" style="line-height:1.4">
            ${(food.description || '').substring(0, 65)}${(food.description || '').length > 65 ? '…' : ''}
          </p>
          <div class="d-flex align-items-center gap-2 mb-2">
            <span class="rating">${stars}</span>
            <span class="text-muted" style="font-size:0.78rem">(${food.review_count || 0})</span>
            <span class="text-muted ms-auto" style="font-size:0.78rem">
              <i class="fa-regular fa-clock"></i> ${food.cooking_time || 30}min
            </span>
          </div>
          <div class="d-flex justify-content-between align-items-center mt-auto">
            <div>
              <span class="price">${Utils.formatPrice(effectivePrice)}</span>
              ${food.discount_price ? `<span class="price-old">${Utils.formatPrice(food.price)}</span>` : ''}
            </div>
            <button class="btn btn-primary-custom btn-sm add-to-cart"
                    data-food='${foodDataStr}'
                    aria-label="Add ${food.name} to cart">
              <i class="fa-solid fa-plus"></i> Add
            </button>
          </div>
        </div>
      </div>
    </div>`;
  },

  quickViewModal(food) {
    const img = Utils.getFoodImage(food);
    const effectivePrice = food.discount_price || food.price;
    const discount = Utils.getDiscountPercent(food.price, food.discount_price);
    const stars = '★'.repeat(Math.round(food.rating || 0)) + '☆'.repeat(5 - Math.round(food.rating || 0));
    const ingredients = (food.ingredients || '').split(',').map(s => s.trim()).filter(Boolean);
    const foodDataStr = JSON.stringify({
      id: food.id, name: food.name,
      price: effectivePrice, discount_price: food.discount_price,
      image: food.image
    }).replace(/'/g, '&#39;');

    return `
    <div class="row g-4">
      <div class="col-md-5">
        <div class="position-relative">
          <img src="${img}" alt="${food.name}" class="qv-food-img">
          ${discount ? `<span class="badge-discount">${discount}% OFF</span>` : ''}
        </div>
      </div>
      <div class="col-md-7">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <h5 class="fw-bold mb-0">${food.name}</h5>
          <span class="badge-veg ${food.is_veg ? 'veg' : 'non-veg'}" style="position:static;margin-left:8px;flex-shrink:0"></span>
        </div>
        <div class="d-flex align-items-center gap-2 mb-3">
          <span class="rating">${stars}</span>
          <span class="text-muted small">(${food.review_count || 0} reviews)</span>
          <span class="text-muted ms-2 small"><i class="fa-regular fa-clock me-1"></i>${food.cooking_time || 30} min</span>
        </div>
        <p class="text-muted mb-3" style="font-size:0.9rem;line-height:1.7">${food.description || 'A delicious dish prepared with fresh ingredients.'}</p>
        ${ingredients.length ? `
        <div class="mb-3">
          <strong class="small">Ingredients:</strong><br>
          <div class="mt-1">${ingredients.map(i => `<span class="ingredient-tag">${i}</span>`).join('')}</div>
        </div>` : ''}
        ${food.calories ? `<p class="small text-muted"><i class="fa-solid fa-fire me-1 text-danger"></i>${food.calories} kcal</p>` : ''}
        <div class="d-flex align-items-center gap-3 mt-4">
          <div>
            <span class="price fs-4">${Utils.formatPrice(effectivePrice)}</span>
            ${food.discount_price ? `<span class="price-old">${Utils.formatPrice(food.price)}</span>` : ''}
          </div>
          <button class="btn btn-primary-custom add-to-cart flex-grow-1" data-food='${foodDataStr}'>
            <i class="fa-solid fa-cart-plus me-2"></i>Add to Cart
          </button>
        </div>
      </div>
    </div>`;
  }
};

window.Components = Components;

// ── Global event delegation ───────────────────────────────────
document.addEventListener('click', (e) => {
  // Add to cart
  const addBtn = e.target.closest('.add-to-cart');
  if (addBtn) {
    try {
      const food = JSON.parse(addBtn.dataset.food);
      Cart.addItem(food);
      addBtn.innerHTML = '<i class="fa-solid fa-check"></i> Added';
      addBtn.classList.add('btn-success');
      addBtn.classList.remove('btn-primary-custom');
      setTimeout(() => {
        addBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add';
        addBtn.classList.remove('btn-success');
        addBtn.classList.add('btn-primary-custom');
      }, 1200);
    } catch (err) {
      console.error('Add to cart error:', err);
    }
  }

  // Quick View
  const qvBtn = e.target.closest('.quick-view-btn');
  if (qvBtn) {
    const foodId = qvBtn.dataset.id;
    loadQuickView(foodId);
  }

  // Fav toggle
  const favBtn = e.target.closest('.fav-btn');
  if (favBtn) {
    favBtn.classList.toggle('active');
    const icon = favBtn.querySelector('i');
    if (favBtn.classList.contains('active')) {
      icon.className = 'fa-solid fa-heart';
      Utils.showToast('Added to favorites ❤️', 'success');
    } else {
      icon.className = 'fa-regular fa-heart';
      Utils.showToast('Removed from favorites', 'info');
    }
  }
});

async function loadQuickView(foodId) {
  const modal = document.getElementById('quickViewModal');
  if (!modal) return;
  const bodyEl = document.getElementById('qv-body');
  const nameEl = document.getElementById('qv-name');
  bodyEl.innerHTML = '<div class="text-center py-4"><div class="spinner-border"></div></div>';
  nameEl.textContent = 'Loading…';
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
  try {
    const res = await API.getFood(foodId);
    const food = res.data;
    nameEl.textContent = food.name;
    bodyEl.innerHTML = Components.quickViewModal(food);
  } catch (err) {
    bodyEl.innerHTML = `<div class="text-danger text-center py-4">${err.message}</div>`;
  }
}
window.loadQuickView = loadQuickView;
