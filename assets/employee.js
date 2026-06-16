const input = document.getElementById("nameInput");
const textOverlay = document.getElementById("textOverlay");
const editor = document.getElementById("editor");
const eidImage = document.getElementById("eidImage");

function isArabic(text) {
  const arabicRange = /[\u0600-\u06FF]/;
  return arabicRange.test(text);
}

function applyFont(name) {
  const isAr = isArabic(name);
  const fontFamily = isAr ? "'Cairo', sans-serif" : "'Roboto', sans-serif";
  textOverlay.style.fontFamily = fontFamily;
}

// Handle name input
input.addEventListener("input", function () {
  const name = this.value.trim();
  textOverlay.textContent = name;
  applyFont(name);
});

// Handle template selection
function handleTemplateChange() {
  const selectedTemplate = document.querySelector('input[name="template"]:checked');
  if (selectedTemplate) {
    const newImageSrc = selectedTemplate.dataset.image;
    const textTop = selectedTemplate.dataset.textTop || '70.5%';
    const textLeft = selectedTemplate.dataset.textLeft || '50%';
    const fontSize = selectedTemplate.dataset.fontSize || '40px';
    const textColor = selectedTemplate.dataset.textColor || 'rgb(83, 194, 149)';
    
    eidImage.src = newImageSrc;
    
    // Update text overlay position and styling
    textOverlay.style.top = textTop;
    textOverlay.style.left = textLeft;
    textOverlay.style.fontSize = fontSize;
    textOverlay.style.color = textColor;
    
    // Update visual selection
    document.querySelectorAll('.template-option').forEach(option => {
      option.classList.remove('selected');
    });
    selectedTemplate.closest('.template-option').classList.add('selected');
  }
}

// Add event listeners to all template radio buttons
document.addEventListener('DOMContentLoaded', function() {
  const templateRadios = document.querySelectorAll('input[name="template"]');
  templateRadios.forEach(radio => {
    radio.addEventListener('change', handleTemplateChange);
  });
  
  // Initialize with first template if available
  if (templateRadios.length > 0) {
    templateRadios[0].checked = true;
    handleTemplateChange();
  }
});

function ensureImageLoaded(img, callback) {
  if (img.complete) {
    callback();
  } else {
    img.onload = callback;
  }
}

function downloadCanvas(canvas, filename, asPDF = false) {
  const imgData = canvas.toDataURL("image/png");
  if (asPDF) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const width = 210;
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 20, width, height);
    pdf.save(`${filename}.pdf`);
  } else {
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = imgData;
    link.click();
  }
}

function downloadImageOrPDF(asPDF = false) {
  const name = input.value.trim() || "employee-card";
  const currentImage = document.getElementById("eidImage");

  ensureImageLoaded(currentImage, () => {
    document.fonts.ready.then(() => {
      html2canvas(editor, {
        useCORS: true,
        backgroundColor: null,
        scale: 2 // Higher quality export
      }).then(canvas => {
        downloadCanvas(canvas, name, asPDF);
      });
    });
  });
}

function downloadPNG() {
  downloadImageOrPDF(false);
}

function downloadPDF() {
  downloadImageOrPDF(true);
}