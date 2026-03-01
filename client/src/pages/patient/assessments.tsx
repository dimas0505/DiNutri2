import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, ClipboardList } from "lucide-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { PatientDocument } from "@shared/schema";

export default function AssessmentsPage() {
  const { data: documents, isLoading } = useQuery<PatientDocument[]>({
    queryKey: ["/api/my-assessments"],
  });
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (url: string, filename: string, id: string) => {
    setDownloadingId(id);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Falha ao baixar o arquivo.");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("[Download] Erro ao baixar arquivo:", error);
      toast({ variant: "destructive", title: "Erro no download", description: "Não foi possível baixar o arquivo. Tente novamente." });
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <MobileLayout title="Anamnese / Avaliações" showBackButton>
      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Arquivos e avaliações enviados pelo seu nutricionista.
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : !documents || documents.length === 0 ? (
          <Card className="border border-border/70">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-medium">Nenhuma avaliação disponível</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Seu nutricionista ainda não enviou avaliações.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="border border-border/70 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">
                        {doc.fileName}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Enviado em {formatDate(doc.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-1">
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    disabled={downloadingId === doc.id}
                    onClick={() => handleDownload(doc.fileUrl, doc.fileName, doc.id)}
                  >
                    <Download className="h-4 w-4" />
                    {downloadingId === doc.id ? "Baixando..." : "Download"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}