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
  variant = "full" 
}: DiNutriLogoProps) {
  // Define a URL base para as imagens na pasta /public
  const baseUrl = "/";
  
  // Define qual imagem usar com base na variante.
  // Se a variante for 'icon', ele tentará carregar 'logo_dinutri_icon.png'.
  // Se a variante for 'full', ele carregará 'logo_dinutri.png'.
  const imageUrl = variant === 'icon' 
    ? `${baseUrl}logo_dinutri_icon.png` 
    : `${baseUrl}logo_dinutri.png`;

  // Imagem de fallback caso a imagem do ícone não exista.
  const fallbackUrl = `${baseUrl}logo_dinutri.png`;

  return (
    <img
      src={imageUrl}
      alt="DiNutri Logo"
      // Este evento é acionado se a imagem do ícone não for encontrada,
      // carregando a imagem completa como uma alternativa.
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        // Evita um loop infinito se o fallback também falhar
        if (target.src !== window.location.origin + fallbackUrl) {
          target.onerror = null; // Limpa o handler para evitar loops
          target.src = fallbackUrl;
        }
      }}
      className={cn(
        "w-auto object-contain", // Mantém a proporção da imagem
        sizeClasses[size],
        className
      )}
    />
  );
}