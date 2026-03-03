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
		this.promotionalText = this.dataset.promotionalText || "";
		this.useDynamicText = this.dataset.useDynamicText === "true";
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
		this.innerHTML = `
      <div class="zone-collection-header-${this.sectionId}">
        <h2 class="zone-collection-title-${this.sectionId}">Loading Your Zone...</h2>
        <div class="zone-collection-arrows-${this.sectionId}">
          <button
            class="zone-collection-arrow-${this.sectionId} zone-collection-prev-${this.sectionId}"
            aria-label="Previous products"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <button
            class="zone-collection-arrow-${this.sectionId} zone-collection-next-${this.sectionId}"
            aria-label="Next products"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
        <a href="#" class="zone-shop-all-link-${this.sectionId} hide">${this.shopAllText}</a>
      </div>
      <div class="zone-products-scroll-container-${this.sectionId}">
        <div class="zone-products-grid-${this.sectionId}">
          <div class="loading-products">
            <p>Loading products...</p>
          </div>
        </div>
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
				this.showError("Unable to detect your hardiness zone");
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
			const collectionUrl = `/collections/${collectionHandle}/products.json?limit=${this.productsLimit}`;

			const productsGrid = this.querySelector(`.zone-products-grid-${this.sectionId}`);
			if (productsGrid) {
				productsGrid.innerHTML = '<div class="loading-products"><p>Loading products...</p></div>';
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
		const titleEl = this.querySelector(`.zone-collection-title-${this.sectionId}`);
		const shopAllLink = this.querySelector(`.zone-shop-all-link-${this.sectionId}`);
		const productsGrid = this.querySelector(`.zone-products-grid-${this.sectionId}`);
		const promotionalTextEl = this.closest('.zone-collection-wrapper')?.querySelector(`.zone-promotional-text-${this.sectionId}`);

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

		// Update promotional text with zone number if dynamic text is enabled
		if (promotionalTextEl && this.useDynamicText && this.promotionalText) {
			// Check if current content has the placeholder
			if (promotionalTextEl.innerHTML.includes('{zone}')) {
				promotionalTextEl.innerHTML = promotionalTextEl.innerHTML.replace(/{zone}/g, zone);
			} else if (promotionalTextEl.textContent && promotionalTextEl.textContent.includes('{zone}')) {
				// Update plain text content
				promotionalTextEl.textContent = promotionalTextEl.textContent.replace(/{zone}/g, zone);
			} else if (this.promotionalText.includes('{zone}')) {
				// Update from original template
				const updatedText = this.promotionalText.replace(/{zone}/g, zone);
				// Check if it's HTML or plain text
				if (updatedText.includes('<')) {
					promotionalTextEl.innerHTML = updatedText;
				} else {
					promotionalTextEl.textContent = updatedText;
				}
			}
		}

		// Update promotional button link if it points to collection
		const promotionalButton = this.closest('.zone-collection-wrapper')?.querySelector(`.zone-promotional-button-${this.sectionId}`);
		if (promotionalButton && promotionalButton instanceof HTMLAnchorElement) {
			if (promotionalButton.href && promotionalButton.href.includes('/collections/')) {
				// If button link contains collection placeholder, update it
				if (promotionalButton.href.includes('{collection}')) {
					promotionalButton.href = promotionalButton.href.replace('{collection}', collectionHandle);
				}
			}
		}

		if (shopAllLink) {
			shopAllLink.href = `/collections/${collectionHandle}`;
			shopAllLink.classList.remove("hide");
		}
		if (productsGrid) {
			const availableProducts = products.filter((product) => 
				product.variants.some((variant) => variant.available)
			);
			
			const productsToDisplay = availableProducts.slice(0, this.productsLimit);

			const productsHTML = productsToDisplay.map((product) => this.createProductCard(product)).join("");
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

	createProductCard(product) {
		const image = product.images[0] || "";
		const variant = product.variants[0];
		const price = variant.price ? parseFloat(variant.price).toFixed(2) : "0.00";
		const comparePrice = variant.compare_at_price ? parseFloat(variant.compare_at_price).toFixed(2) : null;

		const onSale = comparePrice && variant.compare_at_price > variant.price;
		const productTags = product.tags ? product.tags.join(",") : "";
		const hasCustomLabel = product.metafields && product.metafields.theme && product.metafields.theme.label;
		const customLabels = hasCustomLabel ? product.metafields.theme.label.value : "";

		const isAvailable = product.variants.some((variant) => variant.available);

		const secondImage = product.images[1] || null;

		const hasMultipleVariants = product.variants.length > 1;

		return `
      <div class="grid-item grid-product">
        <div class="product-grid-item" data-product-handle="${product.handle}" data-product-id="${product.id}">
          <div class="grid-item__content">
            <a href="/products/${product.handle}" class="grid-item__link">
              <div class="grid-product__image-wrap">
                <div class="grid-product__tags">
                  ${
						hasCustomLabel
							? `
                    <div class="grid-product__tag grid-product__tag--custom">
                      ${customLabels}
                    </div>
                  `
							: ""
					}
                  ${
						!isAvailable
							? `
                    <div class="grid-product__tag grid-product__tag--sold-out">
                      Sold Out
                    </div>
                  `
							: ""
					}
                  ${
						onSale && isAvailable
							? `
                    <div class="grid-product__tag grid-product__tag--sale">
                      Sale
                    </div>
                  `
							: ""
					}
                </div>
                ${
					image
						? `
                  <div class="grid__image-ratio grid__image-ratio--square">
                    <img 
                      src="${image.src}"
                      alt="${image.alt || product.title}"
                      class="grid__image-contain"
                      loading="lazy"
                    />
                  </div>
                `
						: ""
				}
              </div>
              <div class="grid-item__meta">
                <div class="grid-item__meta-main">
                  <div class="grid-product__title">${product.title.replace(/"/g, "")}</div>
                </div>
                <div class="grid-item__meta-secondary">
                  <div class="grid-product__price">
                    ${
						onSale
							? `
                      <span class="grid-product__price--original">$${comparePrice}</span>
                    `
							: ""
					}
                    <span class="grid-product__price--current">$${price}</span>
                  </div>
                  <div class="wishlist-floating-btn wishlist-collection-button">
                    <button type="button" aria-label="Add to Wishlist" class="wkh-button wkh-align-center wkh-align-content-center" data-product-handle="${
						product.handle
					}">
                      <div class="wkh-icon" icon="wishlist"></div>
                    </button>
                  </div>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    `;
	}

	formatMoney(cents) {
		const dollars = (cents / 100).toFixed(2);
		return `$${dollars}`;
	}

	setupCarouselListeners() {
		const prevButton = this.querySelector(`.zone-collection-prev-${this.sectionId}`);
		const nextButton = this.querySelector(`.zone-collection-next-${this.sectionId}`);
		const track = this.querySelector(`.zone-products-grid-${this.sectionId}`);

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

	getVisibleCards() {
		return window.innerWidth <= 749 ? this.cardsMobile : this.cardsDesktop;
	}

	getMaxIndex() {
		const productsGrid = this.querySelector(`.zone-products-grid-${this.sectionId}`);
		if (!productsGrid) return 0;
		const cards = productsGrid.querySelectorAll(".grid-item");
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
		const productsGrid = this.querySelector(`.zone-products-grid-${this.sectionId}`);
		if (!productsGrid) return;

		const cards = productsGrid.querySelectorAll(".grid-item");
		if (cards.length === 0) return;

		this.isTransitioning = true;
		const cardWidth = cards[0].offsetWidth;
		const gap = parseInt(getComputedStyle(productsGrid).gap) || 0;
		const translateX = -(this.currentIndex * (cardWidth + gap));

		productsGrid.style.transform = `translateX(${translateX}px)`;
		this.updateButtons();

		setTimeout(() => {
			this.isTransitioning = false;
		}, 300);
	}

	updateButtons() {
		const prevButton = this.querySelector(`.zone-collection-prev-${this.sectionId}`);
		const nextButton = this.querySelector(`.zone-collection-next-${this.sectionId}`);

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
		const track = this.querySelector(`.zone-products-grid-${this.sectionId}`);
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
		const track = this.querySelector(`.zone-products-grid-${this.sectionId}`);
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
		const productsGrid = this.querySelector(`.zone-products-grid-${this.sectionId}`);
		if (productsGrid) {
			productsGrid.innerHTML = `
        <div class="error-message">
          <p>${message}</p>
        </div>
      `;
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
