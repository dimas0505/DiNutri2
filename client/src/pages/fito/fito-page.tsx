import { useState, useMemo } from "react";
import { Search, Filter, X, Copy, Check } from "lucide-react";
import Header from "@/components/layout/header";
import { MobileLayout, DefaultMobileDrawer } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import phytotherapyData from "@/lib/phytotherapy-data.json";

interface PhytotherapyFormula {
  id: number;
  objective: string;
  category: string;
  subcategory: string;
  formula: string;
  posology: string;
}

const CATEGORIES = [
  "Peso e Metabolismo",
  "Performance Física",
  "Comportamento Alimentar",
  "Sono e Relaxamento",
  "Cognição e Foco",
  "Saúde Mental e Emocional",
  "Saúde Digestiva",
  "Saúde Hepática",
  "Saúde Hormonal",
  "Detox e Imunidade",
  "Antioxidante e Longevidade",
  "Pele, Cabelo e Unhas",
  "Circulação e Drenagem",
  "Saúde Cardiovascular",
  "Saúde Metabólica",
  "Saúde Articular e Óssea",
  "Energia e Vitalidade",
  "Saúde Sensorial",
  "Bem-estar Geral",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Peso e Metabolismo": "bg-blue-100 text-blue-800",
  "Performance Física": "bg-red-100 text-red-800",
  "Comportamento Alimentar": "bg-orange-100 text-orange-800",
  "Sono e Relaxamento": "bg-purple-100 text-purple-800",
  "Cognição e Foco": "bg-yellow-100 text-yellow-800",
  "Saúde Mental e Emocional": "bg-pink-100 text-pink-800",
  "Saúde Digestiva": "bg-green-100 text-green-800",
  "Saúde Hepática": "bg-emerald-100 text-emerald-800",
  "Saúde Hormonal": "bg-rose-100 text-rose-800",
  "Detox e Imunidade": "bg-cyan-100 text-cyan-800",
  "Antioxidante e Longevidade": "bg-indigo-100 text-indigo-800",
  "Pele, Cabelo e Unhas": "bg-fuchsia-100 text-fuchsia-800",
  "Circulação e Drenagem": "bg-teal-100 text-teal-800",
  "Saúde Cardiovascular": "bg-red-100 text-red-800",
  "Saúde Metabólica": "bg-amber-100 text-amber-800",
  "Saúde Articular e Óssea": "bg-slate-100 text-slate-800",
  "Energia e Vitalidade": "bg-lime-100 text-lime-800",
  "Saúde Sensorial": "bg-sky-100 text-sky-800",
  "Bem-estar Geral": "bg-violet-100 text-violet-800",
};

export default function FitoPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const formulas: PhytotherapyFormula[] = phytotherapyData;

  // Get unique subcategories for selected category
  const subcategories = useMemo(() => {
    if (!selectedCategory || selectedCategory === "all") return [];
    return Array.from(
      new Set(
        formulas
          .filter((f) => f.category === selectedCategory)
          .map((f) => f.subcategory)
      )
    ).sort();
  }, [selectedCategory]);

  // Filter formulas based on selected filters and search
  const filteredFormulas = useMemo(() => {
    return formulas.filter((formula) => {
      const matchesCategory = !selectedCategory || selectedCategory === "all" || formula.category === selectedCategory;
      const matchesSearch =
        !searchTerm ||
        formula.objective.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formula.subcategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formula.formula.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchTerm]);

  const handleCopyFormula = (formula: string, id: number) => {
    navigator.clipboard.writeText(formula);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearFilters = () => {
    setSelectedCategory("all");
    setSearchTerm("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header
        title="Consultor de Fitoterápicos"
        subtitle="Busque fórmulas por categoria ou objetivo"
        drawerContent={<DefaultMobileDrawer />}
      />

      <main className="max-w-7xl mx-auto p-4 lg:p-6">
        {/* Search and Filter Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Search Input */}
          <div className="lg:col-span-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por objetivo ou ingrediente..."
                className="pl-10 h-11"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Category Select */}
          <div className="lg:col-span-1">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-11">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Selecione uma categoria..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex gap-2">
            {(selectedCategory !== "all" || searchTerm) && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="flex-1 lg:flex-none"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              {filteredFormulas.length} fórmula{filteredFormulas.length !== 1 ? "s" : ""} encontrada{filteredFormulas.length !== 1 ? "s" : ""}
            </h2>
            {selectedCategory && selectedCategory !== "all" && (
              <Badge className={CATEGORY_COLORS[selectedCategory] || "bg-gray-100 text-gray-800"}>
                {selectedCategory}
              </Badge>
            )}
          </div>
        </div>

        {/* Formulas Grid */}
        {filteredFormulas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFormulas.map((formula) => (
              <Card
                key={formula.id}
                className="hover:shadow-lg transition-shadow duration-300 overflow-hidden border-l-4"
                style={{
                  borderLeftColor: getCategoryColor(formula.category),
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base text-gray-900 mb-2">
                        {formula.objective}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className={`${CATEGORY_COLORS[formula.category] || "bg-gray-100 text-gray-800"}`}
                      >
                        {formula.subcategory}
                      </Badge>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                      #{formula.id}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Formula */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      Fórmula
                    </p>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 relative group">
                      <p className="text-sm text-gray-700 leading-relaxed pr-8">
                        {formula.formula}
                      </p>
                      <button
                        onClick={() => handleCopyFormula(formula.formula, formula.id)}
                        className="absolute top-2 right-2 p-1.5 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                        title="Copiar fórmula"
                      >
                        {copiedId === formula.id ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Posology */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      Posologia
                    </p>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-900 font-medium">
                        {formula.posology}
                      </p>
                    </div>
                  </div>

                  {/* Category Badge */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      Categoria
                    </p>
                    <Badge className={CATEGORY_COLORS[formula.category] || "bg-gray-100 text-gray-800"}>
                      {formula.category}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Nenhuma fórmula encontrada
              </h3>
              <p className="text-muted-foreground mb-4">
                Tente ajustar seus filtros ou termos de busca
              </p>
              <Button
                variant="outline"
                onClick={handleClearFilters}
              >
                Limpar Filtros
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Statistics Footer */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-blue-600">{formulas.length}</div>
              <p className="text-sm text-muted-foreground mt-2">Total de Fórmulas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-green-600">{CATEGORIES.length}</div>
              <p className="text-sm text-muted-foreground mt-2">Categorias</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {Array.from(new Set(formulas.map((f) => f.subcategory))).length}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Subcategorias</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-orange-600">{filteredFormulas.length}</div>
              <p className="text-sm text-muted-foreground mt-2">Resultados</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    "Peso e Metabolismo": "#3b82f6",
    "Performance Física": "#ef4444",
    "Comportamento Alimentar": "#f97316",
    "Sono e Relaxamento": "#a855f7",
    "Cognição e Foco": "#eab308",
    "Saúde Mental e Emocional": "#ec4899",
    "Saúde Digestiva": "#22c55e",
    "Saúde Hepática": "#10b981",
    "Saúde Hormonal": "#f43f5e",
    "Detox e Imunidade": "#06b6d4",
    "Antioxidante e Longevidade": "#6366f1",
    "Pele, Cabelo e Unhas": "#d946ef",
    "Circulação e Drenagem": "#14b8a6",
    "Saúde Cardiovascular": "#ef4444",
    "Saúde Metabólica": "#f59e0b",
    "Saúde Articular e Óssea": "#64748b",
    "Energia e Vitalidade": "#84cc16",
    "Saúde Sensorial": "#0ea5e9",
    "Bem-estar Geral": "#8b5cf6",
  };
  return colors[category] || "#6b7280";
}
