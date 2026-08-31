/**
 * Centralized pricing constants and logic for booking calculations
 */

export const PRICING_CONFIG = {
    EQUIPMENT: {
        z6: 350000,
        z60: 550000,
        m7: 650000,
        mx3: 600000,
    },
    EXTRAS: {
        cart: 50000,
        printer: 120000,
    },
    LOGISTICS: {
        shipping: 50000,
    }
};

/**
 * Calculates the number of days for a booking (inclusive)
 */
export const calculateDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set both to midnight for consistency
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
};

/**
 * Calculates the total price for a booking
 */
export const calculateTotalPrice = (params: {
    quantityZ6: number;
    quantityZ60: number;
    quantityM7: number;
    quantityMx3?: number;
    includeCart: boolean;
    includePrinter: boolean;
    days: number;
    includeShipping?: boolean;
}): number => {
    const {
        quantityZ6,
        quantityZ60,
        quantityM7,
        quantityMx3 = 0,
        includeCart,
        includePrinter,
        days,
        includeShipping = true
    } = params;

    let total = 0;
    
    // Equipment costs (per day)
    total += quantityZ6 * PRICING_CONFIG.EQUIPMENT.z6 * days;
    total += quantityZ60 * PRICING_CONFIG.EQUIPMENT.z60 * days;
    total += quantityM7 * PRICING_CONFIG.EQUIPMENT.m7 * days;
    total += quantityMx3 * PRICING_CONFIG.EQUIPMENT.mx3 * days;
    
    // Extras
    if (includeCart) total += PRICING_CONFIG.EXTRAS.cart;
    if (includePrinter) total += PRICING_CONFIG.EXTRAS.printer;
    
    // Shipping
    if (includeShipping) total += PRICING_CONFIG.LOGISTICS.shipping;
    
    return total;
};
