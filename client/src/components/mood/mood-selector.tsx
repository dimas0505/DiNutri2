import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { MoodType } from "@shared/schema";

interface MoodSelectorProps {
  title: string;
  selectedMood?: MoodType;
  onMoodChange: (mood: MoodType) => void;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  showNotes?: boolean;
}

const moodOptions = [
  {
    value: "very_sad" as MoodType,
    emoji: "😢",
    label: "Muito triste",
    color: "text-red-500",
    bgColor: "bg-red-50 hover:bg-red-100",
    selectedBg: "bg-red-100 border-red-500",
  },
  {
    value: "sad" as MoodType,
    emoji: "😔",
    label: "Triste",
    color: "text-orange-500",
    bgColor: "bg-orange-50 hover:bg-orange-100",
    selectedBg: "bg-orange-100 border-orange-500",
  },
  {
    value: "neutral" as MoodType,
    emoji: "😐",
    label: "Neutro",
    color: "text-gray-500",
    bgColor: "bg-gray-50 hover:bg-gray-100",
    selectedBg: "bg-gray-100 border-gray-500",
  },
  {
    value: "happy" as MoodType,
    emoji: "😊",
    label: "Feliz",
    color: "text-green-500",
    bgColor: "bg-green-50 hover:bg-green-100",
    selectedBg: "bg-green-100 border-green-500",
  },
  {
    value: "very_happy" as MoodType,
    emoji: "😁",
    label: "Muito feliz",
    color: "text-blue-500",
    bgColor: "bg-blue-50 hover:bg-blue-100",
    selectedBg: "bg-blue-100 border-blue-500",
  },
];

export function MoodSelector({
  title,
  selectedMood,
  onMoodChange,
  notes,
  onNotesChange,
  showNotes = false,
}: MoodSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-5 gap-2">
          {moodOptions.map((option) => (
            <Button
              key={option.value}
              variant="outline"
              className={cn(
                "h-20 flex-col space-y-2 border-2 transition-all",
                option.bgColor,
                selectedMood === option.value
                  ? option.selectedBg
                  : "border-gray-200"
              )}
              onClick={() => onMoodChange(option.value)}
            >
              <span className="text-2xl">{option.emoji}</span>
              <span className={cn("text-xs font-medium", option.color)}>
                {option.label}
              </span>
            </Button>
          ))}
        </div>

        {showNotes && onNotesChange && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Observações (opcional)
            </label>
            <Textarea
              placeholder="Como você se sente? Adicione observações sobre seu humor..."
              value={notes || ""}
              onChange={(e) => onNotesChange(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}