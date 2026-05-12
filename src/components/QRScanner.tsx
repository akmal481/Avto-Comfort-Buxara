import { useState, useEffect, useRef, useCallback } from "react";
import { X, Camera, AlertCircle, Keyboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
}

const QRScanner = ({ isOpen, onClose, onScan }: QRScannerProps) => {
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const animFrameRef = useRef<number>(0);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    setError(null);
    setManualMode(false);
    setManualCode("");
    onClose();
  }, [stopCamera, onClose]);

  const handleManualSubmit = useCallback(() => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      handleClose();
    }
  }, [manualCode, onScan, handleClose]);

  useEffect(() => {
    if (!isOpen || manualMode) return;

    let mounted = true;
    setError(null);

    const startCamera = async () => {
      try {
        // Check for secure context
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("HTTPS kerak yoki brauzer qo'llab-quvvatlamaydi");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
        });

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          scanningRef.current = true;
          scanFrame();
        }
      } catch (err: any) {
        if (!mounted) return;
        if (err?.name === "NotAllowedError") {
          setError("Kameraga ruxsat bering. Brauzer sozlamalaridan kamerani yoqing.");
        } else if (err?.name === "NotFoundError") {
          setError("Kamera topilmadi. Qurilmangizda kamera borligini tekshiring.");
        } else {
          setError(err?.message || "Kamerani ochib bo'lmadi. Qo'lda kiritishni ishlating.");
        }
      }
    };

    // Use BarcodeDetector API if available, otherwise fallback to manual
    const scanFrame = async () => {
      if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      try {
        if ("BarcodeDetector" in window) {
          // @ts-ignore
          const detector = new BarcodeDetector({ formats: ["qr_code"] });
          const barcodes = await detector.detect(canvas);
          if (barcodes.length > 0 && mounted) {
            onScan(barcodes[0].rawValue);
            stopCamera();
            onClose();
            return;
          }
        }
      } catch {
        // BarcodeDetector not supported, continue showing camera
      }

      if (scanningRef.current) {
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };

    const timeout = setTimeout(startCamera, 200);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      stopCamera();
    };
  }, [isOpen, manualMode, onScan, onClose, stopCamera]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-background flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
            <div className="flex items-center gap-2">
              <Camera size={20} className="text-primary" />
              <h2 className="font-bold text-sm">QR Kod Skaner</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl hover:bg-secondary text-muted-foreground"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            {manualMode ? (
              <div className="w-full max-w-sm space-y-4">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Keyboard size={28} className="text-primary" />
                  </div>
                  <h3 className="font-bold text-base">QR kodni qo'lda kiriting</h3>
                  <p className="text-xs text-muted-foreground mt-1">Kamera ishlamasa, QR koddagi matnni yozing</p>
                </div>
                <input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="QR kod matnini kiriting..."
                  className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setManualMode(false)}
                    className="flex-1 py-3 rounded-xl bg-secondary text-sm font-medium"
                  >
                    Kameraga qaytish
                  </button>
                  <button
                    onClick={handleManualSubmit}
                    disabled={!manualCode.trim()}
                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                  >
                    Qidirish
                  </button>
                </div>
              </div>
            ) : error ? (
              <div className="text-center space-y-4 max-w-sm">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <AlertCircle size={28} className="text-destructive" />
                </div>
                <p className="text-sm text-muted-foreground">{error}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setManualMode(true)}
                    className="flex-1 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-medium"
                  >
                    <Keyboard size={14} className="inline mr-1.5" />
                    Qo'lda kiritish
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 bg-secondary px-6 py-2.5 rounded-xl text-sm font-medium"
                  >
                    Yopish
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-sm space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-secondary aspect-square">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  {/* Scan overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[200px] h-[200px] border-2 border-primary/50 rounded-xl relative">
                      <motion.div
                        className="absolute left-0 right-0 h-0.5 bg-primary"
                        animate={{ top: ["0%", "100%", "0%"] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                      />
                      {/* Corner marks */}
                      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl" />
                      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr" />
                      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl" />
                      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-primary rounded-br" />
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  QR kodni kamera oldiga tutib turing
                </p>
                <button
                  onClick={() => setManualMode(true)}
                  className="w-full py-2.5 rounded-xl bg-secondary text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  <Keyboard size={14} className="inline mr-1.5" />
                  Qo'lda kiritish
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QRScanner;
