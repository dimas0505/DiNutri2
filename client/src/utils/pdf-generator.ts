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
    printContainer.style.width = '800px'; // Slightly wider for better layout
    printContainer.style.background = '#fcfcfc';
    printContainer.style.fontFamily = "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    printContainer.style.color = '#1f2937';
    
    // Branding and Colors
    const colors = {
      primary: '#10b981', // Emerald 500
      primaryDark: '#059669', // Emerald 600
      secondary: '#6366f1', // Indigo 500
      accent: '#f59e0b', // Amber 500
      bgLight: '#f9fafb',
      border: '#e5e7eb',
      textMain: '#111827',
      textMuted: '#6b7280'
    };

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

    // Convert logo to base64
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    
    const logoBase64 = await new Promise<string>((resolve) => {
      logoImg.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 120;
        canvas.height = 120;
        ctx?.drawImage(logoImg, 0, 0, 120, 120);
        resolve(canvas.toDataURL('image/png'));
      };
      logoImg.onerror = () => resolve('');
      logoImg.src = teamInfo.logoPath;
    });

    // Generate HTML content
    printContainer.innerHTML = `
      <div style="padding: 0; margin: 0; background: white;">
        <!-- Header with Gradient Accent -->
        <div style="height: 8px; background: linear-gradient(to right, ${colors.primary}, ${colors.secondary});"></div>
        
        <div style="padding: 40px 50px;">
          <!-- Branding Section -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
            <div>
              ${logoBase64 ? `<img src="${logoBase64}" style="width: 70px; height: 70px; margin-bottom: 12px;" alt="Logo">` : ''}
              <h1 style="font-size: 28px; font-weight: 800; color: ${colors.textMain}; margin: 0; letter-spacing: -0.025em;">PLANO ALIMENTAR</h1>
              <p style="font-size: 14px; color: ${colors.primaryDark}; font-weight: 600; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em;">Prescrição Nutricional Personalizada</p>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 700; font-size: 16px; color: ${colors.textMain};">${teamInfo.name}</div>
              <div style="font-size: 13px; color: ${colors.textMuted}; margin-top: 2px;">Nutrição Inteligente & Saúde</div>
              <div style="font-size: 12px; color: ${colors.textMuted}; margin-top: 8px;">Emitido em: ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>

          <!-- Patient Summary Card -->
          <div style="background: ${colors.bgLight}; border: 1px solid ${colors.border}; border-radius: 16px; padding: 24px; margin-bottom: 40px; display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px;">
            <div>
              <h2 style="font-size: 12px; font-weight: 700; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; margin-top: 0;">Dados do Paciente</h2>
              <div style="font-size: 20px; font-weight: 700; color: ${colors.textMain}; margin-bottom: 4px;">${patient.name}</div>
              <div style="font-size: 14px; color: ${colors.textMuted};">${patient.email}</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-content: center;">
              ${patient.birthDate ? `<div><span style="font-size: 11px; color: ${colors.textMuted}; display: block;">Idade</span><span style="font-weight: 600; font-size: 14px;">${calculateAge(patient.birthDate)} anos</span></div>` : ''}
              ${patient.heightCm ? `<div><span style="font-size: 11px; color: ${colors.textMuted}; display: block;">Altura</span><span style="font-weight: 600; font-size: 14px;">${patient.heightCm} cm</span></div>` : ''}
              ${patient.weightKg ? `<div><span style="font-size: 11px; color: ${colors.textMuted}; display: block;">Peso</span><span style="font-weight: 600; font-size: 14px;">${patient.weightKg} kg</span></div>` : ''}
              ${patient.sex ? `<div><span style="font-size: 11px; color: ${colors.textMuted}; display: block;">Sexo</span><span style="font-weight: 600; font-size: 14px;">${patient.sex === 'F' ? 'Feminino' : 'Masculino'}</span></div>` : ''}
            </div>
          </div>

          <!-- Prescription Title -->
          <div style="margin-bottom: 32px; border-left: 4px solid ${colors.primary}; padding-left: 16px;">
            <h2 style="font-size: 22px; font-weight: 800; color: ${colors.textMain}; margin: 0;">${prescription.title}</h2>
            <p style="font-size: 14px; color: ${colors.textMuted}; margin-top: 4px;">Início do acompanhamento: ${prescription.publishedAt ? formatDate(prescription.publishedAt.toString()) : 'Data não informada'}</p>
          </div>

          <!-- Meals Section -->
          <div style="display: flex; flex-direction: column; gap: 28px;">
            ${prescription.meals.map((meal, index) => `
              <div style="page-break-inside: avoid; border: 1px solid ${colors.border}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="background: ${index % 2 === 0 ? colors.primary : colors.secondary}; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;">
                  <h3 style="font-size: 18px; font-weight: 700; color: white; margin: 0;">${meal.name}</h3>
                  <div style="background: rgba(255,255,255,0.2); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Refeição ${index + 1}</div>
                </div>
                <div style="padding: 20px 24px; background: white;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="border-bottom: 2px solid ${colors.bgLight};">
                        <th style="text-align: left; padding: 12px 0; font-size: 12px; color: ${colors.textMuted}; text-transform: uppercase; font-weight: 700;">Descrição do Alimento</th>
                        <th style="text-align: right; padding: 12px 0; font-size: 12px; color: ${colors.textMuted}; text-transform: uppercase; font-weight: 700;">Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${meal.items.map(item => `
                        <tr style="border-bottom: 1px solid ${colors.bgLight};">
                          <td style="padding: 14px 0;">
                            <div style="font-weight: 600; color: ${colors.textMain}; font-size: 15px;">${item.description}</div>
                            ${item.substitutes && item.substitutes.length > 0 ? `
                              <div style="margin-top: 6px; font-size: 12px; color: ${colors.textMuted};">
                                <span style="color: ${colors.secondary}; font-weight: 700;">Substitutos:</span> ${item.substitutes.join(', ')}
                              </div>
                            ` : ''}
                          </td>
                          <td style="padding: 14px 0; text-align: right; font-weight: 700; color: ${colors.primaryDark}; font-size: 14px;">
                            ${item.amount}
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  ${meal.notes ? `
                    <div style="margin-top: 20px; padding: 16px; background: #fffbeb; border-radius: 12px; border: 1px solid #fef3c7; display: flex; gap: 12px;">
                      <div style="color: ${colors.accent}; font-weight: 800; font-size: 18px;">!</div>
                      <div style="font-size: 13px; color: #92400e; line-height: 1.5;">
                        <strong style="display: block; margin-bottom: 2px; text-transform: uppercase; font-size: 11px;">Observação da Refeição:</strong>
                        ${meal.notes}
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>

          ${prescription.generalNotes ? `
            <!-- General Notes Section -->
            <div style="margin-top: 40px; page-break-inside: avoid;">
              <h3 style="font-size: 16px; font-weight: 800; color: ${colors.textMain}; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                <span style="width: 24px; height: 24px; background: ${colors.primary}; color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px;">i</span>
                Recomendações Gerais
              </h3>
              <div style="background: ${colors.bgLight}; border: 1px dashed ${colors.border}; border-radius: 16px; padding: 24px; color: ${colors.textMain}; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${prescription.generalNotes}</div>
            </div>
          ` : ''}

          <!-- Footer Section -->
          <div style="margin-top: 60px; padding-top: 30px; border-top: 1px solid ${colors.border}; text-align: center; page-break-inside: avoid;">
            <p style="font-size: 14px; color: ${colors.textMuted}; margin-bottom: 8px;">Este plano foi desenvolvido exclusivamente para <strong>${patient.name}</strong>.</p>
            <p style="font-size: 13px; color: ${colors.textMuted}; line-height: 1.5;">O sucesso do tratamento depende da sua dedicação. Em caso de dúvidas, utilize o chat do aplicativo para falar com seu nutricionista.</p>
            <div style="margin-top: 24px; display: flex; justify-content: center; gap: 40px;">
              <div style="text-align: center;">
                <div style="font-weight: 800; color: ${colors.primaryDark}; font-size: 16px;">DiNutri</div>
                <div style="font-size: 11px; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 0.05em;">Sua saúde em primeiro lugar</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Append to body temporarily
    document.body.appendChild(printContainer);

    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 800));

    const contentHeight = printContainer.scrollHeight;
    
    // Capture with html2canvas
    const canvas = await html2canvas(printContainer, {
      scale: 2, // High resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      height: contentHeight,
      windowWidth: 800,
      windowHeight: contentHeight
    });

    // Remove the temporary container
    document.body.removeChild(printContainer);

    // Generate PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;
    const imgData = canvas.toDataURL('image/png', 1.0);

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Add subsequent pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    const fileName = `plano-alimentar-${patient.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

    if (onSuccess) onSuccess();

  } catch (error) {
    console.error('Error generating PDF:', error);
    if (onError) onError(error as Error);
  }
}
