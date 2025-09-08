import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Prescription, Patient } from "@shared/schema";

export interface PDFGeneratorOptions {
  prescription: Prescription;
  patient: Patient;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export async function generatePrescriptionPDF({ 
  prescription, 
  patient, 
  onSuccess, 
  onError 
}: PDFGeneratorOptions): Promise<void> {
  try {
    // Create a temporary container for the print content
    const printContainer = document.createElement('div');
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '0';
    printContainer.style.width = '794px'; // A4 width in pixels at 96 DPI
    printContainer.style.minHeight = 'auto';
    printContainer.style.height = 'auto';
    printContainer.style.background = 'white';
    printContainer.style.padding = '40px';
    printContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    printContainer.style.overflow = 'visible';
    
    // DiNutri team branding
    const teamInfo = {
      name: "Equipe DiNutri",
      logoPath: "/logo_dinutri.png"
    };

    // Helper functions
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
      });
    };

    const calculateAge = (birthDate: string) => {
      if (!birthDate) return null;
      const birth = new Date(birthDate);
      const today = new Date();
      const age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        return age - 1;
      }
      return age;
    };

    // Convert logo to base64 for inline embedding
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    
    const logoBase64 = await new Promise<string>((resolve) => {
      logoImg.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 80; // Resize to appropriate size
        canvas.height = 80;
        ctx?.drawImage(logoImg, 0, 0, 80, 80);
        resolve(canvas.toDataURL('image/png'));
      };
      logoImg.onerror = () => resolve(''); // Fallback to no logo
      logoImg.src = teamInfo.logoPath;
    });

    // Generate the print content HTML
    printContainer.innerHTML = `
      <div style="background: white; color: #111827; min-height: auto; height: auto; page-break-inside: avoid;">
        <!-- Document Header -->
        <div style="text-align: center; margin-bottom: 32px; border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; page-break-after: avoid;">
          ${logoBase64 ? `<img src="${logoBase64}" style="width: 80px; height: 80px; margin-bottom: 16px;" alt="DiNutri Logo">` : ''}
          <h1 style="font-size: 28px; font-weight: bold; color: #374151; margin-bottom: 8px; margin-top: 0;">PRESCRIÇÃO NUTRICIONAL</h1>
          <div style="font-size: 18px; color: #6b7280;">
            <div style="font-weight: 600;">${teamInfo.name}</div>
          </div>
        </div>

        <!-- Patient Info -->
        <div style="margin-bottom: 32px; background: #f9fafb; padding: 24px; border-radius: 8px; page-break-inside: avoid;">
          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; margin-top: 0;">Dados do Paciente</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px;">
            <div><strong>Nome:</strong> ${patient.name}</div>
            <div><strong>Email:</strong> ${patient.email}</div>
            ${patient.birthDate ? `<div><strong>Idade:</strong> ${calculateAge(patient.birthDate)} anos</div>` : ''}
            ${patient.sex ? `<div><strong>Sexo:</strong> ${patient.sex === 'F' ? 'Feminino' : patient.sex === 'M' ? 'Masculino' : 'Outro'}</div>` : ''}
            ${patient.heightCm ? `<div><strong>Altura:</strong> ${patient.heightCm} cm</div>` : ''}
            ${patient.weightKg ? `<div><strong>Peso:</strong> ${patient.weightKg} kg</div>` : ''}
          </div>
        </div>

        <!-- Prescription Title -->
        <div style="margin-bottom: 32px; text-align: center; page-break-inside: avoid;">
          <h2 style="font-size: 24px; font-weight: bold; color: #374151; margin-top: 0; margin-bottom: 8px;">
            ${prescription.title}
          </h2>
          <p style="color: #6b7280; margin-top: 8px; margin-bottom: 0;">
            Publicado em ${prescription.publishedAt ? formatDate(prescription.publishedAt.toString()) : ''}
          </p>
        </div>

        <!-- Meals -->
        <div style="margin-bottom: 32px;">
          ${prescription.meals.map(meal => `
            <div style="margin-bottom: 32px; page-break-inside: avoid;">
              <div style="background: #dbeafe; padding: 16px; border-radius: 8px 8px 0 0; border-left: 4px solid #3b82f6;">
                <h3 style="font-size: 20px; font-weight: 600; color: #374151; margin: 0;">
                  ${meal.name}
                </h3>
              </div>
              <div style="border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px; padding: 16px;">
                <div style="margin: 0; padding: 0;">
                  ${meal.items.map(item => `
                    <div style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; page-break-inside: avoid;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: 500; color: #374151;">${item.description}</span>
                        <span style="color: #6b7280; font-weight: 500;">${item.amount}</span>
                      </div>
                      ${item.substitutes && item.substitutes.length > 0 ? `
                        <div style="margin-left: 16px; margin-top: 8px;">
                          <div style="font-size: 12px; color: #3b82f6; font-weight: 600; margin-bottom: 4px;">
                            ↪ Opções de substituição:
                          </div>
                          <div style="margin-left: 12px;">
                            ${item.substitutes.map(substitute => `
                              <div style="font-size: 13px; color: #6b7280; margin-bottom: 2px;">
                                • ${substitute}
                              </div>
                            `).join('')}
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
                ${meal.notes ? `
                  <div style="margin-top: 16px; padding: 12px; background: #fefce8; border-radius: 6px; border-left: 4px solid #facc15; page-break-inside: avoid;">
                    <p style="font-size: 14px; color: #374151; margin: 0;">
                      <strong>Observação:</strong> ${meal.notes}
                    </p>
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        ${prescription.generalNotes ? `
          <!-- General Notes -->
          <div style="margin-top: 32px; padding: 24px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; page-break-inside: avoid;">
            <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 12px; margin-top: 0;">Observações Gerais</h3>
            <p style="color: #374151; margin: 0;">
              ${prescription.generalNotes}
            </p>
          </div>
        ` : ''}

        <!-- Footer -->
        <div style="margin-top: 48px; padding-top: 24px; border-top: 2px solid #e5e7eb; text-align: center; font-size: 14px; color: #6b7280; page-break-inside: avoid;">
          <p style="margin: 0 0 8px 0;">Esta prescrição foi elaborada especificamente para ${patient.name}.</p>
          <p style="margin: 0 0 16px 0;">Em caso de dúvidas, entre em contato com a equipe DiNutri.</p>
          <p style="margin: 0; font-weight: 600;">${teamInfo.name}</p>
        </div>
      </div>
    `;

    // Append to body temporarily
    document.body.appendChild(printContainer);

    // Wait for rendering and ensure all content is loaded
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get the actual content height
    const contentHeight = printContainer.scrollHeight;
    
    // Capture with html2canvas with better options for full content
    const canvas = await html2canvas(printContainer, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      height: contentHeight,
      windowWidth: 794,
      windowHeight: contentHeight,
      scrollX: 0,
      scrollY: 0
    });

    // Remove the temporary container
    document.body.removeChild(printContainer);

    // Generate PDF with proper A4 pagination
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate scaling and page dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const scale = pdfWidth / (canvasWidth / 1.5); // Account for canvas scale
    const scaledCanvasHeight = canvasHeight * scale / 1.5;
    
    // Define proper margins for A4 (leaving space for page headers/footers)
    const marginTop = 10;
    const marginBottom = 15;
    const usablePageHeight = pdfHeight - marginTop - marginBottom;
    
    let yPosition = 0;
    let pageNumber = 1;
    
    while (yPosition < scaledCanvasHeight) {
      if (pageNumber > 1) {
        pdf.addPage();
      }
      
      // Calculate the slice of canvas for this page
      const sourceY = (yPosition / scale) * 1.5;
      const remainingHeight = scaledCanvasHeight - yPosition;
      const pageContentHeight = Math.min(usablePageHeight, remainingHeight);
      const sourceHeight = (pageContentHeight / scale) * 1.5;
      
      // Create a temporary canvas for this page slice
      const pageCanvas = document.createElement('canvas');
      const pageCtx = pageCanvas.getContext('2d');
      pageCanvas.width = canvasWidth;
      pageCanvas.height = sourceHeight;
      
      if (pageCtx) {
        // Draw the slice from the main canvas
        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, canvasWidth, sourceHeight);
        pageCtx.drawImage(
          canvas,
          0, sourceY, canvasWidth, sourceHeight,
          0, 0, canvasWidth, sourceHeight
        );
        
        const pageImgData = pageCanvas.toDataURL('image/png', 0.95);
        pdf.addImage(pageImgData, 'PNG', 0, marginTop, pdfWidth, pageContentHeight);
      }
      
      yPosition += usablePageHeight;
      pageNumber++;
    }

    pdf.save(`prescricao-${prescription.title.replace(/\s+/g, '-').toLowerCase()}.pdf`);

    if (onSuccess) {
      onSuccess();
    }

  } catch (error) {
    console.error('Error generating PDF:', error);
    if (onError) {
      onError(error as Error);
    }
  }
}