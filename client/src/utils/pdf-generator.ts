import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Prescription, Patient } from "@shared/schema";

export interface PDFGeneratorOptions {
  prescription: Prescription;
  patient: Patient;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateString: string | Date): string => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateShort = (dateString: string | Date): string => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const calculateAge = (birthDate: string): number | null => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
};

const loadImageAsBase64 = (src: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 100;
      canvas.height = img.naturalHeight || 100;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve('');
    img.src = src;
  });
};

// ─── HTML Template ────────────────────────────────────────────────────────────

const buildPrescriptionHTML = (
  prescription: Prescription,
  patient: Patient,
  logoBase64: string,
): string => {
  const age = patient.birthDate ? calculateAge(patient.birthDate) : null;
  const sexLabel =
    patient.sex === 'F' ? 'Feminino' : patient.sex === 'M' ? 'Masculino' : patient.sex ?? '';

  const patientInfoItems: Array<{ label: string; value: string }> = [
    { label: 'Nome', value: patient.name },
    ...(patient.email ? [{ label: 'E-mail', value: patient.email }] : []),
    ...(age !== null ? [{ label: 'Idade', value: `${age} anos` }] : []),
    ...(patient.sex ? [{ label: 'Sexo', value: sexLabel }] : []),
    ...(patient.heightCm ? [{ label: 'Altura', value: `${patient.heightCm} cm` }] : []),
    ...(patient.weightKg ? [{ label: 'Peso', value: `${patient.weightKg} kg` }] : []),
  ];

  const publishedDate = prescription.publishedAt
    ? formatDate(prescription.publishedAt.toString())
    : prescription.startDate
    ? formatDate(prescription.startDate.toString())
    : formatDate(prescription.createdAt?.toString() ?? new Date().toString());

  const expiresDate = prescription.expiresAt
    ? formatDateShort(prescription.expiresAt.toString())
    : null;

  // Meal icon SVG (fork & knife)
  const mealIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`;

  const mealsHTML = prescription.meals
    .map(
      (meal, mealIndex) => `
    <div style="margin-bottom: 28px; break-inside: avoid; page-break-inside: avoid;">
      <!-- Meal Header -->
      <div style="
        display: flex;
        align-items: center;
        gap: 10px;
        background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%);
        padding: 12px 20px;
        border-radius: 10px 10px 0 0;
      ">
        <div style="
          width: 28px; height: 28px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #fff;
          flex-shrink: 0;
        ">${mealIndex + 1}</div>
        <span style="font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: 0.3px;">
          ${meal.name}
        </span>
      </div>

      <!-- Meal Items -->
      <div style="
        border: 1.5px solid #e9d5ff;
        border-top: none;
        border-radius: 0 0 10px 10px;
        overflow: hidden;
        background: #ffffff;
      ">
        ${meal.items
          .map(
            (item, itemIndex) => `
          <div style="
            padding: 11px 20px;
            background: ${itemIndex % 2 === 0 ? '#faf5ff' : '#ffffff'};
            border-bottom: 1px solid #f3e8ff;
          ">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
              <div style="flex: 1;">
                <span style="font-size: 14px; color: #1f2937; font-weight: 500; line-height: 1.4;">
                  ${item.description}
                </span>
                ${
                  item.substitutes && item.substitutes.length > 0
                    ? `
                  <div style="margin-top: 6px; padding: 6px 10px; background: #f5f3ff; border-radius: 6px; border-left: 3px solid #a78bfa;">
                    <div style="font-size: 11px; font-weight: 700; color: #7c3aed; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Substituições
                    </div>
                    ${item.substitutes
                      .map(
                        (sub) => `
                      <div style="font-size: 12px; color: #6b7280; line-height: 1.5;">
                        • ${sub}
                      </div>
                    `,
                      )
                      .join('')}
                  </div>
                `
                    : ''
                }
              </div>
              <div style="
                background: #7c3aed;
                color: #ffffff;
                font-size: 12px;
                font-weight: 700;
                padding: 4px 10px;
                border-radius: 20px;
                white-space: nowrap;
                flex-shrink: 0;
              ">${item.amount}</div>
            </div>
          </div>
        `,
          )
          .join('')}

        ${
          meal.notes
            ? `
          <div style="
            margin: 12px 16px 12px 16px;
            padding: 10px 14px;
            background: #fffbeb;
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
          ">
            <span style="font-size: 12px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">
              Observação
            </span>
            <p style="font-size: 13px; color: #78350f; margin: 4px 0 0 0; line-height: 1.5;">
              ${meal.notes}
            </p>
          </div>
        `
            : ''
        }
      </div>
    </div>
  `,
    )
    .join('');

  const generalNotesHTML = prescription.generalNotes
    ? `
    <div style="
      margin-top: 32px;
      padding: 20px 24px;
      background: linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%);
      border-radius: 12px;
      border: 1.5px solid #ddd6fe;
      break-inside: avoid;
      page-break-inside: avoid;
    ">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
        <div style="width: 4px; height: 20px; background: #7c3aed; border-radius: 2px;"></div>
        <span style="font-size: 15px; font-weight: 700; color: #5b21b6;">Observações Gerais</span>
      </div>
      <p style="font-size: 14px; color: #374151; margin: 0; line-height: 1.7;">
        ${prescription.generalNotes}
      </p>
    </div>
  `
    : '';

  return `
    <div style="
      background: #ffffff;
      color: #111827;
      font-family: 'Segoe UI', Arial, sans-serif;
      width: 794px;
      padding: 0;
      box-sizing: border-box;
    ">

      <!-- ═══ HEADER ═══ -->
      <div style="
        background: linear-gradient(135deg, #5b21b6 0%, #7c3aed 50%, #9333ea 100%);
        padding: 32px 48px 28px 48px;
        position: relative;
        overflow: hidden;
      ">
        <!-- Decorative circles -->
        <div style="
          position: absolute; top: -40px; right: -40px;
          width: 160px; height: 160px;
          background: rgba(255,255,255,0.06);
          border-radius: 50%;
        "></div>
        <div style="
          position: absolute; bottom: -60px; left: 60px;
          width: 200px; height: 200px;
          background: rgba(255,255,255,0.04);
          border-radius: 50%;
        "></div>

        <div style="display: flex; align-items: center; gap: 20px; position: relative; z-index: 1;">
          ${
            logoBase64
              ? `<img src="${logoBase64}" style="width: 64px; height: 64px; border-radius: 14px; background: white; padding: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);" alt="DiNutri">`
              : `<div style="width: 64px; height: 64px; border-radius: 14px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 28px;">🥗</div>`
          }
          <div>
            <div style="font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px;">
              DiNutri — Nutrição Inteligente
            </div>
            <div style="font-size: 26px; font-weight: 800; color: #ffffff; line-height: 1.1; letter-spacing: -0.5px;">
              Prescrição Nutricional
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div style="
          margin-top: 24px;
          height: 1px;
          background: rgba(255,255,255,0.2);
          position: relative; z-index: 1;
        "></div>

        <!-- Prescription title & date row -->
        <div style="
          margin-top: 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          position: relative; z-index: 1;
        ">
          <div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.65); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">
              Plano Alimentar
            </div>
            <div style="font-size: 20px; font-weight: 700; color: #ffffff;">
              ${prescription.title}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: rgba(255,255,255,0.65); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">
              Emitido em
            </div>
            <div style="font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9);">
              ${publishedDate}
            </div>
            ${
              expiresDate
                ? `
              <div style="font-size: 11px; color: rgba(255,255,255,0.65); text-transform: uppercase; letter-spacing: 1px; margin-top: 6px; margin-bottom: 2px;">
                Válido até
              </div>
              <div style="font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9);">
                ${expiresDate}
              </div>
            `
                : ''
            }
          </div>
        </div>
      </div>

      <!-- ═══ BODY ═══ -->
      <div style="padding: 32px 48px 40px 48px;">

        <!-- Patient Info Card -->
        <div style="
          margin-bottom: 32px;
          background: #faf5ff;
          border: 1.5px solid #e9d5ff;
          border-radius: 12px;
          overflow: hidden;
          break-inside: avoid;
          page-break-inside: avoid;
        ">
          <div style="
            padding: 12px 20px;
            background: linear-gradient(90deg, #7c3aed 0%, #9333ea 100%);
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span style="font-size: 13px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">
              Dados do Paciente
            </span>
          </div>
          <div style="padding: 16px 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              ${patientInfoItems
                .map(
                  (item) => `
                <div style="
                  background: #ffffff;
                  border: 1px solid #ede9fe;
                  border-radius: 8px;
                  padding: 10px 14px;
                ">
                  <div style="font-size: 10px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 3px;">
                    ${item.label}
                  </div>
                  <div style="font-size: 14px; color: #1f2937; font-weight: 500;">
                    ${item.value}
                  </div>
                </div>
              `,
                )
                .join('')}
            </div>
          </div>
        </div>

        <!-- Section Title: Refeições -->
        <div style="
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        ">
          <div style="width: 4px; height: 24px; background: linear-gradient(180deg, #7c3aed, #9333ea); border-radius: 2px;"></div>
          <span style="font-size: 18px; font-weight: 800; color: #1f2937; letter-spacing: -0.3px;">
            Plano de Refeições
          </span>
          <div style="flex: 1; height: 1px; background: linear-gradient(90deg, #e9d5ff, transparent);"></div>
          <span style="
            font-size: 12px;
            font-weight: 600;
            color: #7c3aed;
            background: #f5f3ff;
            border: 1px solid #ddd6fe;
            padding: 3px 10px;
            border-radius: 20px;
          ">${prescription.meals.length} refeição${prescription.meals.length !== 1 ? 'ões' : ''}</span>
        </div>

        <!-- Meals -->
        ${mealsHTML}

        <!-- General Notes -->
        ${generalNotesHTML}

        <!-- Footer -->
        <div style="
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1.5px solid #e9d5ff;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        ">
          <div>
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 2px;">
              Prescrição elaborada exclusivamente para
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #5b21b6;">
              ${patient.name}
            </div>
            <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">
              Em caso de dúvidas, entre em contato com a equipe DiNutri.
            </div>
          </div>
          <div style="text-align: right;">
            ${
              logoBase64
                ? `<img src="${logoBase64}" style="width: 36px; height: 36px; border-radius: 8px; opacity: 0.6;" alt="DiNutri">`
                : ''
            }
            <div style="font-size: 11px; color: #c4b5fd; margin-top: 4px; font-weight: 600;">
              DiNutri
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
};

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function generatePrescriptionPDF({
  prescription,
  patient,
  onSuccess,
  onError,
}: PDFGeneratorOptions): Promise<void> {
  try {
    // Load logo
    const logoBase64 = await loadImageAsBase64('/nova_logo_dinutri.png');

    // Build HTML
    const html = buildPrescriptionHTML(prescription, patient, logoBase64);

    // Mount off-screen container
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 794px;
      background: white;
      overflow: visible;
    `;
    container.innerHTML = html;
    document.body.appendChild(container);

    // Allow browser to render
    await new Promise((resolve) => setTimeout(resolve, 600));

    const contentHeight = container.scrollHeight;

    // Capture with html2canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794,
      height: contentHeight,
      windowWidth: 794,
      windowHeight: contentHeight,
      scrollX: 0,
      scrollY: 0,
    });

    document.body.removeChild(container);

    // Build PDF with A4 pages
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();   // 210 mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm

    const marginTop = 0;
    const marginBottom = 0;
    const usablePageHeight = pdfHeight - marginTop - marginBottom;

    const canvasWidth = canvas.width;   // 794 * 2 = 1588 px
    const canvasHeight = canvas.height;

    // px per mm on the canvas
    const pxPerMm = canvasWidth / pdfWidth;
    const pageHeightPx = usablePageHeight * pxPerMm;

    let offsetPx = 0;
    let pageNumber = 1;

    while (offsetPx < canvasHeight) {
      if (pageNumber > 1) pdf.addPage();

      const sliceHeightPx = Math.min(pageHeightPx, canvasHeight - offsetPx);
      const sliceHeightMm = sliceHeightPx / pxPerMm;

      // Slice canvas
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvasWidth;
      pageCanvas.height = sliceHeightPx;
      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, sliceHeightPx);
        ctx.drawImage(canvas, 0, offsetPx, canvasWidth, sliceHeightPx, 0, 0, canvasWidth, sliceHeightPx);
      }

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, marginTop, pdfWidth, sliceHeightMm);

      offsetPx += pageHeightPx;
      pageNumber++;
    }

    const fileName = `prescricao-${prescription.title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()}.pdf`;

    pdf.save(fileName);

    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (onError) onError(error as Error);
  }
}
