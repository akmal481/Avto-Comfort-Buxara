import { QRCodeSVG } from "qrcode.react";
import { Download, Printer } from "lucide-react";
import { useRef } from "react";

interface QRCodeDisplayProps {
  value: string;
  productName?: string;
  size?: number;
}

const QRCodeDisplay = ({ value, productName, size = 200 }: QRCodeDisplayProps) => {
  const qrRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !qrRef.current) return;

    const svgElement = qrRef.current.querySelector("svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);

    printWindow.document.write(`
      <html>
        <head><title>QR Code - ${productName || value}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;">
          <div style="text-align:center;">
            ${svgData}
            ${productName ? `<p style="margin-top:12px;font-size:14px;font-weight:600;">${productName}</p>` : ""}
            <p style="font-size:11px;color:#666;margin-top:4px;">${value}</p>
          </div>
          <script>window.print();window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    const svgElement = qrRef.current?.querySelector("svg");
    if (!svgElement) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = size * 2;
    canvas.height = size * 2;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${productName || value}.png`;
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={qrRef} className="bg-card p-4 rounded-xl border border-border">
        <QRCodeSVG value={value} size={size} level="M" />
      </div>
      {productName && (
        <p className="text-xs text-muted-foreground text-center font-medium">{productName}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Download size={14} /> Yuklab olish
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <Printer size={14} /> Chop etish
        </button>
      </div>
    </div>
  );
};

export default QRCodeDisplay;
