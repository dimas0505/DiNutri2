import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import InstallPWA from "@/components/InstallPWA";
import { UpdateNotifier } from "@/components/update-notifier";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import PatientsPage from "@/pages/nutritionist/patients";
import NewPatientPage from "@/pages/nutritionist/new-patient";
import PatientDetailsPage from "@/pages/nutritionist/patient-details";
import EditPatientPage from "@/pages/nutritionist/edit-patient";
import PrescriptionEditorPage from "@/pages/nutritionist/prescription-editor";
import PatientPrescriptionView from "@/pages/patient/prescription-view";
import PrescriptionPrintPage from "@/pages/patient/prescription-print";
import PatientRegisterPage from "@/pages/patient/patient-register";
import AnamnesePage from "@/pages/public/anamnese";
import FollowUpAnamnesePage from "@/pages/public/follow-up-anamnese";
import AdminDashboard from "@/pages/admin/dashboard";
import CreateUserPage from "@/pages/admin/create-user";
import AdminProfilePage from "@/pages/admin/profile";
import EditUserPage from "@/pages/admin/edit-user";

function Router() {
  const { isAuthenticated, isLoading, isAdmin, isNutritionist, isPatient } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        {/* Aponta para o novo GIF na pasta public */}
        <img src="/loading-animation.gif" alt="Carregando..." className="w-64 h-64" />
        <p className="mt-4 text-lg font-semibold text-gray-600">Carregando, por favor aguarde...</p>
      </div>
    );
  }

  return (
    <Switch>
      {/* Rotas Públicas */}
      <Route path="/" component={isAuthenticated ? Home : Landing} />
      <Route path="/anamnese" component={AnamnesePage} />
      <Route path="/anamnese/retorno" component={FollowUpAnamnesePage} />

      {/* Rota de Registro do Paciente (após login com convite) */}
      {isAuthenticated && isPatient && (
        <Route path="/patient/register" component={PatientRegisterPage} />
      )}

      {/* Rotas de Administrador */}
      {isAuthenticated && isAdmin && (
        <>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/create-user" component={CreateUserPage} />
          <Route path="/admin/profile" component={AdminProfilePage} />
          <Route path="/admin/users/:id" component={EditUserPage} />
        </>
      )}

      {/* Rotas de Nutricionista */}
      {isAuthenticated && isNutritionist && (
        <>
          <Route path="/patients" component={PatientsPage} />
          <Route path="/patients/new" component={NewPatientPage} />
          <Route path="/patients/:id" component={PatientDetailsPage} />
          <Route path="/patients/:id/edit" component={EditPatientPage} />
          <Route path="/prescriptions/:id/edit" component={PrescriptionEditorPage} />
        </>
      )}

      {/* Rotas de Paciente (já registrado) */}
      {isAuthenticated && isPatient && (
        <>
          <Route path="/patient/prescription" component={PatientPrescriptionView} />
          <Route path="/prescriptions/:id/print" component={PrescriptionPrintPage} />
        </>
      )}

      {/* Redirecionamento se logado mas tentando acessar rota inválida */}
      {isAuthenticated && (
        <Redirect to="/" />
      )}
      
      {/* Rota 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UpdateNotifier />
      <TooltipProvider>
        <Toaster />
        <Router />
        <InstallPWA />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;