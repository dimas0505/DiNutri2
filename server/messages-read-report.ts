import { Express } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import { patients, users, inAppNotifications } from "../shared/schema.js";
import { db } from "./db.js";
import ExcelJS from "exceljs";

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

function formatDateInBrazilTimezone(value: Date | string | null | undefined, includeTime = false): string {
  if (!value) return 'N/A';

  const parsedDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return 'N/A';

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(includeTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }
      : {}),
  });

  return formatter.format(parsedDate);
}

interface MessageReadReportItem {
  patientId: string;
  patientName: string;
  patientEmail: string | null;
  messageTitle: string;
  messageBody: string;
  messageType: string;
  isRead: boolean;
  createdAt: Date | null;
}

export async function setupMessagesReadReportRoute(app: Express): Promise<void> {
  // GET: Relatório de mensagens lidas para o nutricionista
  app.get('/api/nutritionist/reports/messages-read', async (req: any, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Não autorizado' });
      }

      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas nutricionistas.' });
      }

      const nutritionistId = req.user.id;

      // 1. Busca todos os pacientes do nutricionista
      const nutritionistPatients = await db
        .select({
          id: patients.id,
          name: patients.name,
          email: patients.email,
          userId: patients.userId,
        })
        .from(patients)
        .where(eq(patients.ownerId, nutritionistId));

      const patientUserIds = nutritionistPatients
        .map((patient) => patient.userId)
        .filter((userId): userId is string => Boolean(userId));

      // Se não há pacientes com app, retorna vazio
      if (patientUserIds.length === 0) {
        return res.json({
          totals: {
            totalMessages: 0,
            readMessages: 0,
            unreadMessages: 0,
          },
          report: [],
        });
      }

      // 2. Busca todas as mensagens (notificações do tipo 'message') dos pacientes
      const allMessages = await db
        .select({
          id: inAppNotifications.id,
          userId: inAppNotifications.userId,
          title: inAppNotifications.title,
          body: inAppNotifications.body,
          type: inAppNotifications.type,
          isRead: inAppNotifications.isRead,
          createdAt: inAppNotifications.createdAt,
        })
        .from(inAppNotifications)
        .where(
          and(
            inArray(inAppNotifications.userId, patientUserIds),
            eq(inAppNotifications.type, 'message')
          )
        )
        .orderBy(desc(inAppNotifications.createdAt));

      // 3. Monta o relatório combinando dados de pacientes e mensagens
      const reportData: MessageReadReportItem[] = [];

      for (const message of allMessages) {
        const patient = nutritionistPatients.find((p) => p.userId === message.userId);
        if (patient) {
          reportData.push({
            patientId: patient.id,
            patientName: patient.name,
            patientEmail: patient.email,
            messageTitle: message.title,
            messageBody: message.body,
            messageType: message.type,
            isRead: message.isRead,
            createdAt: message.createdAt,
          });
        }
      }

      // 4. Calcula totais
      const totals = {
        totalMessages: reportData.length,
        readMessages: reportData.filter((m) => m.isRead).length,
        unreadMessages: reportData.filter((m) => !m.isRead).length,
      };

      return res.json({
        totals,
        report: reportData,
      });
    } catch (error) {
      console.error('[MessagesReadReport] Erro ao gerar relatório:', error);
      res.status(500).json({ message: 'Falha ao gerar relatório de mensagens.' });
    }
  });

  // GET: Exportar relatório de mensagens lidas em Excel
  app.get('/api/nutritionist/reports/messages-read/export', async (req: any, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Não autorizado' });
      }

      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas nutricionistas.' });
      }

      const nutritionistId = req.user.id;

      // 1. Busca todos os pacientes do nutricionista
      const nutritionistPatients = await db
        .select({
          id: patients.id,
          name: patients.name,
          email: patients.email,
          userId: patients.userId,
        })
        .from(patients)
        .where(eq(patients.ownerId, nutritionistId));

      const patientUserIds = nutritionistPatients
        .map((patient) => patient.userId)
        .filter((userId): userId is string => Boolean(userId));

      // Se não há pacientes com app, retorna arquivo vazio
      if (patientUserIds.length === 0) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Mensagens Lidas');
        worksheet.columns = [
          { header: 'ID do Paciente', key: 'patientId', width: 25 },
          { header: 'Nome do Paciente', key: 'patientName', width: 30 },
          { header: 'Email do Paciente', key: 'patientEmail', width: 30 },
          { header: 'Título da Mensagem', key: 'messageTitle', width: 40 },
          { header: 'Corpo da Mensagem', key: 'messageBody', width: 60 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Data e Hora', key: 'createdAt', width: 25 },
        ];
        worksheet.getRow(1).font = { bold: true };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="relatorio_mensagens_lidas.xlsx"');

        const buffer = await workbook.xlsx.writeBuffer();
        return res.send(buffer);
      }

      // 2. Busca todas as mensagens dos pacientes
      const allMessages = await db
        .select({
          id: inAppNotifications.id,
          userId: inAppNotifications.userId,
          title: inAppNotifications.title,
          body: inAppNotifications.body,
          type: inAppNotifications.type,
          isRead: inAppNotifications.isRead,
          createdAt: inAppNotifications.createdAt,
        })
        .from(inAppNotifications)
        .where(
          and(
            inArray(inAppNotifications.userId, patientUserIds),
            eq(inAppNotifications.type, 'message')
          )
        )
        .orderBy(desc(inAppNotifications.createdAt));

      // 3. Monta os dados para o relatório
      const reportData: any[] = [];

      for (const message of allMessages) {
        const patient = nutritionistPatients.find((p) => p.userId === message.userId);
        if (patient) {
          reportData.push({
            patientId: patient.id,
            patientName: patient.name,
            patientEmail: patient.email || 'N/A',
            messageTitle: message.title,
            messageBody: message.body,
            status: message.isRead ? 'Lida' : 'Não Lida',
            createdAt: formatDateInBrazilTimezone(message.createdAt, true),
          });
        }
      }

      // 4. Cria o arquivo Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Mensagens Lidas');

      worksheet.columns = [
        { header: 'ID do Paciente', key: 'patientId', width: 25 },
        { header: 'Nome do Paciente', key: 'patientName', width: 30 },
        { header: 'Email do Paciente', key: 'patientEmail', width: 30 },
        { header: 'Título da Mensagem', key: 'messageTitle', width: 40 },
        { header: 'Corpo da Mensagem', key: 'messageBody', width: 60 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Data e Hora', key: 'createdAt', width: 25 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5F8F1' },
      };

      reportData.forEach((data) => {
        worksheet.addRow(data);
      });

      // Ajusta a largura das colunas para o conteúdo
      worksheet.columns.forEach((column) => {
        if (column.header === 'Corpo da Mensagem') {
          column.width = 60;
          // Ativa quebra de texto para a coluna de corpo
          worksheet.getColumn(column.key as string).alignment = {
            wrapText: true,
            vertical: 'top',
          };
        }
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="relatorio_mensagens_lidas.xlsx"');

      const buffer = await workbook.xlsx.writeBuffer();
      res.send(buffer);
    } catch (error) {
      console.error('[MessagesReadReport] Erro ao exportar relatório:', error);
      res.status(500).json({ message: 'Falha ao exportar relatório de mensagens.' });
    }
  });
}
