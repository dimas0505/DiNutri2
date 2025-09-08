import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

// Define a type for the user object expected from the API
interface AuthenticatedUser {
id: string;
email: string;
firstName?: string;
lastName?: string;
profileImageUrl?: string;
role: 'admin' | 'nutritionist' | 'patient'; // <-- ADICIONADO "admin"
patientProfile?: { id: string };
}

export function useAuth() {
const queryClient = useQueryClient();
const [, setLocation] = useLocation();

const { data: user, isLoading, error } = useQuery<AuthenticatedUser | null>({
queryKey: ["/api/auth/user"],
retry: false,
});

const logout = async () => {
  try {
    // Remoção de artefatos de sessão (localStorage/sessionStorage)
    // Limpar qualquer dado de autenticação armazenado localmente
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('authToken');

    // Invalidar todos os caches do React Query relacionados ao usuário
    queryClient.clear();
    
    // Remover dados específicos de autenticação do cache
    queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
    queryClient.removeQueries({ queryKey: ["/api/patients"] });
    queryClient.removeQueries({ queryKey: ["/api/prescriptions"] });
    
    // Fazer requisição para o backend para limpar cookies de sessão
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include"
    });

    // Redirecionar para a página de login
    setLocation("/");
  } catch (error) {
    console.error("Erro durante o logout:", error);
    // Mesmo em caso de erro, redirecionar para a página de login
    setLocation("/");
  }
};

return {
user,
isLoading,
error,
isAuthenticated: !!user,
isAdmin: user?.role === 'admin', // <-- ADICIONADO
isNutritionist: user?.role === 'nutritionist',
isPatient: user?.role === 'patient',
logout,
};
}