import { supabase } from './supabaseClient';

export interface AvailabilityResult {
    z6: number;
    z60: number;
    m7: number;
    mx3: number;
    available: boolean;
}

// Fallback stock if Supabase fails or table is empty
const DEFAULT_STOCK = {
    z6: 2,
    z60: 1,
    m7: 1,
    mx3: 1
};

/**
 * Fetches the current total inventory from Supabase settings
 */
export async function getTotalStock(): Promise<{ z6: number; z60: number; m7: number; mx3: number }> {
    try {
        if (!supabase) return DEFAULT_STOCK;

        const { data, error } = await supabase
            .from('configuracion_equipos')
            .select('valor')
            .eq('clave', 'inventory')
            .single();

        if (error || !data || !data.valor) {
            console.warn('Inventory setting not found, using default stock');
            return DEFAULT_STOCK;
        }

        return {
            z6: typeof data.valor.z6 === 'number' ? data.valor.z6 : DEFAULT_STOCK.z6,
            z60: typeof data.valor.z60 === 'number' ? data.valor.z60 : DEFAULT_STOCK.z60,
            m7: typeof data.valor.m7 === 'number' ? data.valor.m7 : DEFAULT_STOCK.m7,
            mx3: typeof data.valor.mx3 === 'number' ? data.valor.mx3 : DEFAULT_STOCK.mx3
        };
    } catch (err) {
        console.error('Error fetching total stock:', err);
        return DEFAULT_STOCK;
    }
}

/**
 * Checks availability for equipment in a given date range.
 * Returns the maximum number of units available for each type.
 */
export async function checkAvailability(startDate?: string, endDate?: string, excludeId?: string | number): Promise<AvailabilityResult> {
    try {
        const totalStock = await getTotalStock();

        // If no dates are provided, return the total stock as "available"
        if (!startDate || !endDate || !supabase) {
            return {
                ...totalStock,
                available: totalStock.z6 > 0 || totalStock.z60 > 0 || totalStock.m7 > 0 || totalStock.mx3 > 0
            };
        }

        // Query bookings that overlap with the requested range
        let query = supabase
            .from('bookings')
            .select('quantity_z6, quantity_z60, quantity_m7')
            .filter('status', 'not.in', '(cancelled,completed)')
            .lte('start_date', endDate)
            .gte('end_date', startDate);

        // Exclude the booking being edited so its own stock is not double-counted
        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        const { data: bookings, error } = await query;

        if (error) {
            console.error('Error checking availability:', error?.message, error?.code, error?.details);
            
            // Fallback queries for older tables without m7
            if (error?.message?.includes('quantity_m7') || error?.code === '42703') {
                // Hard fallback: just z6 and z60
                let queryFallback = supabase
                    .from('bookings')
                    .select('quantity_z6, quantity_z60')
                    .filter('status', 'not.in', '(cancelled,completed)')
                    .lte('start_date', endDate)
                    .gte('end_date', startDate);

                if (excludeId) {
                    queryFallback = queryFallback.neq('id', excludeId);
                }

                const { data: bookingsFallback2, error: errorFallback2 } = await queryFallback;

                if (errorFallback2) throw errorFallback2;

                let blockedZ6 = 0, blockedZ60 = 0;
                (bookingsFallback2 || []).forEach(b => {
                    blockedZ6 += (b.quantity_z6 || 0);
                    blockedZ60 += (b.quantity_z60 || 0);
                });
                const av6 = Math.max(0, totalStock.z6 - blockedZ6);
                const av60 = Math.max(0, totalStock.z60 - blockedZ60);
                return { z6: av6, z60: av60, m7: totalStock.m7, mx3: totalStock.mx3, available: av6 > 0 || av60 > 0 };
            }
            throw error;
        }

        // Sum up blocked quantities
        let blockedZ6 = 0;
        let blockedZ60 = 0;
        let blockedM7 = 0;
        let blockedMx3 = 0;

        if (bookings && bookings.length > 0) {
            bookings.forEach(booking => {
                blockedZ6 += (booking.quantity_z6 || 0);
                blockedZ60 += (booking.quantity_z60 || 0);
                blockedM7 += (booking.quantity_m7 || 0);
                // quantity_mx3 is not in bookings table, so it's always 0
            });
        }

        // Query dedicated equipment blocks & maintenance table
        try {
            const { data: blocks, error: blocksErr } = await supabase
                .from('bloqueos_equipos')
                .select('quantity_z6, quantity_z60, quantity_m7, quantity_mx3')
                .lte('start_date', endDate)
                .gte('end_date', startDate);

            if (!blocksErr && blocks && blocks.length > 0) {
                blocks.forEach(b => {
                    blockedZ6 += (b.quantity_z6 || 0);
                    blockedZ60 += (b.quantity_z60 || 0);
                    blockedM7 += (b.quantity_m7 || 0);
                    blockedMx3 += (b.quantity_mx3 || 0);
                });
            }
        } catch {
            // Graceful fallback if bloqueos_equipos table does not exist yet
        }

        // Calculate available stock
        const availableZ6 = Math.max(0, totalStock.z6 - blockedZ6);
        const availableZ60 = Math.max(0, totalStock.z60 - blockedZ60);
        const availableM7 = Math.max(0, totalStock.m7 - blockedM7);
        const availableMx3 = Math.max(0, totalStock.mx3 - blockedMx3);

        return {
            z6: availableZ6,
            z60: availableZ60,
            m7: availableM7,
            mx3: availableMx3,
            available: availableZ6 > 0 || availableZ60 > 0 || availableM7 > 0 || availableMx3 > 0
        };

    } catch (err) {
        console.warn('Availability check failed (Supabase might be paused) - falling back to default stock:', err);
        const fallbackStock = await getTotalStock();
        return {
            ...fallbackStock,
            available: true
        };
    }
}

/**
 * Finds the next available start date for a specific model given a duration.
 * Scans the next 60 days.
 */
export async function getNextAvailableDate(model: 'z6' | 'z60' | 'm7' | 'mx3', durationDays: number): Promise<string | null> {
    try {
        const totalStock = await getTotalStock();
        
        if (!supabase) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
        }

        const today = new Date();
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() + 1);

        const maxDate = new Date(today);
        maxDate.setDate(maxDate.getDate() + 60);

        const { data: bookings } = await supabase
            .from('bookings')
            .select(`start_date, end_date, quantity_${model}`)
            .in('status', ['confirmed', 'pending_delivery', 'delivered', 'pending_pickup'])
            .lte('start_date', maxDate.toISOString())
            .gte('end_date', checkDate.toISOString());

        // Fetch equipment blocks in the same range
        let blocksData: any[] = [];
        try {
            const { data: blocks } = await supabase
                .from('bloqueos_equipos')
                .select(`start_date, end_date, quantity_${model}`)
                .lte('start_date', maxDate.toISOString())
                .gte('end_date', checkDate.toISOString());
            if (blocks) blocksData = blocks;
        } catch {
            // Table might not exist yet
        }

        const activeBookings = bookings || [];
        const stock = totalStock[model];

        while (checkDate <= maxDate) {
            let isWindowAvailable = true;

            for (let i = 0; i < durationDays; i++) {
                const currentDay = new Date(checkDate);
                currentDay.setDate(currentDay.getDate() + i);
                const dateStr = currentDay.toISOString().split('T')[0];

                let usage = 0;
                activeBookings.forEach(b => {
                    if (b.start_date <= dateStr && b.end_date >= dateStr) {
                        usage += (b[`quantity_${model}` as keyof typeof b] as number) || 0;
                    }
                });
                blocksData.forEach(b => {
                    if (b.start_date <= dateStr && b.end_date >= dateStr) {
                        usage += (b[`quantity_${model}` as keyof typeof b] as number) || 0;
                    }
                });

                if (stock - usage <= 0) {
                    isWindowAvailable = false;
                    break;
                }
            }

            if (isWindowAvailable) {
                return checkDate.toISOString().split('T')[0];
            }

            checkDate.setDate(checkDate.getDate() + 1);
        }

        return null;
    } catch (err) {
        console.warn('Next available date check failed - falling back to tomorrow:', err);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }
}
