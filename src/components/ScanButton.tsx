
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface ScanButtonProps {
  label: string;
  onClick: () => Promise<void>;
  disabled?: boolean;
}

export function ScanButton({ label, onClick, disabled = false }: ScanButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onClick();
    } catch (error) {
      console.error('Error during scan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      className="w-full flex items-center justify-center gap-2"
      variant="default" 
      onClick={handleClick}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Scanning...</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </Button>
  );
}
