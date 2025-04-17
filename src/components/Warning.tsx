
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function Warning() {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="text-xs">
        Use responsibly on authorized targets only. Unauthorized scanning may be illegal.
      </AlertDescription>
    </Alert>
  );
}
