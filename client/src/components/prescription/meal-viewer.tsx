import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MealData } from "@shared/schema";

interface MealViewerProps {
  meal: MealData;
}

export default function MealViewer({ meal }: MealViewerProps) {
  return (
    <Card>
      <CardHeader className="pb-4 bg-accent/5">
        <CardTitle data-testid={`text-meal-name-${meal.id}`}>{meal.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-3 mb-4">
          {meal.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-background border border-border rounded-md p-3">
              <div className="flex-1">
                <span className="font-medium" data-testid={`text-item-description-${item.id}`}>
                  {item.description}
                </span>
              </div>
              <div className="text-muted-foreground" data-testid={`text-item-amount-${item.id}`}>
                {item.amount}
              </div>
            </div>
          ))}
        </div>

        {meal.notes && (
          <div className="bg-muted/30 p-3 rounded-md">
            <p className="text-sm text-muted-foreground flex items-start space-x-2" data-testid={`text-meal-notes-${meal.id}`}>
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{meal.notes}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
