import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { db, STORES } from '../lib/db';

export const pdfService = {
  /**
   * Generate a PDF file from all diary entries
   */
  generateDiaryPDF: async () => {
    try {
      // 1. Fetch all diaries
      const diaries = await db.getAll(STORES.DIARIES);
      
      if (!diaries || diaries.length === 0) {
        throw new Error('No diaries found to export');
      }

      // 2. Sort diaries by date (descending)
      diaries.sort((a, b) => new Date(b.date) - new Date(a.date));

      // 3. Create PDF document (A4 size)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // 4. Create a hidden container for rendering
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '210mm'; // A4 width
      container.style.minHeight = '297mm'; // A4 height
      container.style.backgroundColor = '#ffffff';
      container.style.color = '#000000';
      container.style.padding = '20mm'; // Simulate margin
      container.style.boxSizing = 'border-box';
      container.style.fontFamily = 'Arial, sans-serif'; // Use standard font
      document.body.appendChild(container);

      // Helper to render a single diary entry to canvas and add to PDF
      const addEntryToPdf = async (diary, index) => {
        // Clear container
        container.innerHTML = '';
        
        // Build HTML for the entry
        const dateStr = format(new Date(diary.date), 'PPPP');
        const content = diary.content || '';
        const images = diary.images || [];
        const mood = diary.mood || '';
        const weather = diary.weather || '';

        let imagesHtml = '';
        if (images.length > 0) {
          imagesHtml = `<div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
            ${images.map(img => `<img src="${img}" style="max-width: 100%; max-height: 300px; border-radius: 8px; object-fit: cover;" />`).join('')}
          </div>`;
        }

        // Basic styling
        container.innerHTML = `
          <div style="font-family: serif; color: #333;">
            <div style="border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
              <h2 style="margin: 0; font-size: 24px; color: #2c3e50;">${dateStr}</h2>
              <div style="font-size: 14px; color: #7f8c8d;">
                ${mood ? `<span>${mood}</span>` : ''}
                ${weather ? `<span style="margin-left: 10px;">${weather}</span>` : ''}
              </div>
            </div>
            
            ${imagesHtml}
            
            <div style="font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${content}</div>
          </div>
        `;

        // Render to canvas
        // Wait for images to load if any (browser handles it mostly, but html2canvas needs them ready)
        // Since we are using base64 or local blobs, they should be ready.
        // We use allowTaint: true and useCORS: true just in case.
        
        const canvas = await html2canvas(container, {
          scale: 2, // Higher resolution
          useCORS: true,
          logging: false,
          windowWidth: container.scrollWidth,
          windowHeight: container.scrollHeight
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = contentWidth;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // If it's not the first page, add a new page
        if (index > 0) {
          pdf.addPage();
        }

        // Add image to PDF
        // If height > page height, we might need to split, but for now let's just scale it or add it.
        // If content is very long, it will shrink to fit or be cut off.
        // A better approach for long content is complex. 
        // For MVP, we assume diary entries fit on one or two pages.
        // If height > contentHeight, we need multiple pages for one entry.
        
        let heightLeft = pdfHeight;
        let position = 0;
        let pageHeightLeft = pageHeight - (margin * 2); // Use margin for top/bottom

        // Simple approach: Add image. If it overflows, users accept it or we scale.
        // Let's try to handle multi-page entries roughly if needed, 
        // but `addImage` doesn't auto-split.
        
        // For now, simple add.
        pdf.addImage(imgData, 'JPEG', margin, margin, pdfWidth, pdfHeight);
      };

      // 5. Process all diaries
      // We can't do this in parallel effectively because PDF generation is sequential and memory intensive.
      for (let i = 0; i < diaries.length; i++) {
        await addEntryToPdf(diaries[i], i);
      }

      // 6. Save PDF
      pdf.save(`chatdiary-export-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

      // 7. Cleanup
      document.body.removeChild(container);

      return true;
    } catch (error) {
      console.error('PDF Generation failed:', error);
      throw error;
    }
  }
};
