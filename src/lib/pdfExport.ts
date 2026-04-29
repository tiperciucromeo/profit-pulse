import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/** Limite canvas în Chrome: ~16384px/dimensiune; rămânem sub pentru siguranță. */
const MAX_CANVAS_DIMENSION = 8000;
/** Rezumatul paginii e mic — scală mai mare = text mai clar în PDF */
const TARGET_SCALE = 2.75;

function computeSafeScale(width: number, height: number): number {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const maxNeeded = Math.max(w, h) * TARGET_SCALE;
  if (maxNeeded <= MAX_CANVAS_DIMENSION) return TARGET_SCALE;
  return Math.max(0.35, MAX_CANVAS_DIMENSION / Math.max(w, h));
}

export async function exportPageToPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const w = element.scrollWidth;
  const h = element.scrollHeight;
  const scale = computeSafeScale(w, h);

  element.scrollIntoView({ block: "start", inline: "nearest" });
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: "#f8fafc",
    width: w,
    height: h,
    windowWidth: w,
    windowHeight: h,
    onclone: (_doc, cloned) => {
      const el = cloned as HTMLElement;
      el.style.boxShadow = "none";
      el.style.borderRadius = "0";
    },
  });

  if (!canvas.width || !canvas.height) {
    throw new Error("Captura este goală (0×0). Reîncarcă pagina și încearcă din nou.");
  }

  // JPEG = fișier mai mic, mai puține erori la addImage pentru pagini foarte lungi
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;
  const contentHeight = pageHeight - 2 * margin;

  // Lățime completă pe A4 (maxim lizibil); înălțime proporțională
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height / canvas.width) * imgWidth;

  if (imgHeight <= contentHeight + 0.01) {
    pdf.addImage(imgData, "JPEG", margin, margin, imgWidth, imgHeight);
  } else {
    const pages = Math.ceil(imgHeight / contentHeight);
    for (let i = 0; i < pages; i++) {
      if (i > 0) pdf.addPage();
      const yPos = margin - i * contentHeight;
      pdf.addImage(imgData, "JPEG", margin, yPos, imgWidth, imgHeight);
    }
  }

  pdf.save(filename);
}
