import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AnamnesisRecord } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Schema de validação específico para este formulário
const formSchema = z.object({
  tmb: z.coerce.number().min(0, "Valor inválido").optional().nullable(),
  get: z.coerce.number().min(0, "Valor inválido").optional().nullable(),
  vet: z.coerce.number().min(0, "Valor inválido").optional().nullable(),
  usedFormula: z.string().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface AnamnesisNutritionistDataFormProps {
  anamnesis: AnamnesisRecord; // Recebe os dados da anamnese para preencher o formulário
}

export function AnamnesisNutritionistDataForm({ anamnesis }: AnamnesisNutritionistDataFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { // Preenche o formulário com dados existentes
      tmb: anamnesis.tmb ?? undefined,
      get: anamnesis.get ?? undefined,
      vet: anamnesis.vet ?? undefined,
      usedFormula: anamnesis.usedFormula ?? "",
    },
  });

  // Hook para realizar a chamada à API
  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      return apiRequest("PATCH", `/api/anamnesis/${anamnesis.id}/nutritionist-data`, data);
    },
    onSuccess: () => {
      toast({ title: "Dados salvos com sucesso!" });
      // Invalida a query do paciente para forçar a busca dos dados atualizados
      queryClient.invalidateQueries({ queryKey: ["/api/patients", anamnesis.patientId, "anamnesis-records"] });
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4 rounded-lg border bg-slate-50 p-4">
        <h4 className="font-semibold text-slate-800">Dados Nutricionais (Uso Interno)</h4>
        
        <FormField
          control={form.control}
          name="usedFormula"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fórmula utilizada</FormLabel>
              <FormControl>
                <Input type="text" placeholder="Ex: Harris-Benedict" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="tmb"
            render={({ field }) => (
              <FormItem>
                <FormLabel>TMB (kcal)</FormLabel>
                <FormControl>
                  <Input type="number" step="any" placeholder="1500" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="get"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GET (kcal)</FormLabel>
                <FormControl>
                  <Input type="number" step="any" placeholder="2200" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VET Prescrito (kcal)</FormLabel>
                <FormControl>
                  <Input type="number" step="any" placeholder="2000" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar Dados"}
          </Button>
        </div>
      </form>
    </Form>
  );
}