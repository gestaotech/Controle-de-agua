'use client';

import { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { formatMonthYear, formatCurrency, formatDate } from '@/lib/utils';
import styles from './FaturaModal.module.css';

interface Cliente {
  id: string;
  nome: string;
  numero_hidrometro: string;
  endereco?: string | null;
}

interface Fatura {
  cliente: Cliente;
  mes: string;
  consumo: number;
  valorM3: number;
  taxaFixa: number;
  valorTotal: number;
  vencimento: string;
  empresa: string;
  codigo: string;
  barcodeNumber: string;
}

interface FaturaModalProps {
  fatura: Fatura;
  onClose: () => void;
}

export default function FaturaModal({ fatura, onClose }: FaturaModalProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, fatura.barcodeNumber, {
          format: 'CODE128',
          width: 1.5,
          height: 50,
          displayValue: false,
        });
      } catch (e) {
        console.error('Erro ao gerar código de barras:', e);
      }
    }
  }, [fatura.barcodeNumber]);

  const handlePrint = () => {
    window.print();
  };

  const pixPayload = `00020126580014br.gov.bcb.pix0136${fatura.codigo}5204000053039865${fatura.valorTotal.toFixed(2)}5802BR5913${fatura.empresa}6009SAO PAULO62070503***6304`;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.boleto}>
          <div className={styles.header}>
            <h2>{fatura.empresa}</h2>
            <p>FATURA DE FORNECIMENTO DE ÁGUA</p>
          </div>

          <div className={styles.body}>
            <div className={styles.infoGrid}>
              <div className={styles.field}>
                <label>Cliente</label>
                <span>{fatura.cliente.nome}</span>
              </div>
              <div className={styles.field}>
                <label>Endereço</label>
                <span>{fatura.cliente.endereco || '-'}</span>
              </div>
              <div className={styles.field}>
                <label>Hidrômetro</label>
                <span>{fatura.cliente.numero_hidrometro}</span>
              </div>
              <div className={styles.field}>
                <label>Referência</label>
                <span>{formatMonthYear(fatura.mes)}</span>
              </div>
              <div className={styles.field}>
                <label>Consumo</label>
                <span>{fatura.consumo.toFixed(2)} m³</span>
              </div>
              <div className={styles.field}>
                <label>Vencimento</label>
                <span>{formatDate(fatura.vencimento)}</span>
              </div>
            </div>

            <div className={styles.valorBox}>
              <div className={styles.label}>VALOR TOTAL</div>
              <div className={styles.value}>{formatCurrency(fatura.valorTotal)}</div>
            </div>

            <div className={styles.codigos}>
              <div className={styles.qrcode}>
                <label>PIX QR Code</label>
                <QRCodeSVG value={pixPayload} size={120} />
              </div>
              <div className={styles.barcode}>
                <label>Código de Barras</label>
                <svg ref={barcodeRef}></svg>
                <span className={styles.barcodeText}>{fatura.barcodeNumber}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button onClick={handlePrint} className={styles.print}>🖨️ Imprimir</button>
          <button onClick={onClose} className={styles.close}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
