import * as React from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MobileDrawerProps {
  children: React.ReactNode;
  title?: string;
  trigger?: React.ReactNode;
  className?: string;
  side?: "left" | "right" | "top" | "bottom";
}

export function MobileDrawer({ 
  children, 
  title = "Menu",
  trigger,
  className,
  side = "left"
}: MobileDrawerProps) {
  const [open, setOpen] = React.useState(false);

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="md:hidden">
      <Menu className="h-5 w-5" />
      <span className="sr-only">Abrir menu</span>
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent 
        side={side} 
        className={cn("w-[300px] sm:w-[400px]", className)}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <div className="flex flex-col h-full">
          <div className="flex items-center pb-4 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <div className="flex-1 py-4 overflow-y-auto">
            {children}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}