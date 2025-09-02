import * as React from "react";
import { cn } from "@/lib/utils";

interface GoalCardProps {
  goal: string;
  className?: string;
}

export function GoalCard({ goal, className }: GoalCardProps) {
  return (
    <div
      className={cn(
        // Layout and positioning
        "bg-white/10 backdrop-blur-sm border border-white/20",
        "rounded-xl px-6 py-4 mx-4 mb-6",
        // Shadow and styling
        "shadow-md",
        // Text styling
        "text-center",
        className
      )}
    >
      <h2 className="text-white text-xl font-semibold">
        {goal}
      </h2>
    </div>
  );
}