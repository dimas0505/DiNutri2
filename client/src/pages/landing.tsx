import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Mail, Lock, Loader2, Heart, Salad, BarChart3 } from "lucide-react";
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
      {/* Left column — hero / brand panel */}
      <section className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9]">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#A855F7]/40 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-white/5 blur-2xl" />

        <div className="relative z-10 flex h-full w-full flex-col justify-between p-12">
          {/* Logo chip */}
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 w-fit">
            <DiNutriLogo size="xl" variant="full" className="h-16" />
          </div>

          {/* Hero copy */}
          <div className="max-w-xl space-y-6">
            <h1 className="text-5xl font-bold leading-tight text-white">
              Seu Caminho para uma Vida Saudável
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              Plataforma completa para nutricionistas gerenciarem pacientes, prescrições e evolução clínica em um fluxo simples e eficiente.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-4 text-center">
                <Heart className="mb-2 h-5 w-5 text-white mx-auto" />
                <p className="text-xs font-medium text-white/90">Saúde Integral</p>
              </div>
              <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-4 text-center">
                <Salad className="mb-2 h-5 w-5 text-white mx-auto" />
                <p className="text-xs font-medium text-white/90">Nutrição Precisa</p>
              </div>
              <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-4 text-center">
                <BarChart3 className="mb-2 h-5 w-5 text-white mx-auto" />
                <p className="text-xs font-medium text-white/90">Evolução Real</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-white/50">© 2025 DiNutri. Todos os direitos reservados.</p>
        </div>
      </section>

      {/* Right column — login form */}
      <section className="flex items-center justify-center p-4 sm:p-8 bg-background">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <div className="bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] rounded-2xl p-4">
              <DiNutriLogo size="lg" variant="full" className="h-16" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">Seu Caminho para uma Vida Saudável</h2>
              <p className="text-sm text-muted-foreground mt-1">Plataforma de acompanhamento nutricional</p>
            </div>
          </div>

          {/* Form card */}
          <Card className="border border-border/70 bg-card shadow-md">
            <CardHeader className="space-y-1 text-center pb-4">
              <CardTitle className="text-2xl font-bold">Entrar na plataforma</CardTitle>
              <CardDescription>Use seu email e senha para acessar</CardDescription>
            </CardHeader>

            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="email" placeholder="seu@email.com" className="h-11 pl-10" {...field} />
                          </div>
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
                        <div className="flex items-center justify-between">
                          <FormLabel>Senha</FormLabel>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            Esqueceu a senha?
                          </button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="h-11 pl-10 pr-12"
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

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#5B21B6] text-white font-semibold shadow-md transition-all"
                    disabled={loginMutation.isPending}
                  >
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

              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Não tem uma conta?{" "}
                  <button
                    type="button"
                    className="text-primary font-medium hover:underline"
                  >
                    Criar Nova Conta
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
