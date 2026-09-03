import React, { useState, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';
import TestContractPDF, { ContractData } from './TestContractPDF';

interface PDFGenWrapperProps {
    data: ContractData;
}

const PDFGenWrapper: React.FC<PDFGenWrapperProps> = ({ data }) => {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const generatePdf = async () => {
            setLoading(true);
            try {
                const doc = <TestContractPDF data={data} />;
                const blob = await pdf(doc).toBlob();
                if (active) {
                    const newUrl = URL.createObjectURL(blob);
                    setUrl(newUrl);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error generating PDF:', error);
                if (active) setLoading(false);
            }
        };

        generatePdf();

        return () => {
            active = false;
            if (url) {
                URL.revokeObjectURL(url);
            }
        };
    }, [data]); // Regenerate when data changes

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Botón de descarga externalizado del visor */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-slate-800">Acciones del Documento</h3>
                    <p className="text-sm text-slate-500">El PDF se genera en tu navegador.</p>
                </div>

                {loading || !url ? (
                    <button disabled className="py-2 px-6 bg-slate-200 text-slate-500 font-semibold rounded-lg cursor-not-allowed">
                        Generando PDF...
                    </button>
                ) : (
                    <a
                        href={url}
                        download={`Contrato_${data.clientName.replace(/\s+/g, '_')}.pdf`}
                        className="py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors inline-block text-center"
                    >
                        ⬇️ Descargar Contrato PDF
                    </a>
                )}
            </div>

            <div className="bg-slate-200 p-2 rounded-2xl h-[700px] border border-slate-300 shadow-inner flex flex-col">
                <div className="bg-slate-800 text-white px-4 py-2 rounded-t-xl text-sm font-mono flex items-center justify-between">
                    <span>📄 Vista Previa del Documento</span>
                    <span className="text-slate-400 text-xs text-right">Generación Segura React 19</span>
                </div>
                <div className="flex-1 bg-white rounded-b-xl overflow-hidden relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center backdrop-blur-sm">
                            <div className="animate-pulse font-medium text-slate-600">Actualizando PDF...</div>
                        </div>
                    )}

                    {url ? (
                        <iframe
                            src={`${url}#view=FitH`}
                            className="w-full h-full border-none"
                            title="PDF Preview"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                            Inicializando motor de PDF...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PDFGenWrapper;
