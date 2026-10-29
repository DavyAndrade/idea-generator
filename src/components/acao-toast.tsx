import { useEffect, useState } from "react";
import { Check, Copy, Save } from "lucide-react";

interface AcaoToastProps {
  visible: boolean;
  message: string;
  icon?: "copy" | "save" | "check";
  onComplete?: () => void;
}

const icones = {
  copy: Copy,
  save: Save,
  check: Check,
};

export function AcaoToast({
  visible,
  message,
  icon = "check",
  onComplete,
}: AcaoToastProps) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (visible) {
      setShown(true);
      const t = setTimeout(() => {
        setShown(false);
        onComplete?.();
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [visible, onComplete]);

  if (!shown) return null;
  const Icone = icones[icon];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg border bg-foreground px-3 py-2 text-xs text-background shadow-lg">
      <div className="flex items-center gap-2">
        <Icone size={14} />
        <span>{message}</span>
      </div>
    </div>
  );
}
