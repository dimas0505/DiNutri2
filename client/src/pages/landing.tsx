import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-primary mb-2">WebDiet</h1>
              <p className="text-muted-foreground">Sistema de Prescrição Nutricional</p>
            </div>
            
            <div className="space-y-6">
              <Button 
                onClick={handleLogin}
                className="w-full py-3 font-medium"
                data-testid="button-login"
              >
                Entrar
              </Button>
              
              <div className="text-center">
                <a href="#" className="text-primary hover:underline text-sm">
                  Esqueci minha senha
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
