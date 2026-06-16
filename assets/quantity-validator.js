document.addEventListener("DOMContentLoaded", () => {
  const quantityInputs = document.querySelectorAll(".qty-input__input");
  const addToCartButton = document.querySelector('[name="add"]');
  const dynamicCheckoutContainer = document.querySelector(
    ".product-info__dynamic-checkout-button"
  );

  const updateButtonState = (isDisabled) => {
    addToCartButton?.toggleAttribute("disabled", isDisabled);

    const buyNowButton = dynamicCheckoutContainer?.querySelector(
      'button, input[type="submit"]'
    );
    buyNowButton?.toggleAttribute("disabled", isDisabled);
  };

  const handleQuantityChange = (input) => {
    const quantity = Math.max(Number(input.value) || 0, 0);
    input.value = quantity;
    updateButtonState(quantity < 1);
  };

  quantityInputs.forEach((input) => {
    const onInputOrBlur = () => {
      if (!input.value || input.value <= 0) input.value = 1;
      handleQuantityChange(input);
    };

    input.addEventListener("input", () => handleQuantityChange(input));
    input.addEventListener("blur", onInputOrBlur);

    input.addEventListener("keypress", (event) => {
      if (!/[0-9]/.test(event.key)) {
        event.preventDefault();
      }
    });

    onInputOrBlur();
  });
});
