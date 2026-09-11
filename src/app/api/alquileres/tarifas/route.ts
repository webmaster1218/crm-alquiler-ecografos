import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/apiKeyAuth';
import { PRICING_CONFIG } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Validación de seguridad por API Key
    const authCheck = await validateApiKey(request);
    if (!authCheck.valid) {
      return NextResponse.json(
        { error: authCheck.error || 'No autorizado' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      moneda: 'COP',
      equipos: {
        z6: {
          modelo: 'Mindray Z6',
          tarifa_dia: PRICING_CONFIG.EQUIPMENT.z6,
          enfoque: 'Ecografía general, obstetricia, ginecología, control prenatal y pequeñas partes.',
          sondas_incluidas: ['Convexo', 'Lineal', 'Transvaginal/Endocavitario'],
          autonomia_minutos: 90,
          peso_kg: 6.5
        },
        z60: {
          modelo: 'Mindray Z60',
          tarifa_dia: PRICING_CONFIG.EQUIPMENT.z60,
          enfoque: 'Doppler color avanzado, evaluación vascular periférica, cardiología general y obstetricia de alta definición.',
          sondas_incluidas: ['Convexo', 'Lineal', 'Endocavitaria'],
          caracteristicas: ['Monitor 15 pulgadas', 'Algoritmos iClear, iBeam e iTouch', 'Batería 100+ min'],
          recomendado: true
        },
        m7: {
          modelo: 'Mindray M7',
          tarifa_dia: PRICING_CONFIG.EQUIPMENT.m7,
          enfoque: 'Multiespecialidad de alta gama, 3D y 4D volumétrico obstétrico, estudios cardíacos y vasculares profundos.',
          sondas_incluidas: ['Transductor Convexo', 'Sonda Volumétrica 4D Transvaginal/Abdominal']
        },
        mx3: {
          modelo: 'Mindray MX3',
          tarifa_dia: PRICING_CONFIG.EQUIPMENT.mx3,
          enfoque: 'Gama premium portátil de última generación, procesamiento ultra rápido y diseño ergonómico ultraliviano para brigadas de alta exigencia.'
        }
      },
      accesorios: {
        carrito: {
          nombre: 'Carrito rodable de transporte clínico',
          tarifa_dia: PRICING_CONFIG.EXTRAS.cart
        },
        impresora: {
          nombre: 'Impresora térmica de alta resolución con papel de prueba',
          tarifa_dia: PRICING_CONFIG.EXTRAS.printer
        }
      },
      logistica: {
        flete_fijo: PRICING_CONFIG.LOGISTICS.shipping,
        franjas_entrega: [
          'Mañana franja 1: 7:00 AM a 8:00 AM',
          'Mañana franja 2: 8:00 AM a 9:00 AM',
          'Mañana franja 3: 9:00 AM a 10:00 AM'
        ],
        franjas_recogida: [
          'Tarde franja 1: 5:00 PM a 6:00 PM',
          'Tarde franja 2: 6:00 PM a 7:00 PM'
        ],
        despacho_medellin: 'Mismo día confirmando antes de las 12:00 PM',
        despacho_nacional: '24 a 48 horas hábiles'
      },
      descuentos: {
        largo_plazo: 'Alquileres mayores a 30 días continuos aplican a descuento corporativo con tarifa mensual a la medida.'
      }
    });
  } catch (err: any) {
    console.error('Error in /api/alquileres/tarifas:', err);
    return NextResponse.json(
      { error: 'Error interno al consultar tarifas', message: err.message },
      { status: 500 }
    );
  }
}
