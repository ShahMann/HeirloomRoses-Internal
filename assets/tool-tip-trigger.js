import { debounce } from "@theme/utilities";

class ToolTipTrigger extends HTMLElement {
  constructor() {
    super();
    this.el = this;
    this.toolTipContent = this.querySelector("[data-tool-tip-trigger-content]");

    // If quick view or quick add, trigger on the grid item so we
    // can preload data as soon as we hover or focus on it
    this.trigger = this.dataset.toolTip.includes("Quick")
      ? this.el.closest("[data-product-grid-item]")
      : this.el;

    // console.log('running my code');
    this.init();

  }

  init() {
    const toolTipOpen = new CustomEvent("tooltip:open", {
      detail: {
        context: this.dataset.toolTip,
        content: this.toolTipContent?.innerHTML,
        tool_tip_classes: this.dataset.toolTipClasses,
      },
      bubbles: true,
    });

    const toolTipInteract = new CustomEvent("tooltip:interact", {
      detail: {
        context: this.dataset.toolTip,
        content: this.toolTipContent?.innerHTML,
        tool_tip_classes: this.dataset.toolTipClasses,
      },
      bubbles: true,
    });

    const debouncedMouseOverHandler = debounce(
      500,
      (e) => {
        e.stopPropagation();
        this.dispatchEvent(toolTipInteract);
      },
      true
    );

    const debouncedFocusInHandler = debounce(500, (e) => {
      e.stopPropagation();
      this.dispatchEvent(toolTipInteract);
    });

    this.trigger.addEventListener("mouseover", debouncedMouseOverHandler);

    this.trigger.addEventListener("focusin", debouncedFocusInHandler);

    window.addEventListener("DOMContentLoaded", () => {
      // Defer the check a bit to ensure all components are mounted
      const urlParams = new URLSearchParams(window.location.search);

      setTimeout(() => {
        if (
          urlParams.get("hardiness-zone-popup") === "true" &&
          this.el.classList.contains("location-zone-popup")
        ) {
          console.log("Opening tooltip from URL hash...");
          this.el.classList.add("is-open");
          this.dispatchEvent(toolTipOpen);
        }
      }, 100); // Delay can be adjusted as needed
    });
    this.el.addEventListener("click", (e) => {
      // Stop propagation so clicks inside the popup don't bubble up to the document click handler
      e.stopPropagation();

      if (!this.el.classList.contains("is-open")) {
        this.el.classList.add("is-open");
        this.dispatchEvent(toolTipOpen);
      }
    });

    document.addEventListener("tooltip:close", () => {
      this.el.classList.remove("is-open");
    });

    // Close when close button inside the tooltip is clicked
    this.el.addEventListener("click", (e) => {
      const closeBtn = e.target.closest('[data-tool-tip-close]') || (e.target.parentElement && e.target.parentElement.closest('[data-tool-tip-close]'));
      if (closeBtn) {
        e.preventDefault();
        this.el.classList.remove("is-open");
        document.dispatchEvent(new CustomEvent("tooltip:close", { bubbles: true }));
      }
    });

    // Close when user presses/clicks outside the visible popup box.
    // The overlay (.location_grow_zone_content) is full-screen and inside the trigger, so we must
    // check against the popup box (.zone-popup), not the trigger - otherwise clicks on the dark
    // overlay would not close. Use composedPath() so form re-renders don't break contains().
    const closeIfOutside = (e) => {
      if (!this.el.classList.contains("is-open")) return;
      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
      const popupBox = this.el.querySelector(".zone-popup");
      const elToCheck = popupBox || this.el;
      const clickInside = path.length > 0 ? path.includes(elToCheck) : elToCheck.contains(e.target);
      if (!clickInside) {
        this.el.classList.remove("is-open");
        document.dispatchEvent(new CustomEvent("tooltip:close", { bubbles: true }));
      }
    };
    document.addEventListener("mousedown", closeIfOutside, true);
    document.addEventListener("click", closeIfOutside, true);

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.code === "Escape" && this.el.classList.contains("is-open")) {
        this.el.classList.remove("is-open");
        document.dispatchEvent(new CustomEvent("tooltip:close", { bubbles: true }));
      }
    });
  }
}

customElements.define("tool-tip-trigger", ToolTipTrigger);