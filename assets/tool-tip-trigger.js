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
          this.dispatchEvent(toolTipOpen);
        }
      }, 100); // Delay can be adjusted as needed
    });
    this.el.addEventListener("click", (e) => {
      e.stopPropagation();
      this.dispatchEvent(toolTipOpen);
    });
  }
}

customElements.define("tool-tip-trigger", ToolTipTrigger);