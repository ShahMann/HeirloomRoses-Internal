const input = document.getElementById("nameInput");
const textOverlay = document.getElementById("textOverlay");
const editor = document.getElementById("editor");

function isArabic(text) {
  const arabicRange = /[\u0600-\u06FF]/;
  return arabicRange.test(text);
}

function applyFont(name) {
  const isAr = isArabic(name);
  const fontFamily = isAr ? "'Cairo', sans-serif" : "'Roboto', sans-serif";
  textOverlay.style.fontFamily = fontFamily;
}

input.addEventListener("input", function () {
  const name = this.value.trim();
  textOverlay.textContent = name;
  applyFont(name);
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
  const name = input.value.trim() || "eid-card";
  const eidImage = document.getElementById("eidImage");

  ensureImageLoaded(eidImage, () => {
    document.fonts.ready.then(() => {
      html2canvas(editor, {
        useCORS: true,
        backgroundColor: null
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
