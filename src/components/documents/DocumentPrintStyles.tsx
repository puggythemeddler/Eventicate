export function DocumentPrintStyles() {
  return (
    <style>{`
      /* ─── Print base ─────────────────────────────────────── */
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .no-print { display: none !important; }
      }

      /* ─── A4 format ──────────────────────────────────────── */
      .print-a4 {
        font-family: 'Inter', system-ui, sans-serif;
        color: #111;
      }
      @media print {
        .print-a4 {
          width: 210mm;
          margin: 0 auto;
          padding: 20mm 15mm;
          background: #fff;
        }
        .print-a4 table { width: 100%; border-collapse: collapse; }
        .print-a4 th { text-align: left; padding: 8px 4px; border-bottom: 2px solid #333; }
        .print-a4 td { padding: 8px 4px; border-bottom: 1px solid #ddd; }
      }

      /* ─── Thermal 80mm format ────────────────────────────── */
      .print-thermal {
        font-family: 'Courier New', Courier, monospace;
        max-width: 320px;
        margin: 0 auto;
        background: #fff;
        color: #000;
        font-size: 12px;
        line-height: 1.4;
      }
      .print-thermal table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }
      .print-thermal th,
      .print-thermal td {
        padding: 4px 2px;
        text-align: left;
      }
      .print-thermal th {
        border-bottom: 1px dashed #000;
      }
      .print-thermal td {
        border-bottom: 1px dotted #ccc;
      }
      .print-thermal .text-right { text-align: right; }
      .print-thermal .text-center { text-align: center; }
      .print-thermal .border-dashed { border-bottom: 1px dashed #000; }
      .print-thermal .border-dotted { border-bottom: 1px dotted #666; }
      .print-thermal .py-1 { padding-top: 4px; padding-bottom: 4px; }
      .print-thermal .py-2 { padding-top: 8px; padding-bottom: 8px; }
      .print-thermal .mb-1 { margin-bottom: 4px; }
      .print-thermal .mb-2 { margin-bottom: 8px; }
      .print-thermal img { max-width: 200px; height: auto; }

      @media print {
        .print-thermal {
          width: 80mm;
          max-width: 80mm;
          padding: 2mm 3mm;
          font-size: 10px;
        }
        .print-thermal table { font-size: 9px; }
        .print-thermal .no-print { display: none !important; }
        body { background: #fff; }
      }
    `}</style>
  );
}
