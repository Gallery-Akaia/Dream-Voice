import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

export function AnimatedBackground() {
  const shouldReduceMotion = useReducedMotion();
  const [currentPhase, setCurrentPhase] = useState(0);
  
  useEffect(() => {
    if (shouldReduceMotion) return;
    
    const interval = setInterval(() => {
      setCurrentPhase((prev) => (prev + 1) % 3);
    }, 15000);
    
    return () => clearInterval(interval);
  }, [shouldReduceMotion]);
  
  const backgrounds = [
    "linear-gradient(135deg, hsl(225, 60%, 20%) 0%, hsl(195, 70%, 25%) 50%, hsl(270, 50%, 25%) 100%)",
    "linear-gradient(135deg, hsl(195, 70%, 25%) 0%, hsl(270, 50%, 25%) 50%, hsl(225, 60%, 20%) 100%)",
    "linear-gradient(135deg, hsl(270, 50%, 25%) 0%, hsl(225, 60%, 20%) 50%, hsl(195, 70%, 25%) 100%)",
  ];
  
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {backgrounds.map((bg, index) => (
        <div
          key={index}
          className="absolute inset-0"
          style={{
            background: bg,
            opacity: shouldReduceMotion 
              ? (index === 0 ? 1 : 0) 
              : (currentPhase === index ? 1 : 0),
            transition: "opacity 15s linear",
          }}
        />
      ))}
      
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/5 to-background/20" />
    </div>
  );
}
