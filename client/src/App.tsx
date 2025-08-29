import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import PatientsPage from "@/pages/nutritionist/patients";
import NewPatientPage from "@/pages/nutritionist/new-patient";
import PatientDetailsPage from "@/pages/nutritionist/patient-details";
import PrescriptionEditorPage from "@/pages/nutritionist/prescription-editor";
import PatientPrescriptionView from "@/pages/patient/prescription-view";
import PrescriptionPrintPage from "@/pages/patient/prescription-print";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/patients" component={PatientsPage} />
          <Route path="/patients/new" component={NewPatientPage} />
          <Route path="/patients/:id" component={PatientDetailsPage} />
          <Route path="/prescriptions/:id/edit" component={PrescriptionEditorPage} />
          <Route path="/patient/prescription" component={PatientPrescriptionView} />
          <Route path="/prescriptions/:id/print" component={PrescriptionPrintPage} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
