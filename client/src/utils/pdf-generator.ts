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
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const safeText = (value?: string | null) => {
      if (!value || !value.trim()) return 'Não informado';
      return escapeHtml(value);
    };

    const formatMultilineText = (value?: string | null) =>
      safeText(value).replace(/\n/g, '<br/>');

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

    const title = safeText(prescription.title);
    const publishedAtLabel = prescription.publishedAt
      ? formatDate(prescription.publishedAt.toString())
      : formatDate(new Date().toISOString());

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
      <div style="background: white; color: #0f172a; min-height: auto; height: auto; page-break-inside: avoid;">
        <div style="margin-bottom: 28px; border-radius: 20px; background: linear-gradient(135deg, #0f766e, #0284c7); color: #ffffff; padding: 28px 30px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
            <div>
              <p style="margin: 0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.9;">Plano alimentar personalizado</p>
              <h1 style="font-size: 30px; line-height: 1.2; font-weight: 700; margin: 8px 0 6px 0;">Prescrição Nutricional</h1>
              <p style="font-size: 15px; margin: 0; opacity: 0.95;">${safeText(teamInfo.name)} • Emitido em ${publishedAtLabel}</p>
            </div>
            ${logoBase64 ? `<img src="${logoBase64}" style="width: 72px; height: 72px; border-radius: 16px; background: rgba(255,255,255,0.2); padding: 10px;" alt="DiNutri Logo">` : ''}
          </div>
        </div>

        <div style="margin-bottom: 26px; border: 1px solid #dbeafe; border-radius: 16px; background: #f8fafc; padding: 22px 24px; page-break-inside: avoid;">
          <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 14px 0;">Dados do paciente</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px 18px; font-size: 14px; color: #334155;">
            <div><strong>Nome:</strong> ${safeText(patient.name)}</div>
            <div><strong>E-mail:</strong> ${safeText(patient.email)}</div>
            ${patient.birthDate ? `<div><strong>Idade:</strong> ${calculateAge(patient.birthDate)} anos</div>` : ''}
            ${patient.sex ? `<div><strong>Sexo:</strong> ${patient.sex === 'F' ? 'Feminino' : patient.sex === 'M' ? 'Masculino' : 'Outro'}</div>` : ''}
            ${patient.heightCm ? `<div><strong>Altura:</strong> ${patient.heightCm} cm</div>` : ''}
            ${patient.weightKg ? `<div><strong>Peso:</strong> ${patient.weightKg} kg</div>` : ''}
          </div>
        </div>

        <div style="margin-bottom: 30px; text-align: center; page-break-inside: avoid;">
          <h2 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0;">
            ${title}
          </h2>
          <p style="color: #475569; margin: 0; font-size: 14px;">
            Documento elaborado para acompanhamento nutricional contínuo
          </p>
        </div>

        <div style="margin-bottom: 32px;">
          ${prescription.meals.map((meal, mealIndex) => `
            <div style="margin-bottom: 26px; page-break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);">
              <div style="background: linear-gradient(90deg, #ecfeff, #f0f9ff); padding: 14px 18px; border-left: 5px solid #0ea5e9; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <h3 style="font-size: 19px; font-weight: 700; color: #0f172a; margin: 0;">
                  ${mealIndex + 1}. ${safeText(meal.name)}
                </h3>
                <span style="font-size: 12px; font-weight: 600; color: #0369a1; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 999px; padding: 4px 10px;">Refeição</span>
              </div>
              <div style="padding: 16px 18px; background: #ffffff;">
                <div style="margin: 0; padding: 0;">
                  ${meal.items.map(item => `
                    <div style="padding: 11px 0; border-bottom: 1px solid #f1f5f9; page-break-inside: avoid;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: 600; color: #1e293b;">${safeText(item.description)}</span>
                        <span style="color: #0f766e; font-weight: 700;">${safeText(item.amount)}</span>
                      </div>
                      ${item.substitutes && item.substitutes.length > 0 ? `
                        <div style="margin-left: 14px; margin-top: 8px;">
                          <div style="font-size: 12px; color: #0369a1; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px;">
                            Opções de substituição
                          </div>
                          <div style="margin-left: 12px;">
                            ${item.substitutes.map(substitute => `
                              <div style="font-size: 13px; color: #475569; margin-bottom: 2px;">
                                • ${safeText(substitute)}
                              </div>
                            `).join('')}
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
                ${meal.notes ? `
                  <div style="margin-top: 16px; padding: 12px; background: #fffbeb; border-radius: 10px; border-left: 4px solid #f59e0b; page-break-inside: avoid;">
                    <p style="font-size: 14px; color: #374151; margin: 0; line-height: 1.5;">
                      <strong>Observação:</strong> ${formatMultilineText(meal.notes)}
                    </p>
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        ${prescription.generalNotes ? `
          <!-- General Notes -->
          <div style="margin-top: 24px; padding: 20px 22px; background: #f8fafc; border-radius: 14px; border: 1px solid #cbd5e1; page-break-inside: avoid;">
            <h3 style="font-size: 17px; font-weight: 700; margin: 0 0 10px 0; color: #0f172a;">Observações gerais</h3>
            <p style="color: #334155; margin: 0; line-height: 1.6;">
              ${formatMultilineText(prescription.generalNotes)}
            </p>
          </div>
        ` : ''}

        <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #dbeafe; text-align: center; font-size: 13px; color: #64748b; page-break-inside: avoid;">
          <p style="margin: 0 0 8px 0;">Esta prescrição foi elaborada especificamente para ${safeText(patient.name)}.</p>
          <p style="margin: 0 0 12px 0;">Em caso de dúvidas, entre em contato com sua equipe de acompanhamento.</p>
          <p style="margin: 0; font-weight: 700; color: #0f172a;">${safeText(teamInfo.name)}</p>
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
