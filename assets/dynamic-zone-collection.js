class DynamicZoneCollection extends HTMLElement {
	constructor() {
		super();
		this.domain = "https://ship.heirloomroses.com";
		this.storageKey = "locator";
		this.productsLimit = parseInt(this.dataset.productsLimit || "8") || 8;
		this.cardsDesktop = parseInt(this.dataset.cardsDesktop || "4") || 4;
		this.cardsMobile = parseInt(this.dataset.cardsMobile || "2") || 2;
		this.sectionTitle = this.dataset.sectionTitle || "Recommended for Your Zone {zone}";
		this.shopAllText = this.dataset.shopAllText || "Shop All";
		this.sectionId = this.dataset.sectionId || "";
		this.currentZone = null;
		this.currentIndex = 0;
		this.isTransitioning = false;
		this.startX = 0;
		this.currentX = 0;
		this.isDragging = false;
	}

	connectedCallback() {
		this.render();
		this.loadZoneProducts();

		this.setupStorageListener();
		this.setupCarouselListeners();
		this.setupQuickAddListeners();

		document.addEventListener("zoneUpdated", (e) => {
			const customEvent = e;
			if (customEvent.detail && customEvent.detail.zone) {
				this.handleZoneUpdate(customEvent.detail.zone);
			}
		});

		window.addEventListener("resize", () => {
			this.updateCarousel();
			this.updateButtons();
		});
	}

	setupStorageListener() {
		window.addEventListener("storage", (e) => {
			if (e.key === this.storageKey && e.newValue) {
				const newData = JSON.parse(e.newValue);
				this.handleZoneUpdate(newData.zone);
			}
		});

		this.storageCheckInterval = setInterval(() => {
			const sessionData = localStorage.getItem(this.storageKey);
			if (sessionData) {
				const parsedData = JSON.parse(sessionData);
				if (parsedData.zone && parsedData.zone !== this.currentZone) {
					this.handleZoneUpdate(parsedData.zone);
				}
			}
		}, 1000);
	}

	disconnectedCallback() {
		if (this.storageCheckInterval) {
			clearInterval(this.storageCheckInterval);
		}
	}

	handleZoneUpdate(newZone) {
		if (newZone !== this.currentZone) {
			this.currentZone = newZone;
			this.loadZoneProducts();
		}
	}

	render() {
		const gridClass = "product-grid product-grid--grid product-grid--zone-collection product-grid--" + this.sectionId;
		this.innerHTML = `
      <div class="zone-products-scroll-container">
        <ul class="${gridClass}" data-testid="product-grid" product-grid-view="default" ref="grid" role="list" data-product-card-size="medium" style="--mobile-columns: ${this.cardsMobile}; --zone-cards-desktop: ${this.cardsDesktop};">
          <li class="loading-products" style="list-style: none; grid-column: 1 / -1;">
            <p>Loading products...</p>
          </li>
        </ul>
      </div>
    `;
	}

	async loadZoneProducts() {
		try {
			const sessionData = localStorage.getItem(this.storageKey);
			let zone = null;

			if (sessionData) {
				const parsedData = JSON.parse(sessionData);
				zone = parsedData.zone;
			}

			if (!zone) {
				await this.waitForZoneDetection();
				const updatedSessionData = localStorage.getItem(this.storageKey);
				if (updatedSessionData) {
					const parsedData = JSON.parse(updatedSessionData);
					zone = parsedData.zone;
				}
			}

			if (!zone) {
				this.showError("Unable to detect your hardiness Zone");
				this.hide();
				return;
			}

			this.currentZone = zone;

			if (["1", "2", "12"].includes(zone)) {
				this.hide();
				return;
			}

			this.show();

			await this.fetchAndDisplayProducts(zone);
		} catch (error) {
			this.showError("Error loading products");
			this.hide();
		}
	}

	async waitForZoneDetection(maxWait = 5000) {
		const startTime = Date.now();

		return new Promise((resolve) => {
			const checkInterval = setInterval(() => {
				const sessionData = localStorage.getItem(this.storageKey);

				if (sessionData) {
					clearInterval(checkInterval);
					resolve();
				} else if (Date.now() - startTime > maxWait) {
					clearInterval(checkInterval);
					resolve();
				}
			}, 100);
		});
	}

	async fetchAndDisplayProducts(zone) {
		try {
			const collectionHandle = `hardiness-zone-${zone}`;
			// Request extra products so after filtering to in-stock only we still have enough for the grid
			const fetchLimit = Math.max(this.productsLimit * 3, 24);
			const collectionUrl = `/collections/${collectionHandle}/products.json?limit=${fetchLimit}`;

		const productsGrid = this.querySelector(`.product-grid`);
			if (productsGrid) {
			productsGrid.innerHTML = '<li class="loading-products" style="list-style: none; grid-column: 1 / -1;"><p>Loading products...</p></li>';
			}

			const response = await fetch(collectionUrl);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			if (!data.products || data.products.length === 0) {
				this.hide();
				return;
			}

			this.displayProducts(data.products, zone, collectionHandle);
			this.show();
		} catch (error) {
			this.hide();
		}
	}

  displayProducts(products, zone, collectionHandle) {
		const titleEl = this.querySelector(`.zone-collection-title`);
		const shopAllLink = this.querySelector(`.zone-shop-all-link`);
		const productsGrid = this.querySelector(`.product-grid`);

		if (titleEl) {
			const safeTitle = this.sectionTitle.replace("Zone {zone}", `<a href="#" class="zone-link" data-zone="${zone}">Zone ${zone}</a>`);
			titleEl.innerHTML = safeTitle;

			const zoneLink = titleEl.querySelector('.zone-link');
			if (zoneLink) {
				zoneLink.addEventListener('click', (e) => {
					e.preventDefault();
					e.stopPropagation();

					const trigger = document.querySelector('tool-tip-trigger.location-zone-popup, tool-tip-trigger[data-tool-tip="LocationDetector"]');
					if (trigger) {
						trigger.click();
						return;
					}
				});
			}
		}

		// Update zone number in promotional text
		const wrapper = this.closest(".zone-collection-wrapper");
		const promotionalTextEl = wrapper?.querySelector(".zone-promotional-text");
		if (promotionalTextEl) {
			const zonePlaceholders = promotionalTextEl.querySelectorAll(".zone-dynamic-number");
			if (zonePlaceholders.length) {
				zonePlaceholders.forEach((el) => { el.textContent = zone; });
			} else {
				// Fallback: replace any "Zone N" in content (e.g. old "Zone 7" when no {zone} placeholder)
				const zoneNumberRegex = /Zone\s*\d+/i;
				if (zoneNumberRegex.test(promotionalTextEl.innerHTML)) {
					promotionalTextEl.innerHTML = promotionalTextEl.innerHTML.replace(zoneNumberRegex, "Zone " + zone);
				}
			}
		}

		// Update VIEW ALL button link to zone collection (dynamic)
		const promotionalButton = wrapper?.querySelector(".zone-promotional-button");
		if (promotionalButton && promotionalButton instanceof HTMLAnchorElement) {
			promotionalButton.href = `/collections/${collectionHandle}`;
		}

		if (shopAllLink) {
			shopAllLink.href = `/collections/${collectionHandle}`;
			shopAllLink.classList.remove("hide");
		}
		if (productsGrid) {
			const availableProducts = products.filter((product) =>
				product.variants.some((v) => v.available)
			);
			const productsToDisplay = availableProducts.slice(0, this.productsLimit);
			const productsHTML = productsToDisplay.map((product, index) => this.createProductCard(product, index)).join("");
			productsGrid.innerHTML = productsHTML;
		}

		// Reset carousel state and update
		this.currentIndex = 0;
		// Use setTimeout to ensure DOM is updated before calculating positions
		setTimeout(() => {
			this.updateCarousel();
			this.updateButtons();
		}, 0);
	}

	createProductCard(product, index) {
		const image = product.images[0] || null;
		const variant = product.variants[0];
		const firstAvailableVariant = product.variants.find((v) => v.available) || product.variants[0];
		const priceNum = variant && variant.price != null ? parseFloat(variant.price) : 0;
		const compareNum = variant && variant.compare_at_price != null ? parseFloat(variant.compare_at_price) : null;
		const price = priceNum.toFixed(2);
		const comparePrice = compareNum != null ? compareNum.toFixed(2) : null;
		const onSale = comparePrice && compareNum > priceNum;
		const isAvailable = product.variants.some((v) => v.available);
		const productUrl = variant && variant.id ? `/products/${product.handle}?variant=${variant.id}` : `/products/${product.handle}`;
		const title = product.title.replace(/"/g, "&quot;");
		const imageSrc = image ? (typeof image === "string" ? image : image.src || "") : "";
		const imageAlt = (image && typeof image === "object" && image.alt) ? image.alt : product.title;
		const variantId = firstAvailableVariant && firstAvailableVariant.id ? firstAvailableVariant.id : "";

		const wishlistHeartSvg = '<svg class="icon-block__media icon-default" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20"><path d="M10 5.2393L8.5149 3.77392C6.79996 2.08174 4.01945 2.08174 2.30451 3.77392C0.589562 5.4661 0.589563 8.2097 2.30451 9.90188L10 17.4952L17.6955 9.90188C19.4104 8.2097 19.4104 5.4661 17.6955 3.77392C15.9805 2.08174 13.2 2.08174 11.4851 3.77392L10 5.2393ZM10.765 3.06343C12.8777 0.978857 16.3029 0.978856 18.4155 3.06343C20.5282 5.148 20.5282 8.52779 18.4155 10.6124L10.72 18.2057C10.3224 18.5981 9.67763 18.5981 9.27996 18.2057L1.58446 10.6124C-0.528154 8.52779 -0.528154 5.14801 1.58446 3.06343C3.69708 0.978859 7.12233 0.978858 9.23495 3.06343L10 3.81832L10.765 3.06343Z" fill-rule="evenodd"></path></svg>';
		return `
<li class="product-grid__item product-grid__item--${index}" data-product-id="${product.id}" ref="cards[]">
  <div class="grid-item grid-product zone-grid-product">
    <div class="product-grid-item" data-product-handle="${product.handle}" data-product-id="${product.id}">
      <div class="grid-item__content">
        <a href="${productUrl}" class="grid-item__link">
          <div class="grid-product__image-wrap zone-card-gallery">
            ${imageSrc ? `<div class="grid__image-ratio grid__image-ratio--square"><img src="${imageSrc}" alt="${imageAlt.replace(/"/g, "&quot;")}" class="grid__image-contain" loading="lazy" /></div>` : ""}
            ${!isAvailable ? '<div class="grid-product__tag grid-product__tag--sold-out">Sold Out</div>' : ""}
            ${onSale && isAvailable ? '<div class="grid-product__tag grid-product__tag--sale">Sale</div>' : ""}
            ${isAvailable && variantId ? `<div class="zone-quick-add-overlay" aria-hidden="true"><button type="button" class="zone-quick-add-btn" data-variant-id="${variantId}" data-product-title="${title}">Add to bag</button></div>` : ""}
          </div>
          <div class="grid-item__meta">
            <div class="grid-item__meta-main">
              <div class="grid-product__title">${product.title.replace(/"/g, "&quot;")}</div>
              <div class="grid-product__price">
                ${onSale && isAvailable ? `<span class="grid-product__price--original">$${comparePrice}</span> ` : ""}
                <span class="grid-product__price--current">$${price}</span>
              </div>
            </div>
            <div class="grid-item__meta-secondary">
              <div class="wishlist-floating-btn wishlist-collection-button">
                <button type="button" aria-label="Add to Wishlist" class="wkh-button wkh-align-center wkh-align-content-center" data-product-handle="${product.handle}">${wishlistHeartSvg}</button>
              </div>
            </div>
          </div>
        </a>
      </div>
    </div>
  </div>
</li>
    `.trim();
	}

	formatMoney(cents) {
		const dollars = (cents / 100).toFixed(2);
		return `$${dollars}`;
	}

	setupCarouselListeners() {
		const prevButton = this.querySelector(`.zone-collection-prev`);
		const nextButton = this.querySelector(`.zone-collection-next`);
		const track = this.querySelector(`.product-grid`);

		if (prevButton) {
			prevButton.addEventListener("click", () => this.prev());
		}
		if (nextButton) {
			nextButton.addEventListener("click", () => this.next());
		}

		if (track) {
			track.addEventListener("touchstart", (e) => this.handleTouchStart(e), { passive: true });
			track.addEventListener("touchmove", (e) => this.handleTouchMove(e), { passive: true });
			track.addEventListener("touchend", () => this.handleTouchEnd(), { passive: true });

			track.addEventListener("mousedown", (e) => this.handleMouseDown(e));
			track.addEventListener("mousemove", (e) => this.handleMouseMove(e));
			track.addEventListener("mouseup", () => this.handleMouseUp());
			track.addEventListener("mouseleave", () => this.handleMouseUp());
		}
	}

	setupQuickAddListeners() {
		this.addEventListener("click", (e) => {
			const btn = e.target.closest(".zone-quick-add-btn");
			if (!btn || btn.disabled) return;
			e.preventDefault();
			e.stopPropagation();
			const variantId = btn.getAttribute("data-variant-id");
			if (!variantId) return;
			this.handleQuickAdd(btn, variantId);
		});
	}

	async handleQuickAdd(btn, variantId) {
		const label = btn.textContent;
		btn.disabled = true;
		btn.textContent = "Adding…";
		const ZoneQuickAdd = typeof window !== "undefined" && window.ZoneQuickAdd;
		if (!ZoneQuickAdd || typeof ZoneQuickAdd.addToCart !== "function") {
			btn.textContent = "Error";
			setTimeout(() => {
				btn.textContent = label;
				btn.disabled = false;
			}, 2000);
			return;
		}
		try {
			const result = await ZoneQuickAdd.addToCart(variantId, 1);
			if (result.success) {
				btn.textContent = "Added";
				setTimeout(() => {
					btn.textContent = label;
					btn.disabled = false;
				}, 1500);
			} else {
				btn.textContent = result.error || "Error";
				setTimeout(() => {
					btn.textContent = label;
					btn.disabled = false;
				}, 2000);
			}
		} catch (err) {
			btn.textContent = "Error";
			setTimeout(() => {
				btn.textContent = label;
				btn.disabled = false;
			}, 2000);
		}
	}

	getVisibleCards() {
		return window.innerWidth <= 749 ? this.cardsMobile : this.cardsDesktop;
	}

	getMaxIndex() {
		const productsGrid = this.querySelector(`.product-grid`);
		if (!productsGrid) return 0;
		const cards = productsGrid.querySelectorAll(".product-grid__item");
		return Math.max(0, cards.length - this.getVisibleCards());
	}

	prev() {
		if (this.isTransitioning) return;
		this.currentIndex = Math.max(0, this.currentIndex - 1);
		this.updateCarousel();
	}

	next() {
		if (this.isTransitioning) return;
		this.currentIndex = Math.min(this.getMaxIndex(), this.currentIndex + 1);
		this.updateCarousel();
	}

	updateCarousel() {
		const productsGrid = this.querySelector(`.product-grid`);
		if (!productsGrid) return;

		const cards = productsGrid.querySelectorAll(".product-grid__item");
		if (cards.length === 0) return;

		this.isTransitioning = true;
		const cardWidth = cards[0].offsetWidth;
		const gap = parseInt(getComputedStyle(productsGrid).gap) || 0;
		const translateX = -(this.currentIndex * (cardWidth + gap));

		// productsGrid.style.transform = `translateX(${translateX}px)`;
		this.updateButtons();

		setTimeout(() => {
			this.isTransitioning = false;
		}, 300);
	}

	updateButtons() {
		const prevButton = this.querySelector(`.zone-collection-prev`);
		const nextButton = this.querySelector(`.zone-collection-next`);

		if (!prevButton || !nextButton) return;

		prevButton.disabled = this.currentIndex === 0;
		nextButton.disabled = this.currentIndex >= this.getMaxIndex();

		prevButton.style.opacity = prevButton.disabled ? "0.5" : "1";
		nextButton.style.opacity = nextButton.disabled ? "0.5" : "1";
	}

	handleTouchStart(e) {
		this.startX = e.touches[0].clientX;
		this.isDragging = true;
	}

	handleTouchMove(e) {
		if (!this.isDragging) return;
		this.currentX = e.touches[0].clientX;
	}

	handleTouchEnd() {
		if (!this.isDragging) return;
		this.isDragging = false;

		const deltaX = this.startX - this.currentX;
		const threshold = 50;

		if (Math.abs(deltaX) > threshold) {
			if (deltaX > 0) {
				this.next();
			} else {
				this.prev();
			}
		}
	}

	handleMouseDown(e) {
		this.startX = e.clientX;
		this.isDragging = true;
		const track = this.querySelector(`.product-grid`);
		if (track) {
			track.style.cursor = "grabbing";
		}
		e.preventDefault();
	}

	handleMouseMove(e) {
		if (!this.isDragging) return;
		this.currentX = e.clientX;
	}

	handleMouseUp() {
		if (!this.isDragging) return;
		this.isDragging = false;
		const track = this.querySelector(`.product-grid`);
		if (track) {
			track.style.cursor = "grab";
		}

		const deltaX = this.startX - this.currentX;
		const threshold = 50;

		if (Math.abs(deltaX) > threshold) {
			if (deltaX > 0) {
				this.next();
			} else {
				this.prev();
			}
		}
	}

	showError(message) {
		const productsGrid = this.querySelector(`.product-grid`);
		if (productsGrid) {
			productsGrid.innerHTML = `<li class="error-message" style="list-style: none; grid-column: 1 / -1;"><p>${message}</p></li>`;
		}
	}

	hide() {
		const wrapper = this.closest(".zone-collection-wrapper");
		if (wrapper) {
			wrapper.style.display = "none";
		}
	}

	show() {
		const wrapper = this.closest(".zone-collection-wrapper");
		if (wrapper) {
			wrapper.style.display = "block";
		}
	}
}

customElements.define("dynamic-zone-collection", DynamicZoneCollection);