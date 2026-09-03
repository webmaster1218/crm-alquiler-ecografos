import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import TestContractPDF, { ContractData } from '../../../../components/pdf/TestContractPDF';
import { calculateDays } from '../../../../lib/pricing';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      client_name,
      document_number = '',
      tax_id = '',
      monthly_value = 0,
      start_date = '',
      end_date = '',
      full_address = '',
      client_type = 'Médico independiente',
      quantity_z6 = 0,
      quantity_z60 = 0,
      quantity_m7 = 0,
      quantity_mx3 = 0,
      include_cart = false,
      include_printer = false,
      selected_transducers = [],
      equipment_summary = '',
      download = false
    } = body;

    if (!client_name) {
      return NextResponse.json(
        { error: 'El parámetro client_name es obligatorio.' },
        { status: 400 }
      );
    }

    // Calcular días o término
    let termText = '1 DÍA';
    if (start_date && end_date) {
      const days = calculateDays(start_date, end_date);
      termText = `${days} ${days === 1 ? 'DÍA' : 'DÍAS'}`;
    }

    // Construir resumen de equipo si no fue provisto
    let equipmentText = equipment_summary;
    if (!equipmentText) {
      const parts: string[] = [];
      if (Number(quantity_z6) > 0) parts.push(`• ${quantity_z6}x Ecógrafo Mindray Z6`);
      if (Number(quantity_z60) > 0) parts.push(`• ${quantity_z60}x Ecógrafo Mindray Z60`);
      if (Number(quantity_m7) > 0) parts.push(`• ${quantity_m7}x Ecógrafo Mindray M7`);
      if (Number(quantity_mx3) > 0) parts.push(`• ${quantity_mx3}x Ecógrafo Mindray MX3`);
      if (include_cart) parts.push('• Base rodable (carrito)');
      if (include_printer) parts.push('• Impresora Sony');
      if (selected_transducers && selected_transducers.length > 0) {
        parts.push(`• Transductores: ${selected_transducers.join(', ')}`);
      }
      equipmentText = parts.join('\n') || 'Ecógrafo Médico Especializado';
    }

    const contractData: ContractData = {
      clientName: String(client_name).toUpperCase(),
      documentNumber: String(document_number || tax_id || 'N/A'),
      monthlyValue: String(monthly_value || 0),
      equipment: equipmentText,
      startDate: start_date || new Date().toISOString().split('T')[0],
      fullAddress: full_address || 'Medellín, Colombia',
      clientType: client_type,
      taxId: String(tax_id || document_number || 'N/A'),
      term: termText
    };

    // Renderizar PDF con @react-pdf/renderer
    const doc = React.createElement(TestContractPDF, { data: contractData }) as any;
    const pdfStream = await pdf(doc).toBuffer();
    
    // Convertir el stream/buffer a Buffer estándar de Node.js
    const chunks: Uint8Array[] = [];
    if (typeof (pdfStream as any)[Symbol.asyncIterator] === 'function') {
      for await (const chunk of (pdfStream as any)) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
    } else {
      chunks.push(pdfStream as any);
    }
    const finalBuffer = Buffer.concat(chunks);

    // Si se solicita descarga directa (Buffer binario PDF)
    if (download) {
      const fileName = `Contrato_${client_name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      return new NextResponse(finalBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': finalBuffer.length.toString(),
        },
      });
    }

    // Por defecto, retornar JSON con base64 para integraciones con n8n, webhooks, WhatsApp bots, etc.
    const pdfBase64 = finalBuffer.toString('base64');

    return NextResponse.json({
      success: true,
      filename: `Contrato_${client_name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      contractData,
      pdfBase64,
    });

  } catch (err: any) {
    console.error('Error generating contract PDF:', err);
    return NextResponse.json(
      { error: 'Error generando el PDF del contrato', message: err.message },
      { status: 500 }
    );
  }
}
