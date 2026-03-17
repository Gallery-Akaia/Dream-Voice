import { useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnimatedBackground } from "@/components/animated-background";
import { FloatingParticles } from "@/components/floating-particles";
import { Phone } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import logoImg from "@assets/IMG_3672_1772631960491.png";

export default function ListenerPage() {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // Remove any stale script so we always start fresh
    const stale = document.querySelector('script[src*="caster.fm"]');
    if (stale) stale.remove();

    // Inject script AFTER the cstrEmbed div is in the DOM
    const script = document.createElement("script");
    script.src = "https://cdn.cloud.caster.fm/widgets/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      const s = document.querySelector('script[src*="caster.fm"]');
      if (s) s.remove();
    };
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      <FloatingParticles />

      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 relative z-10">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
          className="w-full max-w-2xl mx-auto space-y-10"
        >
          <div className="text-center space-y-6">
            <motion.div
              className="inline-flex items-center justify-center w-28 h-28 rounded-full mb-2 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsla(195, 100%, 50%, 0.3), hsla(270, 60%, 65%, 0.3))",
                backdropFilter: "blur(20px)",
                boxShadow: "0 0 60px hsla(195, 100%, 50%, 0.3)",
              }}
              animate={shouldReduceMotion ? {} : {
                boxShadow: [
                  "0 0 60px hsla(195, 100%, 50%, 0.3)",
                  "0 0 80px hsla(270, 60%, 65%, 0.4)",
                  "0 0 60px hsla(195, 100%, 50%, 0.3)",
                ],
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <img
                src={logoImg}
                alt="Radio Dream Voice Logo"
                className="w-full h-full object-cover p-2"
                data-testid="img-logo"
              />
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-5xl font-semibold tracking-tight text-white drop-shadow-lg">
                RADIO DREAM VOICE
              </h1>
              <p className="text-lg text-white/70">Your 24/7 streaming radio station</p>
              <a
                href="tel:+96170736396"
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-md border border-white/10"
                data-testid="link-phone"
              >
                <Phone className="w-4 h-4" />
                <span className="font-medium">+961 70 736 396</span>
              </a>
            </div>
          </div>

          {/* Caster.fm Player — div must be in DOM before the script loads */}
          <div className="w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl">
            <div
              data-type="newStreamPlayer"
              data-publicToken="e86556b5-4d8a-4e2b-9289-9c7775e4f452"
              data-theme="dark"
              data-color="e81e4d"
              data-channelId=""
              data-rendered="false"
              className="cstrEmbed"
              style={{ width: "100%", display: "block" }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
