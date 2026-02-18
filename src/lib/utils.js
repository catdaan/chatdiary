import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
          } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
          }
        }

        // Additional Safety: Limit canvas dimension to avoid iOS canvas memory limit
        // 4MP is plenty for chat images (approx 2000x2000)
        const MAX_CANVAS_PIXELS = 2048 * 2048; // 4MP
        if (width * height > MAX_CANVAS_PIXELS) {
             // Force scale down if still too big
             const ratio = Math.sqrt(MAX_CANVAS_PIXELS / (width * height));
             width = Math.floor(width * ratio);
             height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress with slightly lower quality to ensure small size
        let qualityToUse = quality;
        let dataUrl = canvas.toDataURL('image/jpeg', qualityToUse);
        
        // Aggressive compression if still too large (> 500KB)
        // Base64 500KB ~= 375KB binary
        while (dataUrl.length > 700000 && qualityToUse > 0.1) {
            qualityToUse -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', qualityToUse);
        }
        
        resolve(dataUrl);
      };
      img.onerror = (error) => {
        // Fallback: If image loading fails (e.g. HEIC in some browsers), 
        // return the original data URL if possible, or reject.
        // We warn the user but try to proceed.
        console.warn("Image compression failed (format might not be supported by browser Canvas), checking file size...", error);
        
        // Safety check: Prevent memory crash with huge files
        // 2MB limit for uncompressed fallback (Base64 string length ~ 1.33 * file size)
        // 2MB file ~= 2.7MB string.
        const MAX_FALLBACK_SIZE = 3 * 1024 * 1024; 
        
        if (event.target.result.length > MAX_FALLBACK_SIZE) {
            reject(new Error("Image is too large and cannot be compressed. Please upload a smaller image (under 2MB)."));
        } else {
            resolve(event.target.result); 
        }
      };
    };
    reader.onerror = (error) => reject(error);
  });
}
