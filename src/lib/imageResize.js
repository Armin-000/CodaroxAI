export function prepareImageReference(dataUrl, maxDimension = 510) {
  const source = String(dataUrl || "");

  if (!source.startsWith("data:image/")) {
    return Promise.reject(new Error("Invalid reference image."));
  }

  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const width = Number(image.naturalWidth || image.width || 0);
      const height = Number(image.naturalHeight || image.height || 0);

      if (!width || !height) {
        reject(new Error("Unable to read reference image dimensions."));
        return;
      }

      const scale = Math.min(1, maxDimension / Math.max(width, height));
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext("2d", { alpha: false });

      if (!context) {
        reject(new Error("Image resizing is unavailable in this browser."));
        return;
      }

      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };

    image.onerror = () => reject(new Error("Unable to load the reference image."));
    image.src = source;
  });
}
