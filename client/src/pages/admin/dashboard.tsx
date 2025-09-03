import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Users, Shield, UserPlus, Settings, Edit } from "lucide-react";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DefaultMobileDrawer } from "@/components/layout/mobile-layout";
import type { User } from "@shared/schema";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const userStats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    nutritionists: users.filter(u => u.role === 'nutritionist').length,
    patients: users.filter(u => u.role === 'patient').length,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'nutritionist': return 'default';
      case 'patient': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'nutritionist': return 'Nutricionista';
      case 'patient': return 'Paciente';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Painel Administrativo"
        drawerContent={<DefaultMobileDrawer />}
      />
      
      <main className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="flex justify-end mb-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setLocation("/admin/profile")}
              className="flex items-center space-x-2"
              data-testid="button-profile"
            >
              <Settings className="h-4 w-4" />
              <span>Meu Perfil</span>
            </Button>
            <Button
              onClick={() => setLocation("/admin/create-user")}
              className="flex items-center space-x-2"
              data-testid="button-create-user"
            >
              <UserPlus className="h-4 w-4" />
              <span>Criar Usuário</span>
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <Shield className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.admins}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nutricionistas</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.nutritionists}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pacientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.patients}</div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium text-muted-foreground">Usuário</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Criado em</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-muted-foreground">Carregando usuários...</p>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center">
                        <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          <div>
                            <div className="font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {getRoleLabel(user.role)}
                          </Badge>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {user.createdAt && formatDate(user.createdAt.toString())}
                        </td>
                        <td className="p-4">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setLocation(`/admin/users/${user.id}`)}
                            className="flex items-center space-x-2"
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Edit className="h-4 w-4" />
                            <span>Editar</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}