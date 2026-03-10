import { removeTrapFocus, trapFocus } from '@theme/focus'

class ToolTip extends HTMLElement {
  constructor() {
    super()
    this.el = this
    this.inner = this.querySelector('[data-tool-tip-inner]')
    this.closeButton = this.querySelector('[data-tool-tip-close]')
    this.toolTipContent = this.querySelector('[data-tool-tip-content]')
    this.toolTipTitle = this.querySelector('[data-tool-tip-title]')
    this.abortController = new AbortController()
    this._initEventListeners()
  }

  _initEventListeners() {
    document.addEventListener('tooltip:open', this._onTooltipOpen.bind(this), { signal: this.abortController.signal })
    document.addEventListener('drawerOpen', this._close.bind(this), { signal: this.abortController.signal })
    document.addEventListener('quickshop:product-blocks-loaded', this._lockScrolling.bind(this), {
      signal: this.abortController.signal
    })
  }

  _onTooltipOpen(e) {
    this._open(e.detail.context, e.detail.content)

    if (e.detail.tool_tip_classes) {
      this.el.classList.add(...e.detail.tool_tip_classes.split(' '))

      this.addEventListener(
        'tooltip:close',
        () => {
          this.el.classList.remove(...e.detail.tool_tip_classes.split(' '))
        },
        { once: true, signal: this.abortController.signal }
      )
    }
  }

  connectedCallback() {
    // Close when any [data-tool-tip-close] is clicked (template or injected content e.g. zone-close-btn). Use capture so we run before stopPropagation.
    document.documentElement.addEventListener(
      'click',
      (e) => {
        if (this.el.dataset.toolTipOpen !== 'true') return
        const closeBtn = e.target.closest('[data-tool-tip-close]') || (e.target.parentElement && e.target.parentElement.closest('[data-tool-tip-close]'))
        if (closeBtn) {
          e.preventDefault()
          this._close()
        }
      },
      { capture: true, signal: this.abortController.signal }
    )

    document.documentElement.addEventListener(
      'click',
      (event) => {
        if (this.el.dataset.toolTipOpen === 'true' && !this.inner.contains(event.target)) this._close()
      },
      { signal: this.abortController.signal }
    )

    document.documentElement.addEventListener(
      'keydown',
      (event) => {
        if (event.code === 'Escape') this._close()
      },
      { signal: this.abortController.signal }
    )
  }

  disconnectedCallback() {
    this.abortController.abort()
  }

  _open(context, insertedHTML) {
    if (this.toolTipTitle && context != 'store-availability') {
      this.toolTipTitle.style.display = 'none'
    } else {
      this.toolTipTitle.style.display = 'none'
    }

    if (context !== 'QuickShop' && context !== 'QuickAdd') this.toolTipContent.innerHTML = insertedHTML

    // Handle hydration for LocationDetector context
    if (context === 'LocationDetector') {
      this._hydrateLocationDetector()
    }

    setTimeout(() => {
      this._lockScrolling()
    }, 100)

    this.el.dataset.toolTipOpen = 'true'
    this.el.dataset.toolTip = context
  }

  _hydrateLocationDetector() {
    setTimeout(() => {
      // Step 1: Re-execute any <script type="module"> tags from the injected HTML
      // (innerHTML does NOT execute scripts, so we must recreate them)
      const scripts = this.toolTipContent.querySelectorAll('script[type="module"]')
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script')
        newScript.type = 'module'
        newScript.textContent = oldScript.textContent
        // Append to head so it is guaranteed to execute
        document.head.appendChild(newScript)
        oldScript.remove()
      })

      // Step 2: Wait for the custom element class to be registered (async import),
      // then remove defer-hydration and upgrade so connectedCallback() fires
      customElements.whenDefined('locator-form').then(() => {
        const locatorForms = this.toolTipContent.querySelectorAll('locator-form')
        locatorForms.forEach(form => {
          form.removeAttribute('defer-hydration')
          customElements.upgrade(form)
        })
      })
    }, 0)
  }

  _close() {
    if (document.body.classList.contains('photoswipe-open')) return

    // Stop all videos when tooltip closes
    this._stopAllVideos()

    this.dispatchEvent(
      new CustomEvent('tooltip:close', {
        detail: {
          context: this.el.dataset.toolTip
        },
        bubbles: true
      })
    )

    this.el.dataset.toolTipOpen = 'false'
    this._unlockScrolling()
  }

  // New method to stop all videos in the tooltip
  _stopAllVideos() {
    const videos = this.el.querySelectorAll('video')
    videos.forEach(video => {
      if (!video.paused) {
        video.pause()
        video.currentTime = 0 // Optional: reset video to beginning
      }
    })

    // Also handle iframe videos (YouTube, Vimeo, etc.) if any
    const iframes = this.el.querySelectorAll('iframe')
    iframes.forEach(iframe => {
      // For YouTube/Vimeo embeds, we need to reload the iframe to stop them
      const src = iframe.src
      if (src && (src.includes('youtube') || src.includes('vimeo') || src.includes('player'))) {
        iframe.src = ''
        iframe.src = src
      }
    })
  }

  _lockScrolling() {
    removeTrapFocus()

    // Lock mobile scrolling by preventing touchmove on body
    const preventScroll = (e) => {
      if (e.target.closest('.tool-tip__inner')) return
      e.preventDefault()
    }
    document.body.addEventListener('touchmove', preventScroll, { passive: false })
    this._preventScrollHandler = preventScroll

    document.documentElement.classList.add('modal-open')
    document.body.style.overflow = 'hidden'

    setTimeout(() => {
      trapFocus(this.el)
    }, 100)
  }

  _unlockScrolling() {
    removeTrapFocus()

    // Unlock mobile scrolling
    if (this._preventScrollHandler) {
      document.body.removeEventListener('touchmove', this._preventScrollHandler)
      this._preventScrollHandler = null
    }

    document.documentElement.classList.remove('modal-open')
    document.body.style.overflow = ''
  }
}

customElements.define('tool-tip', ToolTip)