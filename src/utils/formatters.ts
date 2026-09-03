export function numeroALetras(num: number): string {
    const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    if (num === 0) return 'CERO';
    if (num === 100) return 'CIEN';

    let letras = '';

    if (num >= 1000000) {
        const millones = Math.floor(num / 1000000);
        letras += (millones === 1 ? 'UN MILLON ' : numeroALetras(millones) + ' MILLONES ');
        num %= 1000000;
    }

    if (num >= 1000) {
        const miles = Math.floor(num / 1000);
        letras += (miles === 1 ? 'MIL ' : numeroALetras(miles) + ' MIL ');
        num %= 1000;
    }

    if (num >= 100) {
        letras += (num === 100 ? 'CIEN' : centenas[Math.floor(num / 100)] + ' ');
        num %= 100;
    }

    if (num >= 20) {
        letras += decenas[Math.floor(num / 10)];
        num %= 10;
        if (num > 0) letras += ' Y ' + unidades[num];
    } else if (num >= 10) {
        letras += especiales[num - 10];
    } else if (num > 0) {
        letras += unidades[num];
    }

    return letras.trim().toUpperCase();
}
