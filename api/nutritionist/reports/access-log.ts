// Vercel serverless function for Excel reports - requires Node.js runtime
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../server/db';
import { eq, desc, sql } from 'drizzle-orm';
import { anamnesisRecords, foodDiaryEntries, prescriptions, users, patients, subscriptions, activityLog } from '../../../shared/schema';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

// Add debugging information for Vercel deployments
console.log('Reports API handler initialized:', {
  nodeVersion: process.version,
  environment: process.env.NODE_ENV,
  runtime: process.env.VERCEL_REGION || 'local'
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // For now, we'll need to simulate authentication since we're bypassing the main Express app
    // In a real deployment, you'd need to implement proper session handling or token-based auth
    console.log('Processing reports request');

    // Basic CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // For demonstration purposes, we'll get the first nutritionist
    // In production, this would be based on the authenticated user
    const nutritionist = await db
      .select()
      .from(users)
      .where(eq(users.role, 'nutritionist'))
      .limit(1);

    if (!nutritionist.length) {
      return res.status(404).json({ error: 'Nutricionista não encontrado' });
    }

    const nutritionistId = nutritionist[0].id;

    console.log('Starting Excel report generation for nutritionist:', nutritionistId);

    // 1. Collect patient data with their latest activities
    const patientData = await db
      .select({
        patientId: patients.id,
        patientName: patients.name,
        patientEmail: users.email,
        planType: subscriptions.planType,
        planStatus: subscriptions.status,
        planExpiresAt: subscriptions.expiresAt,
        lastActivityTimestamp: sql<string>`MAX(${activityLog.createdAt})`,
        lastActivityType: sql<string>`(array_agg(${activityLog.activityType} ORDER BY ${activityLog.createdAt} DESC))[1]`,
      })
      .from(patients)
      .leftJoin(users, eq(patients.userId, users.id))
      .leftJoin(subscriptions, eq(patients.id, subscriptions.patientId))
      .leftJoin(activityLog, eq(patients.userId, activityLog.userId))
      .where(eq(patients.ownerId, nutritionistId))
      .groupBy(patients.id, patients.name, users.email, subscriptions.planType, subscriptions.status, subscriptions.expiresAt)
      .orderBy(desc(sql<string>`MAX(${activityLog.createdAt})`));

    console.log('Found patient data:', patientData.length, 'records');

    // 2. Create Excel workbook with optimized settings for serverless
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DiNutri2';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Use streaming worksheet for better memory management
    const worksheet = workbook.addWorksheet('Relatório de Acesso');

    // 3. Add headers with minimal styling for better performance
    worksheet.columns = [
      { header: 'ID do Paciente', key: 'patientId', width: 20 },
      { header: 'Nome do Paciente', key: 'patientName', width: 25 },
      { header: 'Email', key: 'patientEmail', width: 25 },
      { header: 'Plano', key: 'planType', width: 12 },
      { header: 'Status do Plano', key: 'planStatus', width: 15 },
      { header: 'Vencimento', key: 'planExpiresAt', width: 15 },
      { header: 'Último Acesso', key: 'lastActivityTimestamp', width: 20 },
      { header: 'Última Atividade', key: 'lastActivityType', width: 30 },
    ];
    
    // Minimal header styling for better performance
    worksheet.getRow(1).font = { bold: true };

    // 4. Add data with memory-efficient processing
    const processedData = [];
    
    // Process in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < patientData.length; i += batchSize) {
      const batch = patientData.slice(i, i + batchSize);
      const processedBatch = batch.map(patient => ({
        patientId: patient.patientId || '',
        patientName: patient.patientName || 'N/A',
        patientEmail: patient.patientEmail || 'N/A',
        planType: patient.planType || 'Free',
        planStatus: patient.planStatus || 'Inativo',
        planExpiresAt: patient.planExpiresAt ? (() => {
          try {
            return format(new Date(patient.planExpiresAt), 'dd/MM/yyyy');
          } catch (e) {
            return 'Data inválida';
          }
        })() : 'N/A',
        lastActivityTimestamp: patient.lastActivityTimestamp ? (() => {
          try {
            return format(new Date(patient.lastActivityTimestamp), 'dd/MM/yyyy HH:mm:ss');
          } catch (e) {
            return 'Data inválida';
          }
        })() : 'Nenhum acesso registrado',
        lastActivityType: patient.lastActivityType || 'N/A',
      }));
      
      processedData.push(...processedBatch);
    }

    // Add all processed data to the worksheet
    worksheet.addRows(processedData);

    console.log('Excel workbook created successfully with', processedData.length, 'rows');

    // 5. Set headers early for streaming
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio_de_acesso_pacientes.xlsx"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // 6. Use streaming for better memory management
    try {
      // Stream directly to the response instead of creating a buffer first
      await workbook.xlsx.write(res);
      console.log('Excel report streamed successfully');
    } catch (streamError) {
      console.error('Error streaming Excel file:', streamError);
      // If we haven't sent headers yet, we can still send an error
      if (!res.headersSent) {
        res.status(500).json({ 
          message: "Falha ao processar relatório.", 
          error: process.env.NODE_ENV === 'development' ? (streamError instanceof Error ? streamError.message : 'Erro interno') : 'Erro interno'
        });
      }
      throw streamError;
    }

  } catch (error) {
    console.error("Erro detalhado ao gerar relatório de acesso:", error);
    
    // Only send error response if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).json({ 
        message: "Falha ao gerar relatório.", 
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Internal server error') : 'Internal server error'
      });
    } else {
      // If headers were already sent, we can only log the error
      console.error('Cannot send error response, headers already sent');
    }
  }
}