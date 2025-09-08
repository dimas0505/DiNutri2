import React from "react";
import { NutritionistSidebar } from "./nutritionist-sidebar";
import { MobileLayout, DefaultMobileDrawer } from "./mobile-layout";
import { useIsMobile } from "@/hooks/use-mobile";

interface NutritionistLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function NutritionistLayout({ children, title, subtitle, className }: NutritionistLayoutProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileLayout 
        title={title || "DiNutri"} 
        subtitle={subtitle}
        drawerContent={<DefaultMobileDrawer />}
        className={className}
      >
        {children}
      </MobileLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-100 relative overflow-hidden">
      <NutritionistSidebar />
      <div className="pl-14">
        {children}
      </div>
    </div>
  );
}