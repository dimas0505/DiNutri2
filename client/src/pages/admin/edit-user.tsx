import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { MobileLayout, DefaultMobileDrawer } from "@/components/layout/mobile-layout";
import type { User } from "@shared/schema";

const updateUserSchema = z.object({
  firstName: z.string().min(1, "Nome é obrigatório."),
  lastName: z.string().min(1, "Sobrenome é obrigatório."),
  email: z.string().email("Email inválido."),
  role: z.enum(["admin", "nutritionist", "patient"], {
    required_error: "Selecione um tipo de usuário.",
  }),
});

const changePasswordSchema = z.object({
  newPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória."),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type UpdateUserFormData = z.infer<typeof updateUserSchema>;
type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// Tipagem para dependencies
interface UserDependencies {
  hasPatients: boolean;
  hasPrescriptions: boolean;
  hasInvitations: boolean;
  canDelete: boolean;
}

interface EditUserPageProps {
  params: { id: string };
}

export default function EditUserPage({ params }: EditUserPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/admin/users", params.id],
  });

  const { data: dependencies, isLoading: loadingDependencies } = useQuery<UserDependencies>({
    queryKey: ["/api/admin/users", params.id, "dependencies"],
    enabled: !!user && user.role !== 'admin' && user.id !== currentUser?.id,
  });

  const userForm = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: undefined,
    },
  });

  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Atualizar o formulário quando os dados do usuário chegarem
  useEffect(() => {
    if (user) {
      userForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        role: user.role as "admin" | "nutritionist" | "patient",
      });
    }
  }, [user, userForm]);

  const updateUserMutation = useMutation({
    mutationFn: (data: UpdateUserFormData) => 
      apiRequest("PUT", `/api/admin/users/${params.id}`, data),
    onSuccess: () => {
      toast({
        title: "Usuário atualizado com sucesso!",
        description: "As informações do usuário foram atualizadas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", params.id] });
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar usuário:", error);
      const errorMessage = error.message.includes("409")
        ? "Este email já está em uso por outro usuário."
        : "Não foi possível atualizar o usuário. Tente novamente.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordFormData) => 
      apiRequest("PUT", `/api/admin/users/${params.id}/password`, {
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      toast({
        title: "Senha alterada com sucesso!",
        description: "A senha do usuário foi atualizada.",
      });
      passwordForm.reset();
    },
    onError: (error: any) => {
      console.error("Erro ao alterar senha:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar a senha. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/admin/users/${params.id}`),
    onSuccess: () => {
      toast({
        title: "Usuário excluído com sucesso!",
        description: "O usuário foi removido do sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setLocation("/admin");
    },
    onError: (error: any) => {
      console.error("Erro ao excluir usuário:", error);
      let errorMessage = "Não foi possível excluir o usuário. Tente novamente.";
      
      if (error.message.includes("409")) {
        // Erro de dependência
        try {
          const errorBody = JSON.parse(error.message.split(": ")[1] || "{}");
          errorMessage = errorBody.message || "Este usuário possui dados associados que impedem a exclusão.";
        } catch {
          errorMessage = "Este usuário possui dados associados que impedem a exclusão.";
        }
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onUpdateUser = (data: UpdateUserFormData) => {
    updateUserMutation.mutate(data);
  };

  const onChangePassword = (data: ChangePasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

  const handleDeleteUser = () => {
    deleteUserMutation.mutate();
    setShowDeleteDialog(false);
  };

  const isCurrentUser = currentUser?.id === params.id;
  const isAdminUser = user?.role === 'admin';
  const canDelete = !isCurrentUser && !isAdminUser && (dependencies?.canDelete ?? false);

  const renderDeleteButton = () => {
    if (isCurrentUser || isAdminUser) return null;
    return (
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogTrigger asChild>
          <Button 
            variant="destructive" 
            size="sm"
            disabled={!canDelete || loadingDependencies}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {loadingDependencies ? "Verificando..." : "Excluir Usuário"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir o usuário <strong>{user?.firstName} {user?.lastName}</strong>?
              {dependencies?.hasPatients && (
                <div className="mt-2 p-2 bg-yellow-100 rounded text-yellow-800">
                  ⚠️ Este usuário possui pacientes associados. A exclusão não será possível.
                </div>
              )}
              {dependencies?.hasPrescriptions && (
                <div className="mt-2 p-2 bg-yellow-100 rounded text-yellow-800">
                  ⚠️ Este usuário possui prescrições associadas. A exclusão não será possível.
                </div>
              )}
              {dependencies?.hasInvitations && !dependencies?.hasPatients && !dependencies?.hasPrescriptions && (
                <div className="mt-2 p-2 bg-blue-100 rounded text-blue-800">
                  ℹ️ Este usuário possui convites que serão excluídos automaticamente.
                </div>
              )}
              {canDelete && (
                <div className="mt-2 text-red-600">
                  Esta ação não pode ser desfeita.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {canDelete && (
              <AlertDialogAction 
                onClick={handleDeleteUser}
                disabled={deleteUserMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteUserMutation.isPending ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  if (isLoading) {
    return (
      <MobileLayout title="Carregando..." drawerContent={<DefaultMobileDrawer />}>
        <main className="max-w-2xl mx-auto">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </main>
      </MobileLayout>
    );
  }

  if (!user) {
    return (
      <MobileLayout title="Usuário não encontrado" showBack={true} onBack={() => setLocation("/admin")} drawerContent={<DefaultMobileDrawer />}>
        <main className="max-w-2xl mx-auto">
          <p className="text-center text-muted-foreground">Usuário não encontrado.</p>
        </main>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title={`Editar: ${user.firstName} ${user.lastName}`}
      showBack={true}
      onBack={() => setLocation("/admin")}
      drawerContent={<DefaultMobileDrawer />}
    >
      <main className="max-w-2xl mx-auto">
        <div className="flex justify-end mb-4">
          {renderDeleteButton()}
        </div>
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Informações do Usuário</TabsTrigger>
            <TabsTrigger value="password">Alterar Senha</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Usuário</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit(onUpdateUser)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={userForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome do usuário" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={userForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sobrenome</FormLabel>
                            <FormControl>
                              <Input placeholder="Sobrenome do usuário" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={userForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@exemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={userForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Usuário</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo de usuário" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="nutritionist">Nutricionista</SelectItem>
                              <SelectItem value="patient">Paciente</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={updateUserMutation.isPending}
                    >
                      {updateUserMutation.isPending ? "Atualizando..." : "Atualizar Usuário"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha do Usuário</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nova Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Nova Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </MobileLayout>
  );
}