import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Svg, Circle, Path, G } from '@react-pdf/renderer';
import { numeroALetras } from '../../utils/formatters';


// Define styles for the PDF
const styles = StyleSheet.create({
    page: {
        paddingTop: 40,
        paddingBottom: 90, // Leave room for absolute footer
        paddingHorizontal: 50,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#000',
    },
    // Background Watermark
    watermarkContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1,
    },
    watermarkImage: {
        width: 450,
    },
    // Header
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    logo: {
        width: 180,
    },
    titleSection: {
        textAlign: 'center',
        marginBottom: 20,
    },
    titleLine: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    dateLine: {
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    textBlock: {
        marginBottom: 8,
        lineHeight: 1.2,
        textAlign: 'justify',
        paddingHorizontal: 10,
    },
    bold: {
        fontWeight: 'bold',
        fontFamily: 'Helvetica-Bold',
    },
    itemSpace: {
        marginBottom: 2,
    },
    signatures: {
        flexDirection: 'row',
        marginTop: 30,
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    signatureBlock: {
        width: '45%',
    },
    signatureLine: {
        borderTopWidth: 1,
        borderTopColor: '#000',
        paddingTop: 5,
        marginTop: 30,
        marginBottom: 3,
    },
    signatureText: {
        fontSize: 10,
        lineHeight: 1.1,
    },
    // Footer fixed at bottom
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    footerTopBar: {
        backgroundColor: '#0a161e',
        height: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerTopText: {
        color: '#ffffff',
        fontSize: 9,
        letterSpacing: 2,
    },
    footerBottomBar: {
        backgroundColor: '#0070c0',
        height: 45,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
    },
    footerIconWrapper: {
        marginRight: 6,
    },
    footerBottomText: {
        color: '#ffffff',
        fontSize: 9,
    }
});

export interface ContractData {
    clientName: string;
    documentNumber: string;
    monthlyValue: string;
    equipment: string;
    startDate: string;
    fullAddress: string;
    clientType: string;
    taxId: string;
    term: string;
}

interface TestContractPDFProps {
    data: ContractData;
}

// Helper to draw the diagonal lines pattern
// Removed in favor of provided image

const TestContractPDF: React.FC<TestContractPDFProps> = ({ data }) => {
    // Current Date Formatter
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('es-CO', { month: 'long' });
    const year = today.getFullYear();

    // Numeric value handling
    const numericValue = Number(data.monthlyValue.replace(/\D/g, '')) || 0;
    const formattedValue = numericValue.toLocaleString('es-CO');

    return (
        <Document title="Contrato de Alquiler">
            <Page size="LETTER" style={styles.page}>

                {/* Watermark Logo Fixed in Background */}
                <View style={styles.watermarkContainer} fixed>
                    <Image src="/images/imagenes del contrato/fondo medio.png" style={styles.watermarkImage} />
                </View>

                {/* Header Area */}
                <View style={styles.headerContainer} fixed>
                    <Image src="/images/imagenes del contrato/logo arriba a la izquierda.png" style={styles.logo} />
                    <Image src="/images/imagenes del contrato/logo arriba a derecha.png" style={{ width: 140 }} />
                </View>

                {/* Titles */}
                <View style={styles.titleSection}>
                    <Text style={[styles.titleLine, styles.bold]}>CONTRATO DE ALQUILER</Text>
                    <Text style={[styles.titleLine, styles.bold]}>EQUIPOS MÉDICOS</Text>
                    <Text style={[styles.titleLine, styles.bold]}>C-01</Text>
                </View>

                {/* Date & Parties Info */}
                <View style={styles.dateLine}>
                    <Text style={styles.itemSpace}>Medellín, {month.toUpperCase()} {day} DE {year}</Text>
                    <Text style={styles.itemSpace}>Arrendador: <Text style={styles.bold}>ECO ESPECIALIZADA SAS</Text></Text>
                    <Text style={styles.itemSpace}>Arrendatario: <Text style={styles.bold}>{(data.clientName || '__________________').toUpperCase()}</Text></Text>
                </View>

                <View style={styles.textBlock}>
                    <Text>Objeto: Conceder el goce de Equipos Médicos denominados:</Text>
                </View>

                {/* Equipment List with Bullet Points */}
                <View style={[styles.textBlock, { marginLeft: 20 }]}>
                    {data.equipment ? data.equipment.split('\n').filter(item => item.trim() !== '').map((item, index) => (
                        <Text key={index} style={styles.itemSpace}>
                            • <Text style={styles.bold}>{item.trim()}</Text>
                        </Text>
                    )) : (
                        <>
                            <Text style={styles.itemSpace}>• <Text style={styles.bold}>Ecógrafo Z6</Text></Text>
                            <Text style={styles.itemSpace}>• <Text style={styles.bold}>Transductor Convexo</Text></Text>
                            <Text style={styles.itemSpace}>• <Text style={styles.bold}>Transductor Endocavitario</Text></Text>
                            <Text style={styles.itemSpace}>• <Text style={styles.bold}>Carrito</Text></Text>
                            <Text style={styles.itemSpace}>• <Text style={styles.bold}>______________</Text></Text>
                            <Text style={styles.itemSpace}>• <Text style={styles.bold}>______________</Text></Text>
                        </>
                    )}
                </View>

                <View style={styles.textBlock}>
                    <Text>El valor del arrendamiento de los equipos motivo de este contrato es la suma de <Text style={styles.bold}>{data.monthlyValue ? formattedValue : '__________________'} MIL PESOS</Text>, suma que será pagada anticipado.</Text>
                    <Text>Término de duración: <Text style={styles.textBlock}>{data.term || '__________________'}</Text></Text>
                    <Text>Fecha de Iniciación: <Text style={styles.textBlock}>{data.startDate || '________________________'}</Text></Text>
                </View>

                <View style={styles.textBlock}>
                    <Text>
                        Entre los suscritos a saber: <Text style={styles.bold}>ANDRES MAURICIO USUGA RODRIGUEZ</Text>, identificado con cedula de ciudadanía No. 98.772.407 de Medellín, quien obra en nombre en representación legal de ECO ESPECIALIZADA SAS, identificado con Nit 901004863, quien en lo sucesivo se denominará el <Text style={styles.bold}>ARRENDADOR</Text> y <Text style={styles.bold}>{data.clientName || '__________________'}</Text> identificado con cédula de ciudadanía No. <Text style={styles.textBlock}>{data.documentNumber || '_______________'}</Text>, se ha convenido celebrar el presente contrato de arrendamiento el cual se regirá por las siguientes cláusulas:
                    </Text>
                </View>

                <View style={styles.textBlock}>
                    <Text>
                        <Text style={styles.bold}>Primera. Objeto. –</Text> En virtud del presente contrato <Text style={styles.bold}>EL ARRENDADOR</Text> entrega en arrendamiento al <Text style={styles.bold}>ARRENDATARIO</Text>, concediéndole su uso y goce, de los bienes anunciados, con sus respectivos accesorios. El equipo se ubicará en la dirección solicitada de la cual no podrá ser trasladado ni movido sin autorización previa y escrita por parte de ECO ESPECIALIZADA S.A.S.
                    </Text>
                </View>

                <View style={styles.textBlock}>
                    <Text>
                        <Text style={styles.bold}>Segunda. Valor del arrendamiento. -</Text> El valor del acuerdo será cancelado por consignación a la <Text style={styles.bold}>CUENTA CORRIENTE BANCOLOMBIA No. 37666021081 A NOMBRE DE ECO ESPECIALIZADA SAS</Text>, obligándose el <Text style={styles.bold}>ARRENDADOR</Text> a extender el recibo correspondiente.
                    </Text>
                </View>

                <View style={styles.textBlock}>
                    <Text>
                        <Text style={styles.bold}>Tercera. Duración del contrato.-</Text> La duración del presente contrato será por un término de 1 día y se le factura de acuerdo a la ejecución de los servicios.
                    </Text>
                </View>

                <View style={styles.textBlock}>
                    <Text>
                        <Text style={styles.bold}>Cuarta. Estado de los bienes. - El ARRENDADOR</Text> entrega los bienes en perfectas condiciones de operaciones y funcionamiento, en virtud de lo cual <Text style={styles.bold}>EL ARRENDATARIO</Text> firmará el acta de entrega del equipo haciéndose responsable del mismo en su totalidad. El transporte de los bienes será a cargo de ECO ESPECIALIZADA S.A.S.
                    </Text>
                </View>

                <View style={styles.textBlock}>
                    <Text>
                        <Text style={styles.bold}>Quinta. Mantenimiento de los bienes.-</Text> El mantenimiento preventivo, correctivo y calibración será prestado única y exclusivamente por ECO ESPECIALIZADA S.A.S, siempre y cuando los daños o defectos correspondan al uso o deterioro normal pudiendo realizarlas directamente o a través de terceros previamente autorizados para el efecto, los correctivos que se presenten diferentes al deterioro normal o defectos de fabricación serán facturados al arrendatario y el tiempo de reparación no suspenderá la facturación del servicio, daños tales como mal manejo, golpes, descargas eléctricas, humedad entre otros por tal razón el arrendatario deberá garantizar suministro regulado de corriente eléctrica que protegerá los equipos contra descargas eléctricas, personal calificado para el manejo del equipo y el área ideal y segura para su funcionamiento.
                    </Text>
                </View>

                <View style={styles.textBlock}>
                    <Text>
                        <Text style={styles.bold}>Sexta. – obligaciones del ARRENDATARIO.</Text> Serán obligaciones especiales del <Text style={styles.bold}>ARRENDATARIO</Text> las siguientes: a) Abstenerse de ceder el presente contrato, o subarrendar total o parcialmente; b) No cambiar de sitio de ubicación los bienes objeto del presente contrato, sin el consentimiento previo y escrito del <Text style={styles.bold}>ARRENDADOR</Text>; c) No modificar la naturaleza o especificaciones técnicas de los bienes, y d) Informar de manera inmediata al <Text style={styles.bold}>ARRENDADOR</Text> acerca de cualquier circunstancia que amenace vulnerar los derechos del <Text style={styles.bold}>ARRENDADOR</Text> sobre los bienes, al igual que cualquier perturbación sobre el desarrollo normal del contrato.
                    </Text>
                </View>

                <View style={styles.textBlock}>
                    <Text>
                        <Text style={styles.bold}>Séptima. Causales de terminación.</Text> - Serán causales de terminación del contrato, además de las contempladas legalmente, las siguientes: a) El incumplimiento de una o varias de las obligaciones derivadas genérica o específicamente del presente contrato; b) La iniciación del trámite de liquidación obligatoria del <Text style={styles.bold}>ARRENDATARIO</Text>, c) Por acuerdo entre las partes.
                    </Text>
                </View>

                <View style={styles.textBlock}>
                    <Text>
                        <Text style={styles.bold}>Octava. Restitución de los bienes.</Text> Terminado el contrato, el <Text style={styles.bold}>ARRENDATARIO</Text> se obliga a poner a disposición del <Text style={styles.bold}>ARRENDADOR</Text> los bienes en perfecto estado de funcionamiento y conservación.
                    </Text>
                </View>

                <View style={styles.textBlock}>
                    <Text>
                        <Text style={styles.bold}>Novena vigencia.</Text> El presente contrato tendrá una duración por <Text style={styles.bold}>{data.term || 'doce meses'}</Text> que inician el <Text style={styles.bold}>{data.startDate || '2026-03-02'}</Text>. Este contrato se entenderá por renovado de no haber una comunicación escrita por algunas de las partes dentro de los <Text style={styles.bold}>30</Text> días anteriores al vencimiento.
                    </Text>
                </View>

                <View style={[styles.textBlock, { marginTop: 10 }]}>
                    <Text>
                        <Text style={styles.bold}>Observación:</Text> para el caso de los ecógrafos, los transductores son parte fundamental de buen funcionamiento del equipo, por ende se debe tener especial cuidado en su manipulación ya que son muy delicados y pueden dañarse fácilmente por una caída, golpe o humedad, en dicho caso el contratante debe ser responsable de dicho accesorio.
                    </Text>
                </View>

                <View style={[styles.textBlock, { marginTop: 20 }]}>
                    <Text>Para constancia se firma en Medellín a los {day} días del mes de <Text style={styles.bold}>{month.toUpperCase()}</Text> de {year}.</Text>
                </View>

                {/* Signatures Sections */}
                <View style={[styles.signatures, { alignItems: 'flex-end' }]} wrap={false}>
                    <View style={styles.signatureBlock}>
                        <Image src="/images/imagenes del contrato/firma_arrendador-sin-fondo.png" style={{ width: 110, height: 45, marginBottom: -15, marginLeft: 10 }} />
                        <View style={styles.signatureLine}></View>
                        <Text style={[styles.signatureText, styles.bold]}>EL ARRENDADOR</Text>
                        <Text style={styles.signatureText}>ANDRES MAURICIO USUGA R.</Text>
                        <Text style={styles.signatureText}>CC. 98.772.407 de MEDELLÍN</Text>
                        <Text style={styles.signatureText}>ECO ESPECIALIZADA S.A.S</Text>
                        <Text style={styles.signatureText}>NIT 901004863</Text>
                        <Text style={styles.signatureText}>REPRESENTANTE LEGAL</Text>
                    </View>

                    <View style={styles.signatureBlock}>
                        <View style={[styles.signatureLine, { marginTop: 0 }]}></View>
                        <Text style={[styles.signatureText, styles.bold]}>EL ARRENDATARIO</Text>
                        <Text style={styles.signatureText}>{(data.clientName || '').toUpperCase()}</Text>
                        <Text style={styles.signatureText}>CC. {data.documentNumber || '_______________'}</Text>
                        <Text style={styles.signatureText}>{data.clientType || 'MEDICO'}</Text>
                        <Text style={styles.signatureText}>{data.clientType === 'MEDICO' ? 'RUT' : 'NIT'}. {data.taxId || '____________________'}</Text>
                        <Text style={styles.signatureText}>REPRESENTANTE LEGAL</Text>
                    </View>
                </View>

                {/* Footer with decoration */}
                <View style={styles.footerContainer} fixed>
                    <View style={styles.footerTopBar}>
                        <Text style={styles.footerTopText}>w w w . a l q u i l e r d e e c o g r a f o s . c o m</Text>
                    </View>
                    <View style={styles.footerBottomBar}>
                        <View style={styles.footerItem}>
                            <View style={styles.footerIconWrapper}>
                                <Svg width="18" height="18" viewBox="0 0 24 24">
                                    <Circle cx="12" cy="12" r="11" stroke="#ffffff" strokeWidth="1" fill="none" />
                                    <Path d="M16 12.5c-.3 0-.6-.1-.8-.3l-.8-.8c-.2-.2-.2-.5 0-.7l.3-.3c.1-.1.1-.3 0-.4l-1.5-1.5c-.1-.1-.3-.1-.4 0l-.3.3c-.2.2-.5.2-.7 0l-.8-.8c-.2-.2-.2-.5 0-.7l.4-.4c.2-.2.2-.5 0-.7L9.5 5.3c-.2-.2-.5-.2-.7 0l-.5.5c-.6.6-.8 1.4-.6 2.2.4 1.8 1.6 3.5 3.2 5.1s3.3 2.8 5.1 3.2c.8.2 1.6 0 2.2-.6l.5-.5c.2-.2.2-.5 0-.7l-1.5-1.5c-.1-.2-.4-.2-.5-.1z" fill="#ffffff" />
                                </Svg>
                            </View>
                            <Text style={styles.footerBottomText}>300 3608621</Text>
                        </View>
                        <View style={styles.footerItem}>
                            <View style={styles.footerIconWrapper}>
                                <Svg width="18" height="18" viewBox="0 0 24 24">
                                    <Circle cx="12" cy="12" r="11" stroke="#ffffff" strokeWidth="1" fill="none" />
                                    <Path d="M6 8h12v8H6V8zm0 1l6 4 6-4v7H6V9z" fill="#ffffff" />
                                </Svg>
                            </View>
                            <Text style={styles.footerBottomText}>info@alquilerdeecografos.com</Text>
                        </View>
                        <View style={styles.footerItem}>
                            <View style={styles.footerIconWrapper}>
                                <Svg width="18" height="18" viewBox="0 0 24 24">
                                    <Circle cx="12" cy="12" r="11" stroke="#ffffff" strokeWidth="1" fill="none" />
                                    <Path d="M7 7h10v7H7V7z M9 14v1h6v-1H9z M15 15l2 1v1h-10v-1l2-1z M10 9h4v2h-4v-2z" fill="#ffffff" />
                                </Svg>
                            </View>
                            <Text style={styles.footerBottomText}>Especialistas en alquiler de ecógrafos</Text>
                        </View>
                    </View>
                </View>

            </Page>
        </Document>
    );
};

export default TestContractPDF;