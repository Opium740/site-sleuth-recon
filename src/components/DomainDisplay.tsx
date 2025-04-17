
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DomainDisplayProps {
  domain: string | null;
}

export function DomainDisplay({ domain }: DomainDisplayProps) {
  return (
    <Card className="mb-4">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="text-sm font-medium">Current Domain:</div>
        {domain ? (
          <Badge variant="outline" className="font-mono">
            {domain}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground animate-pulse-opacity">
            Detecting...
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
