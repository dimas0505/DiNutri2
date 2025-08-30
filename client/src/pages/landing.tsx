import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DiNutriLogo } from "@/components/ui/dinutri-logo";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/20 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-8 -left-8 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-sm animate-fade-in">
          <CardContent className="p-8">
            <div className="text-center mb-8 space-y-6">
              {/* Logo */}
              <div className="flex justify-center animate-bounce-in">
                <DiNutriLogo size="xl" variant="icon" />
              </div>
              
              {/* Brand and tagline */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  DiNutri
                </h1>
                <p className="text-muted-foreground font-medium">
                  Sistema de Prescrição Nutricional
                </p>
                <div className="w-16 h-1 bg-gradient-to-r from-primary to-accent mx-auto rounded-full" />
              </div>
            </div>
            
            <div className="space-y-6">
              <Button 
                onClick={handleLogin}
                className="w-full py-3 font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                data-testid="button-login"
              >
                Entrar
              </Button>
              
              <div className="text-center">
                <a 
                  href="#" 
                  className="text-primary hover:text-accent text-sm font-medium transition-colors duration-200 hover:underline underline-offset-4"
                >
                  Esqueci minha senha
                </a>
              </div>
              
              {/* Professional tagline */}
              <div className="text-center pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Tecnologia avançada para nutricionistas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
