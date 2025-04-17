
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ResultListProps {
  title: string;
  results: string[];
  isSuccess?: boolean;
  className?: string;
}

export function ResultList({ title, results, isSuccess = false, className }: ResultListProps) {
  if (results.length === 0) return null;

  return (
    <div className={cn("mt-4", className)}>
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <ScrollArea className="h-[200px] w-full rounded-md border">
        <div className="p-4">
          {results.map((result, index) => (
            <div 
              key={index} 
              className={cn(
                "px-3 py-2 text-xs rounded-sm mb-1 font-mono", 
                isSuccess ? "bg-green-100/10 border-l-2 border-green-500" : "bg-secondary/50"
              )}
            >
              {result}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
