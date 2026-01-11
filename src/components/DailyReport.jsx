import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, DollarSign, Wallet, TrendingUp, TrendingDown, Save, Plus, Trash2, Printer, FileSpreadsheet, Edit2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const DailyReport = ({ orders = [], user }) => {
  const { toast } = useToast();
  
  // Basic State
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  
  // Ledger Data State (Persisted)
  const [ledgerData, setLedgerData] = useState({
    openingCash: 0,
    actualClosingCash: 0,
    dailyDeposit: 0,
    bankName: '',
    manualTransactions: [] // { id, type, description, orderNumber, income, expense, balanceNote }
  });

  // Load Data
  useEffect(() => {
    const savedReports = localStorage.getItem('dailyReports_v2');
    if (savedReports) {
      const parsed = JSON.parse(savedReports);
      if (parsed[selectedDate]) {
        setLedgerData(parsed[selectedDate]);
      } else {
        // Reset for new date
        setLedgerData({
          openingCash: 0,
          actualClosingCash: 0,
          dailyDeposit: 0,
          bankName: '',
          manualTransactions: []
        });
      }
    }
  }, [selectedDate]);

  // Save Data Helper
  const saveLedger = (newData) => {
    setLedgerData(newData);
    const savedReports = localStorage.getItem('dailyReports_v2') ? JSON.parse(localStorage.getItem('dailyReports_v2')) : {};
    savedReports[selectedDate] = newData;
    localStorage.setItem('dailyReports_v2', JSON.stringify(savedReports));
  };

  // Field Updaters
  const updateField = (field, value) => saveLedger({ ...ledgerData, [field]: value });
  
  const addManualTransaction = (type) => {
    const newTx = {
      id: Date.now(),
      type: type, // 'VALE', 'GASTO', 'INGRESO_EXTRA'
      description: '',
      orderNumber: '',
      income: 0,
      expense: 0,
      balanceNote: '',
      isManual: true
    };
    saveLedger({
      ...ledgerData,
      manualTransactions: [...ledgerData.manualTransactions, newTx]
    });
  };

  const updateManualTransaction = (id, field, value) => {
    const updated = ledgerData.manualTransactions.map(tx => 
      tx.id === id ? { ...tx, [field]: value } : tx
    );
    saveLedger({ ...ledgerData, manualTransactions: updated });
  };

  const removeManualTransaction = (id) => {
    const updated = ledgerData.manualTransactions.filter(tx => tx.id !== id);
    saveLedger({ ...ledgerData, manualTransactions: updated });
  };

  // --- Automatic Transactions Logic ---
  const automaticTransactions = useMemo(() => {
    const txs = [];
    
    // 1. New Sales (Created Today)
    const newSales = orders.filter(o => o.createdAt.startsWith(selectedDate));
    newSales.forEach(o => {
      // Only if anticipo > 0
      if (Number(o.anticipo) > 0) {
        txs.push({
          id: `auto-sale-${o.id}`,
          type: 'VENTA',
          description: o.cliente,
          details: o.descripcion || (o.productos?.[0]?.nombre) || 'Orden de Producción',
          orderNumber: o.orderNumber,
          income: Number(o.anticipo),
          expense: 0,
          balanceNote: o.financials?.saldo > 0 ? `DEBE $${Number(o.financials.saldo).toFixed(2)}` : 'CANCELADO',
          isManual: false
        });
      }
    });

    // 2. Pickups/Retiros (Updated Today + Status Check)
    // Heuristic: If status became FINALIZADA or VENTAS POR RETIRAR today, assume they paid the saldo.
    const pickups = orders.filter(o => {
      const isUpdatedToday = o.updatedAt.startsWith(selectedDate);
      const isRelevantStatus = o.status === 'FINALIZADA' || o.status === 'VENTAS POR RETIRAR';
      // Only count if there is a saldo that was likely paid (total > anticipo)
      // And avoid double counting if created today AND finished today? 
      // If created today, we counted Anticipo. If finished today, we count Saldo. This is correct.
      return isUpdatedToday && isRelevantStatus && Number(o.financials?.saldo) > 0;
    });

    pickups.forEach(o => {
      txs.push({
        id: `auto-pickup-${o.id}`,
        type: 'RETIRO',
        description: o.cliente,
        details: o.descripcion || (o.productos?.[0]?.nombre) || 'Retiro de Orden',
        orderNumber: o.orderNumber,
        income: Number(o.financials.saldo),
        expense: 0,
        balanceNote: 'CANCELADO',
        isManual: false
      });
    });

    return txs;
  }, [orders, selectedDate]);

  // Combined and Sorted
  const allTransactions = useMemo(() => {
    return [...automaticTransactions, ...ledgerData.manualTransactions];
  }, [automaticTransactions, ledgerData.manualTransactions]);

  // --- Totals Calculations ---
  const totals = useMemo(() => {
    const totalIncome = allTransactions.reduce((sum, tx) => sum + Number(tx.income || 0), 0);
    const totalExpense = allTransactions.reduce((sum, tx) => sum + Number(tx.expense || 0), 0);
    
    // Cash in Hand (System)
    // Formula: Opening + Incomes - Expenses
    const cashBeforeDeposit = Number(ledgerData.openingCash) + totalIncome - totalExpense;
    
    // Cash After Deposit (System)
    const cashAfterDeposit = cashBeforeDeposit - Number(ledgerData.dailyDeposit);
    
    // Difference (Physical vs System)
    const difference = Number(ledgerData.actualClosingCash) - cashAfterDeposit;

    return {
      totalIncome,
      totalExpense,
      cashBeforeDeposit,
      cashAfterDeposit,
      difference
    };
  }, [allTransactions, ledgerData]);

  const handleExportCSV = () => {
     const headers = ['N', 'Tipo', 'Descripcion', 'Orden', 'Ingreso', 'Egreso', 'Saldo/Nota'];
     const rows = allTransactions.map((tx, idx) => [
       idx + 1,
       tx.type,
       `"${tx.description} - ${tx.details || ''}"`,
       tx.orderNumber,
       (tx.income || 0).toFixed(2),
       (tx.expense || 0).toFixed(2),
       `"${tx.balanceNote}"`
     ]);
     const csvContent = "data:text/csv;charset=utf-8," + ["sep=,", headers.join(','), ...rows.map(e => e.join(','))].join('\n');
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `reporte_caja_${selectedDate}.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto pb-20 print:p-0 print:max-w-none print:w-full print:pb-0">
      
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden bg-white p-4 rounded-xl shadow-sm border border-slate-200">
         <div>
            <h2 className="text-2xl font-bold text-slate-800">Reporte Diario Efectivo</h2>
            <p className="text-slate-500 text-sm">Control de caja, ingresos, egresos y depósitos.</p>
         </div>
         <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
              <Calendar className="h-4 w-4 text-slate-500" />
              <input 
                type="date" 
                className="text-sm bg-transparent border-none focus:ring-0 outline-none text-slate-700 font-medium"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
               <FileSpreadsheet className="h-4 w-4 text-green-600" /> Excel
            </Button>
            <Button variant="default" size="sm" onClick={() => window.print()} className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
               <Printer className="h-4 w-4" /> Imprimir
            </Button>
         </div>
      </div>

      {/* --- REPORT SHEET --- */}
      <div className="bg-white shadow-xl print:shadow-none min-h-[800px] flex flex-col font-sans text-xs md:text-sm border-2 border-slate-900">
        
        {/* Header Strip */}
        <div className="bg-blue-300 border-b-2 border-slate-900 p-2 flex justify-between items-center print:bg-blue-300 print:print-color-adjust-exact">
            <div className="font-black text-lg uppercase tracking-wider pl-2">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
               <span className="font-bold uppercase text-slate-900">INICIO DE CAJA:</span>
               <div className="flex items-center">
                  <span className="font-bold mr-1">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-24 font-bold text-lg text-right outline-none bg-transparent placeholder-slate-300"
                    placeholder="0.00"
                    value={ledgerData.openingCash}
                    onChange={(e) => updateField('openingCash', e.target.value)}
                  />
               </div>
            </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_100px_100px_100px_200px_40px] bg-orange-300 border-b-2 border-slate-900 font-bold text-center divide-x-2 divide-slate-900 print:bg-orange-300 print:print-color-adjust-exact">
           <div className="py-2 flex items-center justify-center">Nº</div>
           <div className="py-2 flex items-center justify-center">DESCRIPCION</div>
           <div className="py-2 flex items-center justify-center leading-tight text-[10px] md:text-xs">ORDEN DE<br/>PRODUCCION</div>
           <div className="py-2 flex items-center justify-center">INGRESO</div>
           <div className="py-2 flex items-center justify-center">EGRESO</div>
           <div className="py-2 flex items-center justify-center">SALDOS / NOTAS</div>
           <div className="py-2 bg-slate-200 print:hidden"></div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-auto">
           {allTransactions.map((tx, idx) => (
             <div 
               key={tx.id} 
               className={cn(
                 "grid grid-cols-[40px_1fr_100px_100px_100px_200px_40px] border-b border-slate-300 divide-x divide-slate-300 hover:bg-yellow-50 transition-colors group text-xs md:text-sm",
                 idx % 2 === 0 ? "bg-white" : "bg-slate-50"
               )}
             >
                <div className="py-2 px-1 font-bold text-center flex items-center justify-center text-slate-500">{idx + 1}</div>
                
                {/* Description Column */}
                <div className="py-1 px-3 flex flex-col justify-center relative">
                   <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded border border-black uppercase inline-block print:border-black",
                        tx.type === 'VENTA' ? 'bg-orange-200 print:bg-orange-200' : 
                        tx.type === 'RETIRO' ? 'bg-orange-400 print:bg-orange-400' :
                        tx.type.includes('GASTO') ? 'bg-red-200 print:bg-red-200' :
                        'bg-yellow-200 print:bg-yellow-200'
                      )}>
                        {tx.type}
                      </span>
                      {tx.isManual && (
                        <input 
                           className="flex-1 bg-transparent border-b border-dotted border-slate-400 outline-none text-xs font-semibold focus:border-blue-500"
                           value={tx.description}
                           placeholder="Descripción..."
                           onChange={(e) => updateManualTransaction(tx.id, 'description', e.target.value)}
                        />
                      )}
                      {!tx.isManual && <span className="font-bold uppercase truncate">{tx.description}</span>}
                   </div>
                   {!tx.isManual && <span className="text-[10px] text-slate-500 italic ml-1 truncate">{tx.details}</span>}
                   {tx.isManual && (
                      <input 
                         className="text-[10px] bg-transparent outline-none text-slate-500 italic ml-1 w-full"
                         placeholder="Detalles adicionales..."
                         value={tx.details || ''}
                         onChange={(e) => updateManualTransaction(tx.id, 'details', e.target.value)}
                      />
                   )}
                </div>

                {/* Order Number */}
                <div className="py-2 px-1 text-center font-mono font-bold flex items-center justify-center">
                   {tx.isManual ? (
                      <input 
                        className="w-full text-center bg-transparent outline-none"
                        placeholder="-"
                        value={tx.orderNumber}
                        onChange={(e) => updateManualTransaction(tx.id, 'orderNumber', e.target.value)}
                      />
                   ) : (
                      tx.orderNumber
                   )}
                </div>

                {/* Ingreso */}
                <div className="py-2 px-2 text-right font-medium flex items-center justify-end">
                   {tx.isManual ? (
                      <div className="flex items-center justify-end w-full">
                         <span className="text-slate-400 mr-1">$</span>
                         <input 
                           type="number"
                           className="w-full text-right bg-transparent outline-none font-bold"
                           value={tx.income || ''}
                           placeholder="0.00"
                           onChange={(e) => updateManualTransaction(tx.id, 'income', e.target.value)}
                         />
                      </div>
                   ) : (
                      tx.income > 0 ? `$ ${tx.income.toFixed(2)}` : '-'
                   )}
                </div>

                {/* Egreso */}
                <div className="py-2 px-2 text-right font-medium flex items-center justify-end">
                   {tx.isManual ? (
                      <div className="flex items-center justify-end w-full">
                         <span className="text-slate-400 mr-1">$</span>
                         <input 
                           type="number"
                           className="w-full text-right bg-transparent outline-none font-bold text-red-600"
                           value={tx.expense || ''}
                           placeholder="0.00"
                           onChange={(e) => updateManualTransaction(tx.id, 'expense', e.target.value)}
                         />
                      </div>
                   ) : (
                      tx.expense > 0 ? `$ ${tx.expense.toFixed(2)}` : '-'
                   )}
                </div>

                {/* Saldo / Notas */}
                <div className="py-2 px-2 text-center text-xs font-semibold uppercase flex items-center justify-center">
                   {tx.isManual ? (
                      <input 
                        className="w-full text-center bg-transparent outline-none uppercase"
                        placeholder="Nota..."
                        value={tx.balanceNote}
                        onChange={(e) => updateManualTransaction(tx.id, 'balanceNote', e.target.value)}
                      />
                   ) : (
                      <span className={cn(tx.balanceNote?.includes('DEBE') ? "text-red-600 bg-red-50 px-1 rounded" : "text-green-700")}>
                        {tx.balanceNote}
                      </span>
                   )}
                </div>

                {/* Actions (Print hidden) */}
                <div className="py-2 flex items-center justify-center print:hidden">
                   {tx.isManual && (
                      <button 
                        onClick={() => removeManualTransaction(tx.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title="Eliminar fila"
                      >
                         <Trash2 className="h-4 w-4" />
                      </button>
                   )}
                </div>
             </div>
           ))}

           {allTransactions.length === 0 && (
              <div className="p-8 text-center text-slate-400 italic">No hay movimientos registrados para este día.</div>
           )}
           
           {/* Add Buttons Row (Print Hidden) */}
           <div className="p-4 flex gap-4 bg-slate-50 border-t border-slate-300 print:hidden justify-center">
              <Button onClick={() => addManualTransaction('VALE DE CAJA')} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                 <Plus className="h-3 w-3 mr-2" /> Vale / Egreso
              </Button>
              <Button onClick={() => addManualTransaction('INGRESO EXTRA')} variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
                 <Plus className="h-3 w-3 mr-2" /> Ingreso Extra
              </Button>
              <Button onClick={() => addManualTransaction('NOTA')} variant="ghost" className="text-slate-500">
                 <Edit2 className="h-3 w-3 mr-2" /> Nota Simple
              </Button>
           </div>
        </div>

        {/* Footer Summary Section */}
        <div className="border-t-4 border-slate-900 bg-slate-100 text-xs md:text-sm">
           {/* Row 1: Totals */}
           <div className="flex border-b border-slate-400 divide-x border-slate-400">
              <div className="flex-1 bg-blue-200 p-2 font-black uppercase text-right flex items-center justify-end pr-4 print:bg-blue-200 print:print-color-adjust-exact">
                 TOTAL DE INGRESO Y EGRESOS
              </div>
              <div className="w-[100px] bg-blue-200 p-2 font-bold text-right text-slate-900 flex items-center justify-end print:bg-blue-200 print:print-color-adjust-exact">
                 {formatCurrency(totals.totalIncome)}
              </div>
              <div className="w-[100px] bg-blue-200 p-2 font-bold text-right text-slate-900 flex items-center justify-end print:bg-blue-200 print:print-color-adjust-exact">
                 {formatCurrency(totals.totalExpense)}
              </div>
              <div className="w-[340px] bg-white p-2 font-bold uppercase flex justify-between items-center">
                 <span>VALOR TOTAL DE INGRESOS EN EFECTIVO DEL DIA</span>
                 <span className="text-lg">{formatCurrency(totals.cashBeforeDeposit)}</span>
              </div>
           </div>

           {/* Row 2: Deposit & Closing Calc */}
           <div className="flex border-b border-slate-400 divide-x border-slate-400">
              <div className="w-[300px] bg-yellow-200 p-2 font-black uppercase flex justify-between items-center print:bg-yellow-200 print:print-color-adjust-exact">
                 <span>DEPOSITO DIARIO</span>
                 <div className="flex items-center bg-white px-2 rounded border border-yellow-400">
                    $ 
                    <input 
                      type="number" 
                      className="w-20 text-right font-bold outline-none ml-1 text-base"
                      value={ledgerData.dailyDeposit}
                      onChange={(e) => updateField('dailyDeposit', e.target.value)}
                    />
                 </div>
              </div>
              <div className="flex-1 bg-white p-2 font-bold text-red-600 uppercase flex justify-between items-center">
                 <span>CIERRE DE CAJA DESPUES DEL DEPOSITO (Sistema)</span>
                 <span className="text-lg">{formatCurrency(totals.cashAfterDeposit)}</span>
              </div>
              <div className="w-[340px] bg-slate-800 text-white p-2 font-bold uppercase flex justify-between items-center print:bg-slate-800 print:print-color-adjust-exact">
                 <span>EFECTIVO REAL EN CAJA (Manual)</span>
                 <div className="flex items-center bg-slate-700 px-2 rounded border border-slate-600">
                    $ 
                    <input 
                      type="number" 
                      className="w-24 text-right font-bold outline-none ml-1 bg-transparent text-white text-lg"
                      value={ledgerData.actualClosingCash}
                      onChange={(e) => updateField('actualClosingCash', e.target.value)}
                    />
                 </div>
              </div>
           </div>

           {/* Row 3: Bank & Difference */}
           <div className="flex divide-x border-slate-400">
              <div className="w-[300px] bg-yellow-200 p-2 font-bold uppercase flex items-center gap-2 print:bg-yellow-200 print:print-color-adjust-exact">
                 <span className="whitespace-nowrap">BANCO:</span>
                 <input 
                    className="w-full bg-transparent border-b border-black outline-none font-bold uppercase"
                    placeholder="Nombre del Banco"
                    value={ledgerData.bankName}
                    onChange={(e) => updateField('bankName', e.target.value)}
                 />
              </div>
              <div className={cn(
                 "flex-1 p-2 font-black uppercase flex justify-between items-center text-white print:print-color-adjust-exact",
                 totals.difference === 0 ? "bg-green-500" : totals.difference > 0 ? "bg-blue-500" : "bg-red-600"
              )}>
                 <span>FALTANTE O SOBRANTE DEL DIA</span>
                 <span className="text-xl">
                    {totals.difference > 0 ? "+ " : ""}
                    {formatCurrency(totals.difference)}
                 </span>
              </div>
           </div>
        </div>
      </div>
      
      {/* Warning/Info Footer */}
      <div className="flex items-start gap-2 text-slate-500 text-xs mt-4 print:hidden">
        <AlertCircle className="h-4 w-4 mt-0.5" />
        <p>
          Las filas de color naranja son generadas automáticamente desde las órdenes. Las filas amarillas son manuales. 
          Los totales se calculan en tiempo real. Recuerde imprimir o exportar al finalizar el día.
        </p>
      </div>
    </div>
  );
};

export default DailyReport;