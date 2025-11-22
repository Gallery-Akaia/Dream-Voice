import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";

interface LiveIndicatorProps {
  isLive: boolean;
  className?: string;
}

export function LiveIndicator({ isLive, className }: LiveIndicatorProps) {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <Badge
      variant={isLive ? "destructive" : "secondary"}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-sm font-semibold relative",
        isLive && "shadow-lg shadow-destructive/50",
        className
      )}
      data-testid={isLive ? "badge-live" : "badge-automated"}
    >
      {isLive && (
        <span className="relative flex h-2.5 w-2.5">
          {!shouldReduceMotion && (
            <motion.span
              className="absolute inline-flex h-full w-full rounded-full bg-destructive-foreground"
              animate={{
                scale: [1, 2, 2, 1],
                opacity: [0.75, 0, 0, 0.75],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          )}
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive-foreground"></span>
        </span>
      )}
      {isLive ? "LIVE" : "Automated Playback"}
    </Badge>
  );
}
