import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import InstallPWA from "@/components/InstallPWA";
import IosInstallToast from "@/components/IosInstallToast";
import { UpdateNotifier } from "@/components/update-notifier";
import { SplashScreen } from "@/components/ui/splash-screen";
import { useState, useEffect } from "react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import PatientsPage from "@/pages/nutritionist/patients";
import NewPatientPage from "@/pages/nutritionist/new-patient";
import PatientDetailsPage from "@/pages/nutritionist/patient-details";
import EditPatientPage from "@/pages/nutritionist/edit-patient";
import PrescriptionEditorPage from "@/pages/nutritionist/prescription-editor";
import SubscriptionsPage from "@/pages/nutritionist/subscriptions";
import ReportsPage from "@/pages/nutritionist/reports";
import SendNotificationPage from "@/pages/nutritionist/send-notification";
import NotificationsReportPage from "@/pages/nutritionist/notifications-report";
import MessagesReadReportPage from "@/pages/nutritionist/messages-read-report";
import PatientPrescriptionView from "@/pages/patient/prescription-view";
import PatientPrescriptionsList from "@/pages/patient/prescriptions-list";
import PrescriptionPrintPage from "@/pages/patient/prescription-print";
import PatientRegisterPage from "@/pages/patient/patient-register";
import MyPlanPage from "@/pages/patient/my-plan";
import AssessmentsPage from "@/pages/patient/assessments";
import AnamnesePage from "@/pages/public/anamnese";
import FollowUpAnamnesePage from "@/pages/public/follow-up-anamnese";
import AdminDashboard from "@/pages/admin/dashboard";
import CreateUserPage from "@/pages/admin/create-user";
import AdminProfilePage from "@/pages/admin/profile";
import EditUserPage from "@/pages/admin/edit-user";
import PatientDashboard from "@/pages/patient/dashboard";
import PatientProfilePage from "@/pages/patient/profile";
import PatientSupplementsPage from "./pages/patient/supplements";
import PatientDiaryPage from "./pages/patient/diary";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Wrench } from "lucide-react";

function ComingSoonPage({ title }: { title: string }) {
  return (
    <MobileLayout title={title} showBackButton>
      <div className="flex flex-col items-center justify-center p-8 h-[60vh] text-center">
        <div className="w-20 h-20 bg-[#4E9F87]/10 rounded-full flex items-center justify-center mb-6">
          <Wrench className="w-10 h-10 text-[#4E9F87]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Em Breve</h2>
        <p className="text-gray-500">A aba de {title} estará disponível em atualizações futuras do app!</p>
      </div>
    </MobileLayout>
  );
}

function Router() {
  const { isAuthenticated, isLoading, isAdmin, isNutritionist, isPatient } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
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
          <Route path="/subscriptions" component={SubscriptionsPage} />
          <Route path="/reports" component={ReportsPage} />
          <Route path="/notifications/send" component={SendNotificationPage} />
          <Route path="/reports/notifications" component={NotificationsReportPage} />
          <Route path="/reports/messages-read" component={MessagesReadReportPage} />
          <Route path="/notifications/report" component={NotificationsReportPage} />
        </>
      )}

      {/* Rotas de Paciente (já registrado) */}
      {isAuthenticated && isPatient && (
        <>
          <Route path="/dashboard" component={PatientDashboard} />
          <Route path="/my-plan" component={MyPlanPage} />
          <Route path="/assessments" component={AssessmentsPage} />
          <Route path="/patient/prescriptions" component={PatientPrescriptionsList} />
          <Route path="/patient/prescription" component={PatientPrescriptionView} />
          <Route path="/prescriptions/:id/print" component={PrescriptionPrintPage} />
          <Route path="/evolution" component={() => <ComingSoonPage title="Evolução" />} />
          <Route path="/diary" component={PatientDiaryPage} />
          <Route path="/goals" component={() => <ComingSoonPage title="Metas" />} />
          <Route path="/patient/supplements" component={PatientSupplementsPage} />
          <Route path="/exams" component={() => <ComingSoonPage title="Exames" />} />
          <Route path="/guidelines" component={() => <ComingSoonPage title="Orientações" />} />
          <Route path="/profile" component={PatientProfilePage} />
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
  const [showSplash, setShowSplash] = useState(() => {
    // Show splash only on the first load within a browser session
    if (typeof window !== "undefined" && sessionStorage.getItem("splashShown")) return false;
    if (typeof window !== "undefined") sessionStorage.setItem("splashShown", "1");
    return true;
  });

  // Ensure splash is removed if something goes wrong or after hydration
  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => setShowSplash(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  return (
    <QueryClientProvider client={queryClient}>
      {showSplash && <SplashScreen onFinished={() => setShowSplash(false)} />}
      <UpdateNotifier />
      <TooltipProvider>
        <Toaster />
        <Router />
        <InstallPWA />
        <IosInstallToast />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
