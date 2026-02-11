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

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (error) => {
        // Fallback: If image loading fails (e.g. HEIC in some browsers), 
        // return the original data URL if possible, or reject.
        // We warn the user but try to proceed.
        console.warn("Image compression failed (format might not be supported by browser Canvas), checking file size...", error);
        
        // Safety check: Prevent memory crash with huge files
        // 5MB limit for uncompressed fallback (Base64 string length ~ 1.33 * file size)
        // 5MB file ~= 6.7MB string. Let's set limit to ~7MB string length.
        const MAX_FALLBACK_SIZE = 7 * 1024 * 1024; 
        
        if (event.target.result.length > MAX_FALLBACK_SIZE) {
            reject(new Error("Image is too large and cannot be compressed. Please upload a smaller image (under 5MB)."));
        } else {
            resolve(event.target.result); 
        }
      };
    };
    reader.onerror = (error) => reject(error);
  });
}
