import { useQuery } from "@tanstack/react-query";
// Define a type for the user object expected from the API
interface AuthenticatedUser {
id: string;
email: string;
firstName?: string;
lastName?: string;
profileImageUrl?: string;
role: 'nutritionist' | 'patient';
patientProfile?: { id: string };
}
export function useAuth() {
const { data: user, isLoading, error } = useQuery<AuthenticatedUser | null>({
queryKey: ["/api/auth/user"],
retry: false,
});
return {
user,
isLoading,
error,
isAuthenticated: !!user,
isNutritionist: user?.role === 'nutritionist',
isPatient: user?.role === 'patient',
};
}