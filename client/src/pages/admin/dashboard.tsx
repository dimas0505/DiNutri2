import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Users, Shield, UserPlus, Settings, Edit, TrendingUp, Activity, Heart, Star, BarChart3, Calendar, Database, Globe } from "lucide-react";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 relative">
      {/* Background pattern */}
      <div className="absolute inset-0 pattern-dots opacity-5"></div>
      <div className="absolute inset-0 gradient-mesh-1 opacity-30"></div>
      
      <Header
        title="🏢 Painel Administrativo"
        rightElement={
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setLocation("/admin/profile")}
              className="flex items-center space-x-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50"
              data-testid="button-profile"
            >
              <Settings className="h-4 w-4 text-purple-600" />
              <span className="font-semibold">Meu Perfil</span>
            </Button>
            <Button
              variant="vibrant"
              onClick={() => setLocation("/admin/create-user")}
              className="flex items-center space-x-2 shadow-primary"
              data-testid="button-create-user"
            >
              <UserPlus className="h-4 w-4" />
              <span>✨ Criar Usuário</span>
            </Button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto p-4 lg:p-6 relative z-10">
        {/* Enhanced Statistics Cards with vibrant colors and icons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="gradient-primary text-white border-0 shadow-primary transform hover:scale-105 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Total de Usuários
              </CardTitle>
              <TrendingUp className="h-6 w-6 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{userStats.total}</div>
              <p className="text-xs text-white/80 mt-1">
                👥 Usuários ativos na plataforma
              </p>
            </CardContent>
          </Card>

          <Card className="gradient-destructive text-white border-0 shadow-destructive transform hover:scale-105 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Administradores
              </CardTitle>
              <Star className="h-6 w-6 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{userStats.admins}</div>
              <p className="text-xs text-white/80 mt-1">
                🛡️ Gestores do sistema
              </p>
            </CardContent>
          </Card>

          <Card className="gradient-emerald text-white border-0 shadow-success transform hover:scale-105 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Nutricionistas
              </CardTitle>
              <Activity className="h-6 w-6 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{userStats.nutritionists}</div>
              <p className="text-xs text-white/80 mt-1">
                🥗 Profissionais especializados
              </p>
            </CardContent>
          </Card>

          <Card className="gradient-orange text-white border-0 shadow-warning transform hover:scale-105 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Pacientes
              </CardTitle>
              <BarChart3 className="h-6 w-6 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{userStats.patients}</div>
              <p className="text-xs text-white/80 mt-1">
                👤 Pessoas em acompanhamento
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Users List */}
        <Card className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="text-xl font-bold flex items-center gap-3">
              <Database className="h-6 w-6" />
              📊 Usuários do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-100 to-purple-50">
                  <tr>
                    <th className="text-left p-4 font-bold text-gray-700 flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      👤 Usuário
                    </th>
                    <th className="text-left p-4 font-bold text-gray-700">
                      🏷️ Tipo
                    </th>
                    <th className="text-left p-4 font-bold text-gray-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      📅 Criado em
                    </th>
                    <th className="text-left p-4 font-bold text-gray-700">
                      ⚙️ Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center">
                        <div className="flex flex-col items-center space-y-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                          <p className="text-purple-600 font-semibold">🔄 Carregando usuários...</p>
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center">
                        <div className="flex flex-col items-center space-y-2">
                          <Users className="h-12 w-12 text-gray-400" />
                          <p className="text-gray-500 font-medium">📭 Nenhum usuário encontrado.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-200">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                              {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-gray-800 flex items-center gap-2">
                                {user.firstName} {user.lastName}
                                <span className="text-xs">✨</span>
                              </div>
                              <div className="text-sm text-gray-600 flex items-center gap-1">
                                <span>📧</span>
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant={getRoleBadgeVariant(user.role)}
                            className="font-semibold"
                          >
                            {user.role === 'admin' && '🛡️'} 
                            {user.role === 'nutritionist' && '🥗'} 
                            {user.role === 'patient' && '👤'} 
                            {getRoleLabel(user.role)}
                          </Badge>
                        </td>
                        <td className="p-4 text-gray-600 font-medium">
                          <span className="flex items-center gap-2">
                            📅 {user.createdAt && formatDate(user.createdAt.toString())}
                          </span>
                        </td>
                        <td className="p-4">
                          <Button 
                            variant="emerald" 
                            size="sm"
                            onClick={() => setLocation(`/admin/users/${user.id}`)}
                            className="flex items-center space-x-2 shadow-success"
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Edit className="h-4 w-4" />
                            <span>✏️ Editar</span>
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