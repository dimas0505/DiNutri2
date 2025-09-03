import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { insertPatientSchema } from "@shared/schema";
import { MobileLayout, DefaultMobileDrawer } from "@/components/layout/mobile-layout";
import { Copy, LinkIcon } from "lucide-react";

// O schema do formulário agora inclui todos os campos de anamnese
const formSchema = insertPatientSchema.omit({ ownerId: true, userId: true }).extend({
  heightCm: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().optional()
  ),
  weightKg: z.string().regex(/^\d+(\.\d{1,2})?$/, "Peso inválido. Ex: 65.50").optional().or(z.literal('')),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  // Transform string arrays for multi-select fields
  likedHealthyFoods: z.array(z.string()).default([]),
  dislikedFoods: z.array(z.string()).default([]),
  intolerances: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof formSchema>;

export default function NewPatientPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [useInvitationLink, setUseInvitationLink] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      birthDate: "",
      sex: undefined,
      heightCm: undefined,
      weightKg: "",
      notes: "",
      goal: undefined,
      activityLevel: undefined,
      likedHealthyFoods: [],
      dislikedFoods: [],
      hasIntolerance: false,
      intolerances: [],
      canEatMorningSolids: false,
      mealsPerDayCurrent: undefined,
      mealsPerDayWilling: undefined,
      alcoholConsumption: undefined,
      supplements: "",
      diseases: "",
      medications: "",
      biotype: undefined,
    },
  });

  const createInvitationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/invitations");
      return res.json();
    },
    onSuccess: (data: any) => {
      const token = data?.token;
      if (!token) {
        toast({
          title: "Erro",
          description: "Resposta inválida do servidor ao gerar convite.",
          variant: "destructive",
        });
        return;
      }
      const fullUrl = `${window.location.origin}/anamnese?token=${token}`;
      setInvitationLink(fullUrl);
      toast({ title: "Link de convite gerado!" });
    },
    onError: (err: any) => {
      console.error("Erro ao gerar convite:", err);
      const errorMessage = err?.message || "Não foi possível gerar o link de convite.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = { 
        ...data,
        ownerId: user?.id
      };
      
      // Normalize optional fields
      if (payload.weightKg === "") {
        delete payload.weightKg;
      }

      const res = await apiRequest("POST", "/api/patients", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Paciente e seu acesso foram criados com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setLocation("/patients");
    },
    onError: (error: any) => {
      console.error("Erro ao criar paciente:", error);
      const errorMessage = error?.message?.includes("409")
        ? "Já existe um usuário com este email."
        : error?.message || "Falha ao cadastrar paciente. Verifique os dados e tente novamente.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não encontrado. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }
    createPatientMutation.mutate(data);
  };

  const handleGenerateInvite = () => {
    createInvitationMutation.mutate();
  };

  const copyToClipboard = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink);
      toast({ title: "Link copiado para a área de transferência!" });
    }
  };

  return (
    <MobileLayout 
      title="Novo Paciente"
      showBack={true}
      onBack={() => setLocation("/patients")}
      drawerContent={<DefaultMobileDrawer />}
    >
      <main className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="use-invitation"
                  checked={useInvitationLink}
                  onCheckedChange={setUseInvitationLink}
                />
                <Label htmlFor="use-invitation">
                  Enviar link de anamnese ao invés de preencher manualmente
                </Label>
              </div>
              
              {useInvitationLink ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Ao gerar um link de convite, o paciente receberá um formulário completo de anamnese para preencher, 
                    criando automaticamente sua conta após o envio.
                  </p>
                  
                  <Button
                    onClick={handleGenerateInvite}
                    disabled={createInvitationMutation.isPending}
                    className="w-full"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    {createInvitationMutation.isPending ? "Gerando..." : "Gerar Link de Anamnese"}
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    
                    {/* Dados Pessoais */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Dados Pessoais</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome Completo *</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome do paciente" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>E-mail *</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="email@exemplo.com" value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha de Acesso *</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="birthDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data de Nascimento</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="sex"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sexo</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="F">Feminino</SelectItem>
                                  <SelectItem value="M">Masculino</SelectItem>
                                  <SelectItem value="Outro">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="goal"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Objetivo</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="lose_weight">Perder peso</SelectItem>
                                  <SelectItem value="maintain_weight">Manter peso</SelectItem>
                                  <SelectItem value="gain_weight">Ganhar peso</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="heightCm"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Altura (cm)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="170"
                                  value={field.value ?? ""}
                                  onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                />
                              </FormControl>
                              <FormDescription>Altura em centímetros (opcional)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="weightKg"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Peso (kg)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="70.5"
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                />
                              </FormControl>
                              <FormDescription>Formato: 70.5 (opcional)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Anamnese Simplificada */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Anamnese Básica</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="activityLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nível de Atividade</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="1">1 - Sedentário</SelectItem>
                                  <SelectItem value="2">2 - Levemente ativo</SelectItem>
                                  <SelectItem value="3">3 - Moderadamente ativo</SelectItem>
                                  <SelectItem value="4">4 - Muito ativo</SelectItem>
                                  <SelectItem value="5">5 - Extremamente ativo</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="hasIntolerance"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                              <FormControl>
                                <Checkbox
                                  checked={field.value || false}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Possui intolerância alimentar?</FormLabel>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {form.watch("hasIntolerance") && (
                        <FormField
                          control={form.control}
                          name="intolerances"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quais intolerâncias? (separar por vírgula)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Lactose, glúten, etc."
                                  value={field.value?.join(", ") || ""}
                                  onChange={(e) => field.onChange(e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Observações sobre o paciente..."
                              className="min-h-[100px]"
                              value={field.value || ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setLocation("/patients")}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit"
                        disabled={createPatientMutation.isPending}
                      >
                        {createPatientMutation.isPending ? "Criando..." : "Criar Paciente"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Dialog for invitation link */}
      <Dialog open={!!invitationLink} onOpenChange={() => setInvitationLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de Anamnese Gerado</DialogTitle>
            <DialogDescription>
              Envie este link para o paciente preencher sua anamnese nutricional completa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
              {invitationLink}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setInvitationLink(null)}>
                Fechar
              </Button>
              <Button onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}