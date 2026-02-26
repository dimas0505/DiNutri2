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
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 8s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>

      <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
        {/* Left Column: Branding (Desktop) */}
        <div className="hidden lg:flex flex-col items-center justify-center relative bg-emerald-50/50 overflow-hidden p-12">
          {/* Decorative Blobs */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-teal-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-32 left-20 w-96 h-96 bg-green-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
          </div>

          <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-lg">
            <div className="transform hover:scale-105 transition-transform duration-500">
               <DiNutriLogo size="xl" variant="full" className="h-48 drop-shadow-lg" />
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-emerald-950">
                Nutrição Inteligente
              </h1>
              <p className="text-lg text-emerald-800/80 leading-relaxed">
                Transforme a gestão do seu consultório.
                Planejamento alimentar, acompanhamento de pacientes e anamneses em um só lugar.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="flex items-center justify-center p-4 lg:p-8 bg-background relative">
           {/* Mobile Background touches */}
           <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-100/50 rounded-full filter blur-3xl opacity-50"></div>
           </div>

           <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px] relative z-10">
             {/* Mobile Branding */}
             <div className="flex flex-col items-center space-y-4 lg:hidden mb-4">
               <DiNutriLogo size="lg" />
               <div className="text-center">
                 <h1 className="text-2xl font-bold text-emerald-950">Nutrição Inteligente</h1>
                 <p className="text-sm text-muted-foreground">Sua plataforma de gestão nutricional</p>
               </div>
             </div>

             <Card className="border shadow-lg bg-white/90 backdrop-blur-sm">
               <CardHeader className="space-y-1 pb-6">
                 <CardTitle className="text-2xl font-bold text-center">Bem-vindo de volta!</CardTitle>
                 <CardDescription className="text-center">
                   Acesse sua conta para continuar
                 </CardDescription>
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
                             <Input
                               type="email"
                               placeholder="seu@email.com"
                               className="h-11"
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
                           <FormLabel>Senha</FormLabel>
                           <FormControl>
                             <div className="relative">
                               <Input
                                 type={showPassword ? "text" : "password"}
                                 placeholder="••••••••"
                                 className="h-11 pr-10"
                                 {...field}
                               />
                               <Button
                                 type="button"
                                 variant="ghost"
                                 size="sm"
                                 className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent text-muted-foreground"
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
                       className="w-full h-11 text-base font-semibold mt-2"
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
               </CardContent>
             </Card>

             <p className="px-8 text-center text-sm text-muted-foreground">
               © 2025 DiNutri. Todos os direitos reservados.
             </p>
           </div>
        </div>
      </div>
    </>
  );
}