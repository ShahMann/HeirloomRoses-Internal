/**
 * Zone Quick Add – AJAX add to cart with cart icon and cart drawer update.
 * Dispatches the theme's cart:update event so cart-icon and cart-items-component update without refresh.
 */
(function () {
  'use strict';

  var CART_UPDATE_EVENT = 'cart:update';
  var CART_ADD_URL = '/cart/add.js';

  /**
   * Get section IDs for cart items (drawer, etc.) so we can request updated HTML in the add response.
   * @returns {string} Comma-separated section IDs or empty string
   */
  function getCartSectionIds() {
    var components = document.querySelectorAll('cart-items-component[data-section-id]');
    var ids = [];
    components.forEach(function (el) {
      var id = el.getAttribute('data-section-id');
      if (id) ids.push(id);
    });
    return ids.join(',');
  }

  /**
   * Dispatch the theme's cart update event so cart icon and cart drawer refresh.
   * @param {number} itemCount - Quantity added (for cart icon: added count when source is product-form-component)
   * @param {Object} [sections] - Optional sections HTML from cart/add.js response
   */
  function dispatchCartUpdate(itemCount, sections) {
    var detail = {
      resource: {},
      sourceId: 'zone-quick-add',
      data: {
        source: 'product-form-component',
        itemCount: itemCount,
      },
    };
    if (sections && typeof sections === 'object') {
      detail.data.sections = sections;
    }
    document.dispatchEvent(
      new CustomEvent(CART_UPDATE_EVENT, {
        bubbles: true,
        detail: detail,
      })
    );
  }

  /**
   * Add a variant to the cart via AJAX and trigger cart icon + drawer update.
   * @param {string|number} variantId - Variant ID to add
   * @param {number} [quantity=1] - Quantity to add
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  function addToCart(variantId, quantity) {
    quantity = quantity == null || isNaN(quantity) ? 1 : Math.max(1, parseInt(quantity, 10));
    variantId = String(variantId).trim();
    if (!variantId) {
      return Promise.resolve({ success: false, error: 'Variant ID required' });
    }

    var sectionIds = getCartSectionIds();
    var body = {
      items: [{ id: parseInt(variantId, 10), quantity: quantity }],
    };
    if (sectionIds) {
      body.sections = sectionIds;
    }

    return fetch(CART_ADD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (_ref) {
        var ok = _ref.ok;
        var data = _ref.data;

        if (ok && !data.status) {
          dispatchCartUpdate(quantity, data.sections || undefined);
          return { success: true };
        }
        var message = (data && (data.description || data.message)) || 'Unable to add to cart';
        return { success: false, error: message };
      })
      .catch(function (err) {
        return { success: false, error: err && err.message ? err.message : 'Network error' };
      });
  }

  window.ZoneQuickAdd = {
    addToCart: addToCart,
  };
})();
