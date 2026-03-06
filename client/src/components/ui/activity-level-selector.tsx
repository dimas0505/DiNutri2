import { cn } from "@/lib/utils";

export type ActivityLevelValue = "1" | "2" | "3" | "4" | "5";

interface ActivityLevel {
  value: ActivityLevelValue;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  selectedBg: string;
  selectedBorder: string;
  selectedText: string;
}

const ACTIVITY_LEVELS: ActivityLevel[] = [
  {
    value: "1",
    label: "Sedentário",
    shortLabel: "Sedentário",
    description:
      "Não pratica atividade física regularmente. Passa a maior parte do dia sentado ou com pouca movimentação. Menos de 1 vez por semana.",
    icon: "🪑",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    selectedBg: "bg-gray-100",
    selectedBorder: "border-gray-500",
    selectedText: "text-gray-700",
  },
  {
    value: "2",
    label: "Levemente ativo",
    shortLabel: "Levemente ativo",
    description:
      "Realiza atividade física leve 1 a 2 vezes por semana, como caminhada leve, bicicleta casual ou exercícios ocasionais. A maior parte da rotina ainda é sedentária.",
    icon: "🚶",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    selectedBg: "bg-blue-100",
    selectedBorder: "border-blue-500",
    selectedText: "text-blue-700",
  },
  {
    value: "3",
    label: "Moderadamente ativo",
    shortLabel: "Moderadamente ativo",
    description:
      "Pratica atividade física 3 a 4 vezes por semana, como musculação, corrida, esportes ou treinos estruturados. Mantém uma rotina relativamente ativa durante a semana.",
    icon: "🏃",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    selectedBg: "bg-green-100",
    selectedBorder: "border-green-500",
    selectedText: "text-green-700",
  },
  {
    value: "4",
    label: "Muito ativo",
    shortLabel: "Muito ativo",
    description:
      "Treina 5 a 6 vezes por semana ou realiza atividades físicas intensas com frequência. Pode ter também uma rotina diária bastante ativa.",
    icon: "🏋️",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    selectedBg: "bg-orange-100",
    selectedBorder: "border-orange-500",
    selectedText: "text-orange-700",
  },
  {
    value: "5",
    label: "Extremamente ativo",
    shortLabel: "Extremamente ativo",
    description:
      "Treina todos os dias ou mais de uma vez por dia, ou possui trabalho fisicamente muito exigente, como atleta, trabalhador braçal ou rotina física intensa.",
    icon: "🏅",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    selectedBg: "bg-red-100",
    selectedBorder: "border-red-500",
    selectedText: "text-red-700",
  },
];

interface ActivityLevelSelectorProps {
  value: string | undefined;
  onChange: (value: string) => void;
  className?: string;
}

export function ActivityLevelSelector({
  value,
  onChange,
  className,
}: ActivityLevelSelectorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Escolha conforme a rotina real do paciente, considerando frequência
        semanal, intensidade dos treinos e nível de movimento no dia a dia.
      </p>
      <div className="flex flex-col gap-2">
        {ACTIVITY_LEVELS.map((level) => {
          const isSelected = value === level.value;
          return (
            <button
              key={level.value}
              type="button"
              onClick={() => onChange(level.value)}
              className={cn(
                "w-full text-left rounded-xl border-2 px-4 py-3 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? cn(
                      level.selectedBg,
                      level.selectedBorder,
                      "shadow-sm"
                    )
                  : cn(
                      level.bgColor,
                      level.borderColor,
                      "hover:shadow-sm hover:brightness-95"
                    )
              )}
              aria-pressed={isSelected}
            >
              <div className="flex items-start gap-3">
                {/* Número + ícone */}
                <div
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold border-2",
                    isSelected
                      ? cn(level.selectedBorder, level.selectedText, "bg-white")
                      : cn(level.borderColor, level.color, "bg-white")
                  )}
                >
                  {level.value}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{level.icon}</span>
                    <span
                      className={cn(
                        "font-semibold text-sm",
                        isSelected ? level.selectedText : level.color
                      )}
                    >
                      {level.label}
                    </span>
                    {isSelected && (
                      <span
                        className={cn(
                          "ml-auto text-xs font-medium px-2 py-0.5 rounded-full",
                          level.selectedBg,
                          level.selectedText,
                          "border",
                          level.selectedBorder
                        )}
                      >
                        Selecionado
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {level.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Retorna o rótulo legível de um valor de nível de atividade.
 */
export function getActivityLevelLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const found = ACTIVITY_LEVELS.find((l) => l.value === value);
  return found ? found.label : value;
}
