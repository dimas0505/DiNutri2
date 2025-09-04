import { useState } from "react";
import { Utensils, Info, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MealCard } from "@/components/ui/meal-card";
import MealMenuScreen from "@/components/meal/meal-menu-screen";
import { HeaderDNutri } from "@/components/ui/header-dinutri";
import { DNutriBottomNav } from "@/components/ui/dinutri-bottom-nav";
import type { MealData, Prescription } from "@shared/schema";

// Mock data for demonstration
const mockPrescriptions: Prescription[] = [
  {
    id: "1",
    title: "Plano Principal",
    status: "published",
    generalNotes: "Ajustes semanais conforme retorno do paciente. Manter hidratação adequada de pelo menos 2L de água por dia. Evitar açúcares refinados e alimentos ultraprocessados.",
    meals: [
      {
        id: "1",
        name: "Café da Manhã",
        time: "07:00",
        notes: "Preferir frutas da estação e evitar adoçantes artificiais.",
        items: [
          {
            id: "1",
            description: "Aveia em flocos",
            amount: "3 colheres de sopa",
            substitutes: ["Quinoa em flocos", "Granola integral", "Cereal integral"]
          },
          {
            id: "2", 
            description: "Banana média",
            amount: "1 unidade",
            substitutes: ["Maçã", "Pêra", "Manga pequena"]
          },
          {
            id: "3",
            description: "Iogurte natural",
            amount: "1 pote (170g)",
            substitutes: ["Iogurte grego", "Leite desnatado", "Bebida vegetal"]
          }
        ]
      },
      {
        id: "2",
        name: "Almoço",
        time: "12:00",
        notes: "Preferir o preparo grelhado ou cozido. Usar pouco óleo no preparo.",
        items: [
          {
            id: "4",
            description: "Arroz integral",
            amount: "4 colheres de sopa",
            substitutes: ["Quinoa", "Batata doce", "Macarrão integral"]
          },
          {
            id: "5",
            description: "Feijão carioca",
            amount: "3 colheres de sopa",
            substitutes: ["Lentilha", "Grão de bico", "Feijão preto"]
          },
          {
            id: "6",
            description: "Peito de frango grelhado",
            amount: "120g",
            substitutes: ["Peixe grelhado", "Ovo cozido", "Tofu"]
          },
          {
            id: "7",
            description: "Salada mista",
            amount: "À vontade",
            substitutes: ["Legumes refogados", "Salada verde", "Vegetais grelhados"]
          }
        ]
      },
      {
        id: "3",
        name: "Lanche da Tarde",
        time: "15:30",
        notes: "Opção leve e nutritiva para manter energia.",
        items: [
          {
            id: "8",
            description: "Castanha do Brasil",
            amount: "3 unidades",
            substitutes: ["Amendoim", "Nozes", "Amêndoas"]
          },
          {
            id: "9",
            description: "Chá verde",
            amount: "1 xícara",
            substitutes: ["Chá branco", "Água com limão", "Chá de hibisco"]
          }
        ]
      },
      {
        id: "4",
        name: "Jantar",
        time: "19:00",
        notes: "Refeição mais leve para facilitar a digestão noturna.",
        items: [
          {
            id: "10",
            description: "Salmão grelhado",
            amount: "100g",
            substitutes: ["Sardinha", "Atum", "Bacalhau"]
          },
          {
            id: "11",
            description: "Batata doce assada",
            amount: "1 unidade média",
            substitutes: ["Abóbora", "Mandioca", "Inhame"]
          },
          {
            id: "12",
            description: "Brócolis refogado",
            amount: "3 colheres de sopa",
            substitutes: ["Couve-flor", "Abobrinha", "Vagem"]
          }
        ]
      }
    ],
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    patientId: "demo",
    nutritionistId: "demo"
  }
];

export default function PrescriptionDemo() {
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(mockPrescriptions[0]);
  const [selectedMeal, setSelectedMeal] = useState<MealData | null>(null);
  const [showFullScreenMenu, setShowFullScreenMenu] = useState(false);

  const handleSelectPrescription = (prescriptionId: string) => {
    const pres = mockPrescriptions.find(p => p.id === prescriptionId);
    if (pres) {
      setSelectedPrescription(pres);
      setSelectedMeal(null);
    }
  };

  const handleMealClick = (meal: MealData) => {
    setSelectedMeal(meal);
    setShowFullScreenMenu(true);
  };

  const handleCloseFullScreenMenu = () => {
    setShowFullScreenMenu(false);
    setSelectedMeal(null);
  };

  const pageContent = () => {
    // Lista de refeições  
    return (
      <div className="p-4 md:p-6">
        {/* Header section with prescription selection */}
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Minha Prescrição Nutricional
            </h1>
            <p className="text-gray-600 text-sm">
              Selecione uma prescrição e navegue pelas suas refeições
            </p>
          </div>
          
          {mockPrescriptions.length > 1 && (
            <Tabs value={selectedPrescription?.id} onValueChange={handleSelectPrescription} className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 bg-gray-100 p-1 rounded-xl">
                {mockPrescriptions.map(p => (
                  <TabsTrigger 
                    key={p.id} 
                    value={p.id}
                    className="rounded-lg font-medium text-sm py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    {p.title}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </div>

        {/* Meals grid section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Suas Refeições ({selectedPrescription?.meals.length || 0})
            </h2>
            <div className="text-sm text-gray-500">
              Toque para ver detalhes
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            {selectedPrescription?.meals.map((meal, index) => (
              <div
                key={meal.id}
                className="group relative"
              >
                {/* Meal number badge */}
                <div className="absolute -top-2 -left-2 z-10 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                  {index + 1}
                </div>
                
                <MealCard
                  title={meal.name}
                  icon={Utensils}
                  onClick={() => handleMealClick(meal)}
                  className="transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-lg border-l-4 border-l-purple-400 bg-gradient-to-r from-white to-purple-50/30"
                />
                
                {/* Meal items count */}
                <div className="absolute bottom-2 right-4 text-xs text-white/90 bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
                  {meal.items.length} {meal.items.length === 1 ? 'item' : 'itens'}
                </div>
              </div>
            ))}
          </div>
          
          {/* General notes section */}
          {selectedPrescription?.generalNotes && (
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Observações Gerais
                  </h3>
                  <p className="text-blue-800 text-sm leading-relaxed">
                    {selectedPrescription.generalNotes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Se estiver mostrando a tela completa do menu da refeição
  if (selectedMeal && selectedPrescription && showFullScreenMenu) {
    return (
      <MealMenuScreen
        meal={selectedMeal}
        prescriptionId={selectedPrescription.id}
        patientId="demo"
        onClose={handleCloseFullScreenMenu}
      />
    );
  }

  // Layout mobile
  return (
    <div className="min-h-screen bg-background">
      {/* Header customizado com gradiente */}
      <HeaderDNutri 
        onProfileClick={() => {}} 
        goalText="Demo: Plano Alimentar Modernizado" 
      />
      
      {/* Área de conteúdo com cantos superiores arredondados */}
      <main className="bg-white rounded-t-2xl -mt-2 min-h-screen pt-8 pb-24 px-1">
        <div className="mb-4 p-4">
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
        {pageContent()}
      </main>

      {/* Bottom navigation customizada */}
      <DNutriBottomNav 
        activeItem="prescription" 
        onItemClick={(item) => {
          // Demo mode - no navigation
        }}
      />
    </div>
  );
}