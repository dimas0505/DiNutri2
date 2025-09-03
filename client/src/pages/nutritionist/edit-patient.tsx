import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { updatePatientSchema, type UpdatePatient, type Patient } from "@shared/schema";
import { DefaultMobileDrawer } from "@/components/layout/mobile-layout";

type FormData = UpdatePatient;

export default function EditPatientPage({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patient, isLoading } = useQuery<Patient>({
    queryKey: ["/api/patients", params.id],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(updatePatientSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (patient) {
      form.reset({
        ...patient,
        heightCm: patient.heightCm ?? undefined,
        weightKg: patient.weightKg ?? "",
        likedHealthyFoods: patient.likedHealthyFoods || [],
        dislikedFoods: patient.dislikedFoods || [],
        intolerances: patient.intolerances || [],
      });
    }
  }, [patient, form]);

  const updatePatientMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("PUT", `/api/patients/${params.id}`, data),
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Os dados do paciente foram atualizados.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setLocation(`/patients/${params.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o paciente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    updatePatientMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Carregando Paciente..." />
        <main className="max-w-4xl mx-auto p-4 lg:p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </main>
      </div>
    );
  }

  if (!patient) {
    return <div>Paciente não encontrado.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        title={`Editando: ${patient.name}`}
        showBack={true}
        onBack={() => setLocation(`/patients/${params.id}`)}
        drawerContent={<DefaultMobileDrawer />}
      />
      <main className="max-w-4xl mx-auto p-4 lg:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader><CardTitle>Dados Pessoais</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Fields for personal data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Nome Completo</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                  <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>E-mail</FormLabel> <FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="birthDate" render={({ field }) => ( <FormItem> <FormLabel>Data de Nascimento</FormLabel> <FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="sex" render={({ field }) => ( <FormItem> <FormLabel>Sexo</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? ""}> <FormControl><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="F">Feminino</SelectItem> <SelectItem value="M">Masculino</SelectItem> <SelectItem value="Outro">Outro</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="heightCm" render={({ field }) => ( <FormItem> <FormLabel>Altura (cm)</FormLabel> <FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="weightKg" render={({ field }) => ( <FormItem> <FormLabel>Peso (kg)</FormLabel> <FormControl><Input {...field} value={field.value ?? ""} /></FormControl> <FormDescription>Formato: 70.5</FormDescription> <FormMessage /> </FormItem> )}/>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Anamnese Nutricional</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Fields for anamnesis data */}
                <FormField control={form.control} name="goal" render={({ field }) => ( <FormItem> <FormLabel>Objetivo</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? ""}> <FormControl><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="lose_weight">Perder peso</SelectItem> <SelectItem value="maintain_weight">Manter peso</SelectItem> <SelectItem value="gain_weight">Ganhar peso</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="activityLevel" render={({ field }) => ( <FormItem> <FormLabel>Nível de Atividade</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? ""}> <FormControl><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value="1">1 - Sedentário</SelectItem> <SelectItem value="2">2 - Levemente ativo</SelectItem> <SelectItem value="3">3 - Moderadamente ativo</SelectItem> <SelectItem value="4">4 - Muito ativo</SelectItem> <SelectItem value="5">5 - Extremamente ativo</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="hasIntolerance" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6"> <FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl> <div className="space-y-1 leading-none"><FormLabel>Possui intolerância alimentar?</FormLabel></div> <FormMessage /> </FormItem> )}/>
                {form.watch("hasIntolerance") && ( <FormField control={form.control} name="intolerances" render={({ field }) => ( <FormItem> <FormLabel>Quais intolerâncias?</FormLabel> <FormControl><Input placeholder="Lactose, glúten..." value={Array.isArray(field.value) ? field.value.join(', ') : ''} onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()))} /></FormControl> <FormMessage /> </FormItem> )}/> )}
                <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem> <FormLabel>Observações Gerais</FormLabel> <FormControl><Textarea className="min-h-[100px]" {...field} value={field.value ?? ""} /></FormControl> <FormMessage /> </FormItem> )}/>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => setLocation(`/patients/${params.id}`)}>Cancelar</Button>
              <Button type="submit" disabled={updatePatientMutation.isPending}>
                {updatePatientMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}