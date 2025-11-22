import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface AudioVisualizerProps {
  isPlaying: boolean;
  compact?: boolean;
  shouldReduceMotion?: boolean;
}

export function AudioVisualizer({ isPlaying, compact = false, shouldReduceMotion = false }: AudioVisualizerProps) {
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    const barCount = compact ? 12 : 24;
    setBars(Array.from({ length: barCount }, () => Math.random()));

    if (!isPlaying || shouldReduceMotion) return;

    const interval = setInterval(() => {
      setBars(Array.from({ length: barCount }, () => Math.random()));
    }, 150);

    return () => clearInterval(interval);
  }, [isPlaying, compact, shouldReduceMotion]);

  const barCount = compact ? 12 : 24;
  const height = compact ? 32 : 64;

  return (
    <div
      className="flex items-end justify-center gap-[2px]"
      style={{ height: `${height}px` }}
      data-testid="audio-visualizer"
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full"
          style={{
            background: "linear-gradient(to top, hsl(195, 100%, 50%), hsl(270, 60%, 65%))",
          }}
          initial={{ height: "4px" }}
          animate={{
            height: (isPlaying && !shouldReduceMotion)
              ? `${(bars[i] || 0.2) * height}px`
              : "4px",
          }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.15,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
