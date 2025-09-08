// client/src/components/layout/patient-layout.tsx

import { ReactNode } from "react";
import { PatientSidebar } from "./patient-sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface PatientLayoutProps {
  children: ReactNode;
}

export function PatientLayout({ children }: PatientLayoutProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    // For mobile, just return children - let individual pages handle their mobile layout
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-white">
      <PatientSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}