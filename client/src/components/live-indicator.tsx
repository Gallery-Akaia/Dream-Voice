import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  isLive: boolean;
  className?: string;
}

export function LiveIndicator({ isLive, className }: LiveIndicatorProps) {
  return (
    <Badge
      variant={isLive ? "destructive" : "secondary"}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-sm font-semibold",
        className
      )}
      data-testid={isLive ? "badge-live" : "badge-automated"}
    >
      {isLive && (
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive-foreground opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive-foreground"></span>
        </span>
      )}
      {isLive ? "LIVE" : "Automated Playback"}
    </Badge>
  );
}
