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
      {/* Enhanced CSS Styles with more sophisticated animations */}
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
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        
        @keyframes glow {
          0%, 100% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-glow {
          animation: glow 3s ease-in-out infinite;
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
        
        /* Glass morphism effect */
        .glass-morphism {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        /* Professional gradient text */
        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        /* Enhanced shadow with color */
        .shadow-colorful {
          box-shadow: 
            0 20px 25px -5px rgba(102, 126, 234, 0.1),
            0 10px 10px -5px rgba(102, 126, 234, 0.04),
            0 0 0 1px rgba(255, 255, 255, 0.05);
        }
      `}</style>

      <div className="min-h-screen relative overflow-hidden">
        {/* Dynamic gradient background with mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <div className="absolute inset-0 gradient-mesh-1 opacity-60"></div>
          <div className="absolute inset-0 pattern-noise"></div>
        </div>

        {/* Enhanced floating background elements with vibrant colors */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Primary vibrant blob */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animate-glow"></div>
          
          {/* Emerald accent blob */}
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 rounded-full mix-blend-multiply filter blur-xl opacity-25 animate-blob animation-delay-2000"></div>
          
          {/* Orange vibrant blob */}
          <div className="absolute top-40 left-40 w-96 h-96 bg-gradient-to-br from-orange-400 via-pink-500 to-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
          
          {/* Purple accent blob */}
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-gradient-to-br from-purple-400 via-violet-500 to-fuchsia-500 rounded-full mix-blend-multiply filter blur-2xl opacity-15 animate-blob animation-delay-6000"></div>
          
          {/* Additional floating elements */}
          <div className="absolute top-20 left-1/4 w-32 h-32 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full mix-blend-multiply filter blur-lg opacity-20 animate-float"></div>
          <div className="absolute bottom-20 right-1/4 w-40 h-40 bg-gradient-to-br from-green-300 to-blue-400 rounded-full mix-blend-multiply filter blur-lg opacity-15 animate-float animation-delay-2000"></div>
        </div>

        {/* Enhanced grid pattern overlay with color */}
        <div className="absolute inset-0 pattern-grid opacity-20"></div>
        <div className="absolute inset-0 pattern-dots opacity-10"></div>

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md animate-fade-in">
            {/* Enhanced logo section with floating animation */}
            <div className="flex flex-col items-center mb-8">
              <div className="mb-6 transform hover:scale-110 transition-all duration-500 animate-bounce-in animate-float">
                <DiNutriLogo size="xl" variant="full" className="h-40 md:h-44 filter drop-shadow-2xl" />
              </div>
              
              {/* Professional gradient tagline */}
              <div className="text-center animate-slide-up">
                <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-3 tracking-tight">
                  Nutrição Inteligente
                </h1>
                <p className="text-gray-600 text-base md:text-lg font-medium tracking-wide bg-white/30 backdrop-blur-sm px-4 py-2 rounded-full">
                  🥗 Sua plataforma completa de gestão nutricional 🌟
                </p>
              </div>
            </div>

            {/* Enhanced login card with glass morphism */}
            <Card className="shadow-colorful border-0 glass-morphism animate-scale-in backdrop-blur-2xl">
              <CardHeader className="space-y-6 text-center pb-6">
                <div className="space-y-2">
                  <CardTitle className="text-2xl md:text-3xl font-bold gradient-text">
                    🚀 Bem-vindo de volta! 
                  </CardTitle>
                  <CardDescription className="text-gray-700 font-medium">
                    ✨ Acesse sua conta para continuar sua jornada
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-800 font-bold text-sm flex items-center gap-2">
                            📧 Email
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="seu@email.com"
                              className="h-12 text-base border-2 border-purple-200 focus:border-purple-400 focus:ring-purple-400 bg-white/50 backdrop-blur-sm"
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
                          <FormLabel className="text-gray-800 font-bold text-sm flex items-center gap-2">
                            🔒 Senha
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="h-12 text-base pr-12 border-2 border-purple-200 focus:border-purple-400 focus:ring-purple-400 bg-white/50 backdrop-blur-sm"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-12 px-3 hover:bg-purple-100/50 text-gray-600 hover:text-purple-600 transition-colors"
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
                      variant="vibrant"
                      size="lg"
                      className="w-full font-bold text-base h-14 text-lg shadow-primary"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          🚀 Entrando...
                        </>
                      ) : (
                        <>
                          🎯 Entrar
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Enhanced footer with professional styling */}
            <div className="text-center mt-8 animate-fade-in">
              <p className="text-sm text-gray-600 font-semibold bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                ✨ © 2025 DiNutri. Todos os direitos reservados. 🌟
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}