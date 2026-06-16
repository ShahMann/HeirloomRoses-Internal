var passwordInput = document.getElementById("register-password");
var confirmPasswordInput = document.getElementById("register-confirm-password");
var passwordErrorSpan = document.getElementById("password-error");
var confirmPasswordErrorSpan = document.getElementById(
  "confirm-password-error"
);
document.querySelector(".register").disabled = true;

function showError(errorSpan, errorMessage) {
  errorSpan.textContent = errorMessage;
  errorSpan.style.display = "block";
}

function hideError(errorSpan) {
  errorSpan.style.display = "none";
}

function validatePassword() {
  var password = passwordInput.value.trim();

  var minLength = password.length >= 8;
  var hasUpperCase = /[A-Z]/.test(password);
  var hasLowerCase = /[a-z]/.test(password);
  var hasNumber = /[0-9]/.test(password);
  var hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password === "") {
    showError(passwordErrorSpan, window.passwordError.passwordlengthZeroError);
    passwordInput.value = "";
    document.querySelector(".register").disabled = true;
  } else if (!minLength) {
    showError(passwordErrorSpan, window.passwordError.passwordlengthError);
    document.querySelector(".register").disabled = true;
  } else if (!hasUpperCase) {
    showError(
      passwordErrorSpan,
      window.passwordError.passwordlengthUppercaseError
    );
    document.querySelector(".register").disabled = true;
  } else if (!hasLowerCase) {
    showError(
      passwordErrorSpan,
      window.passwordError.passwordlengthLowercaseError
    );
    document.querySelector(".register").disabled = true;
  } else if (!hasNumber) {
    showError(
      passwordErrorSpan,
      window.passwordError.passwordlengthNumberError
    );
    document.querySelector(".register").disabled = true;
  } else if (!hasSpecialChar) {
    showError(
      passwordErrorSpan,
      window.passwordError.passwordlengthSpecialError
    );
    document.querySelector(".register").disabled = true;
  } else {
    hideError(passwordErrorSpan);
  }
}

function validateConfirmPassword() {
  var password = passwordInput.value;
  var confirmPassword = confirmPasswordInput.value;

  if (password !== confirmPassword) {
    showError(confirmPasswordErrorSpan, window.passwordError.passwordError);
    document.querySelector(".register").disabled = true;
  } else {
    hideError(confirmPasswordErrorSpan);
    document.querySelector(".register").disabled = false;
  }
}

passwordInput.addEventListener("input", validatePassword);
confirmPasswordInput.addEventListener("input", validateConfirmPassword);
