/**
 * Shopping Cart Manager — FoodHub
 */
const Cart = {
  key: 'restaurant_cart',
  savedKey: 'restaurant_saved_later',

  getItems() {
    return JSON.parse(localStorage.getItem(this.key) || '[]');
  },

  saveItems(items) {
    localStorage.setItem(this.key, JSON.stringify(items));
    this.updateBadge();
    window.dispatchEvent(new Event('cartUpdated'));
  },

  addItem(food, qty = 1) {
    if (typeof Utils !== 'undefined') {
      const u = Utils.getUser();
      if (!u || u.role !== 'user') {
        Utils.showToast('Only customers can place orders. Please login as a user.', 'warning');
        return;
      }
    }

    const items = this.getItems();
    const existing = items.find(i => i.id === food.id);
    const price = food.discount_price || food.price;

    if (existing) {
      existing.qty += qty;
    } else {
      items.push({
        id: food.id,
        foodId: food.id,
        name: food.name,
        price: parseFloat(price),
        originalPrice: parseFloat(food.price || price),
        image: food.image || null,
        qty
      });
    }
    this.saveItems(items);
    if (typeof Utils !== 'undefined') {
      Utils.showToast(`${food.name} added to cart! 🛒`, 'success');
    }
  },

  updateQty(id, qty) {
    let items = this.getItems();
    if (qty <= 0) {
      items = items.filter(i => i.id !== id);
    } else {
      const item = items.find(i => i.id === id);
      if (item) item.qty = qty;
    }
    this.saveItems(items);
  },

  removeItem(id) {
    const item = this.getItems().find(i => i.id === id);
    this.saveItems(this.getItems().filter(i => i.id !== id));
    if (item && typeof Utils !== 'undefined') {
      Utils.showToast(`${item.name} removed from cart`, 'info');
    }
  },

  clear() {
    localStorage.removeItem(this.key);
    this.updateBadge();
    window.dispatchEvent(new Event('cartUpdated'));
  },

  getCount() {
    return this.getItems().reduce((sum, i) => sum + i.qty, 0);
  },

  getSubtotal() {
    return this.getItems().reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  calculateTotals(coupon = null, tip = 0) {
    const subtotal = this.getSubtotal();
    const gst = Math.round(subtotal * 0.05 * 100) / 100;
    const delivery = subtotal >= 400 ? 0 : (subtotal === 0 ? 0 : 40);
    let discount = 0;

    if (coupon) {
      if (coupon.discount_type === 'percentage') {
        discount = Math.round(subtotal * (coupon.discount_value / 100) * 100) / 100;
        if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount);
      } else {
        discount = parseFloat(coupon.discount_value) || 0;
      }
    }

    const tipAmt = parseFloat(tip) || 0;
    const total = Math.max(0, subtotal + gst + delivery + tipAmt - discount);
    return { subtotal, gst, delivery, tip: tipAmt, discount, total };
  },

  updateBadge() {
    const count = this.getCount();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  // ── Save For Later ──────────────────────────────────────────
  getSavedItems() {
    return JSON.parse(localStorage.getItem(this.savedKey) || '[]');
  },

  saveForLater(id) {
    const items = this.getItems();
    const item = items.find(i => i.id === id);
    if (!item) return;

    // Add to saved
    const saved = this.getSavedItems();
    if (!saved.find(s => s.id === id)) {
      saved.push({ ...item });
      localStorage.setItem(this.savedKey, JSON.stringify(saved));
    }

    // Remove from cart
    this.saveItems(items.filter(i => i.id !== id));
    if (typeof Utils !== 'undefined') {
      Utils.showToast(`${item.name} saved for later`, 'info');
    }
    window.dispatchEvent(new Event('savedUpdated'));
  },

  moveToCart(id) {
    const saved = this.getSavedItems();
    const item = saved.find(s => s.id === id);
    if (!item) return;

    // Add back to cart
    this.addItem(item, item.qty);

    // Remove from saved
    localStorage.setItem(this.savedKey, JSON.stringify(saved.filter(s => s.id !== id)));
    window.dispatchEvent(new Event('savedUpdated'));
  },

  removeSaved(id) {
    const saved = this.getSavedItems().filter(s => s.id !== id);
    localStorage.setItem(this.savedKey, JSON.stringify(saved));
    window.dispatchEvent(new Event('savedUpdated'));
  },

  // Persist coupon to be picked up at checkout
  setCoupon(coupon) {
    sessionStorage.setItem('applied_coupon', JSON.stringify(coupon));
  },
  getCoupon() {
    const c = sessionStorage.getItem('applied_coupon');
    return c ? JSON.parse(c) : null;
  },
  clearCoupon() {
    sessionStorage.removeItem('applied_coupon');
  }
};

window.Cart = Cart;
