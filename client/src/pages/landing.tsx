import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
      // Recarrega a página para que o App.tsx possa redirecionar corretamente
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
    <>
      {/* Estilos CSS */}
      <style>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animation-delay-6000 {
          animation-delay: 6s;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Enhanced background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Primary gradient blob */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          {/* Secondary gradient blob */}
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          {/* Accent gradient blob */}
          <div className="absolute top-40 left-40 w-96 h-96 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-blob animation-delay-4000"></div>
          {/* Additional subtle blob for depth */}
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-br from-emerald-300 to-teal-400 rounded-full mix-blend-multiply filter blur-2xl opacity-10 animate-blob animation-delay-6000"></div>
        </div>

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:32px_32px] opacity-30"></div>

        <div className="w-full max-w-md relative z-10 animate-fade-in">
          {/* Enhanced logo section */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4 transform hover:scale-110 transition-all duration-500 animate-bounce-in">
              <DiNutriLogo size="xl" variant="full" className="h-36 md:h-40 filter drop-shadow-lg" />
            </div>
            
            {/* Enhanced tagline with better typography */}
            <div className="text-center animate-slide-up">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
                Nutrição Inteligente
              </h1>
              <p className="text-gray-600 text-sm md:text-base font-medium tracking-wide">
                Sua plataforma completa de gestão nutricional
              </p>
            </div>
          </div>

          {/* Enhanced login card */}
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-lg animate-scale-in">
            <CardHeader className="space-y-4 text-center pb-6">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Bem-vindo de volta!
              </CardTitle>
              <CardDescription className="text-gray-600">
                Acesse sua conta para continuar
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground font-semibold text-sm">Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            className="h-12 text-base"
                            {...field}
                          />
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
                        <FormLabel className="text-foreground font-semibold text-sm">Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="h-12 text-base pr-12"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full font-semibold text-base"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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

          {/* Enhanced footer */}
          <div className="text-center mt-8 animate-fade-in">
            <p className="text-sm text-muted-foreground font-medium">
              © 2025 DiNutri. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}