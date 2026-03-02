import React from "react";
import { cn } from "@/lib/utils";

interface DiNutriLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon";
}

// As classes de tamanho agora controlam a altura da imagem.
// A largura se ajustará automaticamente para manter a proporção.
const sizeClasses = {
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
  xl: "h-16"
};

export function DiNutriLogo({ 
  className, 
  size = "md", 
  variant: _variant = "full" 
}: DiNutriLogoProps) {
  return (
    <img
      src="/nova_logo_dinutri.png"
      alt="DiNutri Logo"
      className={cn(
        "w-auto object-contain",
        sizeClasses[size],
        className
      )}
    />
  );
}