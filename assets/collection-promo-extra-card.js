/**
 * On collection pages where the promo card is enabled, page 2+ would show one fewer
 * product (no promo slot). This script fetches one extra product and appends it to
 * the grid so the layout stays full. Only runs when URL has ?page=2 or higher.
 */
(function () {
  function getPageFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    if (!page) return 1;
    const n = parseInt(page, 10);
    return isNaN(n) || n < 1 ? 1 : n;
  }

  function getCollectionHandle() {
    const match = window.location.pathname.match(/^\/collections\/([^/]+)/);
    return match ? match[1] : null;
  }

  function buildProductCard(product, sectionId) {
    const image = product.featured_image || (product.images && product.images[0]);
    const imageSrc = image && (typeof image === 'string' ? image : (image.src || image.url));
    const imageAlt = (image && typeof image === 'object' && image.alt) ? image.alt : (product.title || '');
    const variant = product.variants && product.variants[0];
    const priceCents = variant && (variant.price != null) ? Number(variant.price) : 0;
    const price = (priceCents / 100).toFixed(2);
    const compareCents = variant && variant.compare_at_price != null ? Number(variant.compare_at_price) : 0;
    const compareAt = compareCents > 0 ? (compareCents / 100).toFixed(2) : null;
    const productUrl = (product.url && product.url.startsWith('/')) ? product.url : `/products/${product.handle}`;
    const title = (product.title || '').replace(/"/g, '&quot;');

    const li = document.createElement('li');
    li.className = 'product-grid__item product-grid__item--promo-extra';
    li.setAttribute('data-product-id', product.id);
    li.setAttribute('data-page', getPageFromUrl());
    li.setAttribute('ref', 'cards[]');
    li.id = `${sectionId}-${product.id}`;

    const cardInner = `
      <div class="product-card" style="display: grid; height: 100%;">
        <a href="${productUrl}" class="product-card__link" ref="productCardLink">
          <span class="visually-hidden">${title}</span>
        </a>
        <div class="product-card__content layout-panel-flex layout-panel-flex--column product-grid__card spacing-style border-style gap-style">
          <div class="card-gallery card-gallery--promo-extra spacing-style border-style" style="--gallery-aspect-ratio: 1;">
            ${imageSrc
              ? `<div class="media-fit"><img src="${imageSrc}" alt="${imageAlt.replace(/"/g, '&quot;')}" class="product-card__image" loading="lazy" width="500" height="500" style="width: 100%; height: 100%; object-fit: cover; display: block;" /></div>`
              : ''
            }
          </div>
          <div class="product-grid-view-zoom-out--details">
            <h3 class="h4">${title}</h3>
          </div>
          <h3 class="h4" style="margin: 0; font: inherit; color: var(--color-foreground);">${title}</h3>
          <div style="font-size: 1rem; color: var(--color-foreground);">
            ${compareAt ? `<span style="text-decoration: line-through;">$${compareAt}</span> ` : ''}
            <span>$${price}</span>
          </div>
        </div>
      </div>
    `;

    li.innerHTML = cardInner.trim();
    return li;
  }

  function run() {
    const resultsList = document.querySelector('results-list[data-promo-card-enabled="true"]');
    if (!resultsList) return;

    const productsPerPage = parseInt(resultsList.getAttribute('data-products-per-page'), 10);
    if (isNaN(productsPerPage) || productsPerPage < 1) return;

    const page = getPageFromUrl();
    if (page < 2) return;

    const handle = getCollectionHandle();
    if (!handle) return;

    const grid = resultsList.querySelector('ul.product-grid');
    if (!grid) return;

    const sectionId = resultsList.getAttribute('section-id') || '';

    const limit = productsPerPage + 1;
    const url = `/collections/${handle}/products.json?page=${page}&limit=${limit}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Products fetch failed');
        return res.json();
      })
      .then((data) => {
        const products = data.products;
        if (!products || products.length < limit) return;
        const extraProduct = products[limit - 1];
        const card = buildProductCard(extraProduct, sectionId);
        grid.appendChild(card);
      })
      .catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
