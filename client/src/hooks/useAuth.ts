import { useQuery } from "@tanstack/react-query";
// Define a type for the user object expected from the API
interface AuthenticatedUser {
id: string;
email: string;
firstName?: string;
lastName?: string;
profileImageUrl?: string;
role: 'admin' | 'nutritionist' | 'patient' | 'fito';
patientProfile?: { id: string };
}
export function useAuth() {
const { data: user, isLoading, error } = useQuery<AuthenticatedUser | null>({
queryKey: ["/api/auth/user"],
retry: false,
});

const logout = () => {
  // Redireciona diretamente para a rota de logout que fará o redirecionamento
  window.location.href = "/api/logout";
};

return {
user,
isLoading,
error,
isAuthenticated: !!user,
isAdmin: user?.role === 'admin',
isNutritionist: user?.role === 'nutritionist',
isPatient: user?.role === 'patient',
isFito: user?.role === 'fito',
logout,
};
}