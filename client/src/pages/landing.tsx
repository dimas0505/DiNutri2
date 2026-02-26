import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Leaf, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DiNutriLogo } from "@/components/ui/dinutri-logo";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email("Por favor, insira um email válido."),
  password: z.string().min(1, "A senha é obrigatória."),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Landing() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) => apiRequest("POST", "/api/login", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando...",
      });
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: "Erro de Login",
        description: "Email ou senha inválidos. Por favor, tente novamente.",
        variant: "destructive",
      });
      console.error("Login failed:", error);
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <section className="hidden lg:flex relative overflow-hidden border-r border-border/70 bg-emerald-50/70">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative z-10 flex h-full w-full flex-col justify-between p-12">
          <DiNutriLogo size="xl" variant="full" className="h-24" />

          <div className="max-w-xl space-y-6">
            <h1 className="text-5xl font-bold leading-tight text-foreground">
              Plataforma moderna para acompanhamento nutricional.
            </h1>
            <p className="text-lg text-muted-foreground">
              Organize pacientes, prescrições e evolução clínica em um fluxo simples, limpo e eficiente.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                <Leaf className="mb-2 h-5 w-5 text-primary" />
                <p className="text-sm font-medium">Dashboard claro e objetivo</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                <Sparkles className="mb-2 h-5 w-5 text-accent" />
                <p className="text-sm font-medium">Experiência web mobile-first</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">© 2025 DiNutri. Todos os direitos reservados.</p>
        </div>
      </section>

      <section className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center lg:hidden">
            <DiNutriLogo size="lg" variant="full" className="h-20" />
          </div>

          <Card className="border border-border/70 bg-card shadow-sm">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-2xl">Entrar na plataforma</CardTitle>
              <CardDescription>Use seu email e senha para acessar</CardDescription>
            </CardHeader>

            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="seu@email.com" className="h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="h-11 pr-12"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-11 px-3"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full h-11" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
