import { useEffect, useState } from "react";
import { DiNutriLogo } from "@/components/ui/dinutri-logo";

interface SplashScreenProps {
  onFinished: () => void;
}

export function SplashScreen({ onFinished }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "exit">("enter");

  useEffect(() => {
    // After logo has faded/scaled in, trigger the slide-up exit
    const exitTimer = setTimeout(() => {
      setPhase("exit");
    }, 1600);

    // Once exit animation completes, notify parent
    const doneTimer = setTimeout(() => {
      onFinished();
    }, 2200);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinished]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] ${
        phase === "exit" ? "animate-splash-slide-up" : ""
      }`}
    >
      {/* Decorative blobs */}
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[#A855F7]/40 blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className={`flex flex-col items-center gap-4 ${phase === "enter" ? "animate-splash-logo-enter" : ""}`}>
        <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6">
          <DiNutriLogo size="xl" variant="full" className="h-24 w-auto" />
        </div>
        <p className="text-white/80 text-lg font-medium tracking-wide">
          Seu Caminho para uma Vida Saudável
        </p>
      </div>
    </div>
  );
}
