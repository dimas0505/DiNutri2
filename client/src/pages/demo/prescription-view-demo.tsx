import { useState } from "react";
import { Utensils, FileText, Camera, Heart, ChevronRight, Info, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Demo data for showcase
const demoMeals = [
  {
    id: "1",
    name: "Café da Manhã",
    items: [
      { id: "1", description: "Aveia com frutas vermelhas", amount: "50g + 100g", substitutes: [] },
      { id: "2", description: "Iogurte natural", amount: "150ml", substitutes: [] }
    ],
    notes: "Consumir 30 minutos após acordar. Adicionar canela se desejar."
  },
  {
    id: "2",
    name: "Almoço",
    items: [
      { id: "3", description: "Peito de frango grelhado", amount: "120g", substitutes: [] },
      { id: "4", description: "Arroz integral", amount: "4 colheres de sopa", substitutes: [] },
      { id: "5", description: "Salada verde variada", amount: "à vontade", substitutes: [] }
    ],
    notes: "Temperar com azeite e limão. Evitar excesso de sal."
  },
  {
    id: "3",
    name: "Lanche da Tarde",
    items: [
      { id: "6", description: "Frutas da estação", amount: "1 unidade média", substitutes: [] },
      { id: "7", description: "Castanhas mistas", amount: "10 unidades", substitutes: [] }
    ],
    notes: "Ótima opção para manter a energia durante a tarde."
  }
];

const demoPrescriptions = [
  {
    id: "1",
    title: "Plano Nutricional - Semana 1",
    meals: demoMeals,
    generalNotes: "Mantenha-se hidratado bebendo pelo menos 2L de água por dia. Evite açúcar refinado e alimentos ultraprocessados."
  },
  {
    id: "2", 
    title: "Plano Nutricional - Semana 2",
    meals: demoMeals.slice(0, 2),
    generalNotes: "Continue seguindo as orientações da semana anterior."
  }
];

function SimpleHeader() {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-xl">
      <div className="p-4 text-center">
        <h1 className="text-2xl font-bold mb-2">DiNutri</h1>
        <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 inline-block">
          <span className="text-sm">Objetivo: Perder Peso</span>
        </div>
      </div>
    </div>
  );
}

function SimpleBottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
      <div className="flex justify-around items-center">
        <div className="flex flex-col items-center space-y-1">
          <div className="w-6 h-6 bg-gray-400 rounded"></div>
          <span className="text-xs text-gray-600">Home</span>
        </div>
        <div className="flex flex-col items-center space-y-1">
          <div className="w-6 h-6 bg-purple-600 rounded"></div>
          <span className="text-xs text-purple-600 font-medium">Prescrição</span>
        </div>
        <div className="flex flex-col items-center space-y-1">
          <div className="w-6 h-6 bg-gray-400 rounded"></div>
          <span className="text-xs text-gray-600">Perfil</span>
        </div>
      </div>
    </div>
  );
}

function EnhancedMealCard({ 
  meal, 
  index, 
  onClick 
}: { 
  meal: any; 
  index: number; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500"
      aria-label={`Acessar refeição ${meal.name}`}
    >
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Icon with glassmorphism effect */}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                  <Utensils className="h-6 w-6 text-white" />
                </div>
              </div>
              {/* Number badge */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                {index}
              </div>
            </div>
            
            <div className="text-left">
              <h3 className="font-semibold text-lg text-gray-900 group-hover:text-purple-600 transition-colors">
                {meal.name}
              </h3>
              <p className="text-sm text-gray-600">
                {meal.items.length} {meal.items.length === 1 ? 'item' : 'itens'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-xs text-gray-500">Toque para ver detalhes</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
          </div>
        </div>
        
        {/* Meal notes preview if available */}
        {meal.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700 overflow-hidden" 
               style={{ 
                 display: '-webkit-box',
                 WebkitLineClamp: 2,
                 WebkitBoxOrient: 'vertical'
               }}>
              {meal.notes}
            </p>
          </div>
        )}
      </div>
    </button>
  );
}

function MealDetailView({ meal, onBack }: { meal: any; onBack: () => void }) {
  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      {/* Enhanced Header with gradient */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-xl">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-white hover:bg-white/20 p-2 rounded-full"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">{meal.name}</h1>
            <div className="w-9" /> {/* Spacer for centering */}
          </div>
          
          <div className="flex items-center justify-center space-x-2">
            <Utensils className="h-4 w-4" />
            <span className="text-sm opacity-90">
              {meal.items.length} {meal.items.length === 1 ? 'item' : 'itens'} nesta refeição
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8 max-w-2xl mx-auto">
          {/* Enhanced Quick Actions Section */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Ações Rápidas</h2>
              <p className="text-sm text-gray-600">Registre sua experiência com esta refeição</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Photo Action - Emerald theme */}
              <Button
                className="h-24 flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-0"
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Camera className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">Adicionar Foto</div>
                  <div className="text-xs opacity-90">Registre no diário alimentar</div>
                </div>
              </Button>

              {/* Mood Action - Rose theme */}
              <Button
                className="h-24 flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-0"
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Heart className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">Registrar Humor</div>
                  <div className="text-xs opacity-90">Como você se sente?</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Enhanced Food Items List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Alimentos desta Refeição</h2>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {meal.items.length} {meal.items.length === 1 ? 'item' : 'itens'}
              </Badge>
            </div>
            
            <div className="grid gap-4">
              {meal.items.map((item: any, index: number) => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300"
                >
                  <div className="flex items-start space-x-4">
                    {/* Numbered badge */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                        {index + 1}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                        {item.description}
                      </h3>
                      <p className="text-gray-600 mb-4 text-sm">
                        <span className="font-medium">Quantidade:</span> {item.amount}
                      </p>
                      
                      {/* Enhanced substitution button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 rounded-lg font-medium"
                      >
                        <span>Ver opções de substituição</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Notes Section */}
          {meal.notes && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <Info className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-2 text-lg">
                    Observações Importantes
                  </h3>
                  <p className="text-amber-800 leading-relaxed">{meal.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PrescriptionViewDemo() {
  const [selectedPrescription, setSelectedPrescription] = useState(demoPrescriptions[0]);
  const [selectedMeal, setSelectedMeal] = useState<any>(null);

  if (selectedMeal) {
    return <MealDetailView meal={selectedMeal} onBack={() => setSelectedMeal(null)} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header customizado com gradiente */}
      <SimpleHeader />
      
      {/* Área de conteúdo com cantos superiores arredondados */}
      <main className="bg-white rounded-t-2xl -mt-2 min-h-screen pt-6 pb-20">
        <div className="p-4 md:p-0 space-y-6">
          {/* Enhanced prescription tabs */}
          <div className="space-y-4">
            <div className="flex flex-col space-y-3">
              <h2 className="text-xl font-semibold text-gray-900">Suas Prescrições</h2>
              <p className="text-sm text-gray-600">
                Selecione uma prescrição para visualizar suas refeições
              </p>
            </div>
            
            <Tabs value={selectedPrescription?.id} onValueChange={(id) => {
              const pres = demoPrescriptions.find(p => p.id === id);
              if (pres) setSelectedPrescription(pres);
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-1 gap-2 bg-transparent h-auto p-0">
                {demoPrescriptions.map(p => (
                  <TabsTrigger 
                    key={p.id} 
                    value={p.id}
                    className="justify-between px-4 py-3 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-purple-600 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Utensils className="h-4 w-4" />
                        <span className="font-medium">{p.title}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-white/20 text-current">
                        {p.meals.length} {p.meals.length === 1 ? 'refeição' : 'refeições'}
                      </Badge>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Enhanced meal cards section */}
          {selectedPrescription && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Refeições de {selectedPrescription.title}
                </h3>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {selectedPrescription.meals.length} refeições
                </Badge>
              </div>
              
              <div className="grid gap-4">
                {selectedPrescription.meals.map((meal, index) => (
                  <EnhancedMealCard
                    key={meal.id}
                    meal={meal}
                    index={index + 1}
                    onClick={() => setSelectedMeal(meal)}
                  />
                ))}
              </div>
              
              {/* General notes section */}
              {selectedPrescription.generalNotes && (
                <Card className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <Info className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-2">Observações Gerais</h4>
                        <p className="text-blue-800 text-sm whitespace-pre-wrap">
                          {selectedPrescription.generalNotes}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Bottom navigation customizada */}
      <SimpleBottomNav />
    </div>
  );
}