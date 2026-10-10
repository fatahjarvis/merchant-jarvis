import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { LedgerCategory, LedgerEntry } from '../types';
import { 
  formatRs, 
  getMauritiusNow, 
  getMauritiusDateKey, 
  getLast7DaysMUT 
} from '../utils/mauritiusTime';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Calendar, 
  Trash2, 
  BookOpen,
  Filter,
  Mail,
  Send,
  CheckCircle
} from 'lucide-react';

interface LedgerScreenProps {
  onOpenNewLedger: (type?: LedgerCategory) => void;
}

const CATEGORY_COLORS: Record<LedgerCategory, { text: string; bg: string; border: string }> = {
  'Sale': { text: 'text-teal-300', bg: 'bg-teal-950/60', border: 'border-teal-800' },
  'Expense': { text: 'text-rose-300', bg: 'bg-rose-950/60', border: 'border-rose-800' },
  'Stock': { text: 'text-amber-300', bg: 'bg-amber-950/60', border: 'border-amber-800' }
};

export const LedgerScreen: React.FC<LedgerScreenProps> = ({ onOpenNewLedger }) => {
  const { 
    ledgerEntries, 
    deleteLedgerEntry, 
    queueEmailDayBook, 
    profile,
    budgetStats,
    budgetNotice
  } = useStore();
  const todayKey = getMauritiusDateKey(getMauritiusNow());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
  const [categoryFilter, setCategoryFilter] = useState<'All' | LedgerCategory>('All');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);

  const handleEmailDayBook = async () => {
    setEmailSending(true);
    setEmailFeedback(null);
    try {
      const res = await queueEmailDayBook(selectedDateKey);
      setEmailSuccess(true);
      setEmailFeedback(res.message);
      setTimeout(() => {
        setEmailSuccess(false);
        setEmailFeedback(null);
      }, 4000);
    } catch (err: any) {
      setEmailFeedback(err.message || 'Failed to queue day book mail');
    } finally {
      setEmailSending(false);
    }
  };

  const weekStrip = useMemo(() => getLast7DaysMUT(), []);

  // Filter entries
  const dayEntries = useMemo(() => {
    return ledgerEntries.filter(e => {
      const matchesDate = e.date === selectedDateKey;
      const matchesCategory = categoryFilter === 'All' || e.type === categoryFilter;
      return matchesDate && matchesCategory;
    });
  }, [ledgerEntries, selectedDateKey, categoryFilter]);

  // Totals for selected date
  const dayStats = useMemo(() => {
    const entries = ledgerEntries.filter(e => e.date === selectedDateKey);
    const sales = entries.filter(e => e.type === 'Sale').reduce((s, e) => s + e.amount, 0);
    const expenses = entries.filter(e => e.type === 'Expense' || e.type === 'Stock').reduce((s, e) => s + e.amount, 0);
    const net = sales - expenses;
    return { sales, expenses, net };
  }, [ledgerEntries, selectedDateKey]);

  return (
    <div className="space-y-4 pb-24">
      {/* Week Strip (7-day interactive day strip) */}
      <div className="bg-[#050b16] border border-cyan-950/80 rounded-2xl p-3 shadow-md">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
          <span className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Week Strip (MUT)
          </span>
          <span className="font-mono text-[11px] text-cyan-400">
            {selectedDateKey === todayKey ? 'Viewing Today' : selectedDateKey}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {weekStrip.map(day => {
            const isSelected = selectedDateKey === day.dateKey;
            const entriesForDay = ledgerEntries.filter(e => e.date === day.dateKey);
            const hasActivity = entriesForDay.length > 0;
            const daySales = entriesForDay.filter(e => e.type === 'Sale').reduce((s, e) => s + e.amount, 0);

            return (
              <button
                key={day.dateKey}
                onClick={() => setSelectedDateKey(day.dateKey)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition border text-center ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                style={{ minHeight: '52px' }}
              >
                <span className="text-[10px] uppercase font-mono font-bold leading-tight">
                  {day.dayLabel}
                </span>
                <span className={`text-xs font-mono font-extrabold my-0.5 ${isSelected ? 'text-slate-950' : 'text-slate-200'}`}>
                  {day.dateKey.split('-')[2]}
                </span>
                
                {/* Activity indicator */}
                <div className="flex items-center gap-0.5 mt-0.5">
                  {hasActivity ? (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-teal-400'}`} />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day-Book Single-Doc Batch & Budget Info */}
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-400 font-mono">
        <span className="flex items-center gap-1.5 text-cyan-400">
          <span>● Single-doc Day Book:</span>
          <span className="text-slate-300">ledger_days/{profile.merchantId}_{selectedDateKey}</span>
        </span>
        <span className={budgetStats.isAmberAlert ? 'text-amber-400 font-bold' : 'text-slate-400'}>
          Cloud writes: {budgetStats.writes}/{budgetStats.maxWrites}
        </span>
      </div>

      {budgetNotice && (
        <div className="bg-amber-950/70 border border-amber-800 rounded-xl p-3 text-xs text-amber-200 flex items-center justify-between">
          <span>🌙 {budgetNotice}</span>
          <span className="font-mono text-[11px] font-bold text-amber-400">RESTING</span>
        </div>
      )}

      {/* Day-Total Card (Monospace numbers, OLED dark contrast) */}
      <div className="bg-[#070e1c] border border-cyan-900/60 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Day Book Total ({selectedDateKey})
          </span>
          <span className="text-[11px] font-mono text-cyan-400 font-bold">
            {dayEntries.length} {dayEntries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">Sales</span>
            <span className="font-mono text-base font-bold text-teal-400 block tabular-nums">
              {formatRs(dayStats.sales)}
            </span>
          </div>

          <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">Outflows</span>
            <span className="font-mono text-base font-bold text-rose-400 block tabular-nums">
              {formatRs(dayStats.expenses)}
            </span>
          </div>

          <div className="bg-cyan-950/50 rounded-xl p-2.5 border border-cyan-800/80">
            <span className="text-[11px] text-cyan-300 block mb-0.5 font-medium">Net Cash</span>
            <span className={`font-mono text-base font-bold block tabular-nums ${dayStats.net >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
              {formatRs(dayStats.net)}
            </span>
          </div>
        </div>
      </div>

      {/* Email me my day book (Estate Mailer outbox) */}
      <div className="bg-[#050b16] border border-cyan-950/70 rounded-xl p-3 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-100 block">Email me my day book</span>
            <span className="text-[11px] text-slate-400">
              Queues outbox doc for {profile.shopEmail || profile.email}
            </span>
          </div>
        </div>

        <button
          onClick={handleEmailDayBook}
          disabled={emailSending}
          className="w-full xs:w-auto px-3.5 py-2 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-xs font-semibold text-cyan-300 active:scale-95 transition flex items-center justify-center gap-1.5"
          style={{ minHeight: '44px' }}
        >
          {emailSending ? (
            <span>Queuing...</span>
          ) : emailSuccess ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Queued
            </span>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Email Day Book</span>
            </>
          )}
        </button>
      </div>

      {emailFeedback && (
        <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800 p-2.5 rounded-xl font-mono">
          {emailFeedback}
        </div>
      )}

      {/* Quick Entry Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onOpenNewLedger('Sale')}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-teal-950/40 hover:bg-teal-950/70 border border-teal-800 text-teal-300 text-xs font-bold active:scale-95 transition"
          style={{ minHeight: '44px' }}
        >
          <TrendingUp className="w-4 h-4 text-teal-400" />
          <span>+ Sale</span>
        </button>

        <button
          onClick={() => onOpenNewLedger('Expense')}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800 text-rose-300 text-xs font-bold active:scale-95 transition"
          style={{ minHeight: '44px' }}
        >
          <TrendingDown className="w-4 h-4 text-rose-400" />
          <span>+ Expense</span>
        </button>

        <button
          onClick={() => onOpenNewLedger('Stock')}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800 text-amber-300 text-xs font-bold active:scale-95 transition"
          style={{ minHeight: '44px' }}
        >
          <Package className="w-4 h-4 text-amber-400" />
          <span>+ Stock</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 pt-1">
        {(['All', 'Sale', 'Expense', 'Stock'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
              categoryFilter === cat
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            style={{ minHeight: '38px' }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Entries List */}
      <div className="space-y-2">
        {dayEntries.length === 0 ? (
          <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-8 text-center space-y-2">
            <BookOpen className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-sm text-slate-400 font-medium">No ledger entries for this date</p>
            <p className="text-xs text-slate-600">Tap one of the quick buttons above to record a sale or expense.</p>
          </div>
        ) : (
          dayEntries.map(entry => {
            const catStyle = CATEGORY_COLORS[entry.type];
            const isNegative = entry.type === 'Expense' || entry.type === 'Stock';

            return (
              <div
                key={entry.id}
                className="bg-[#070d18] border border-slate-850 rounded-2xl p-3.5 flex items-center justify-between transition hover:border-slate-800"
                style={{ minHeight: '52px' }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${catStyle.bg} ${catStyle.border}`}>
                    {entry.type === 'Sale' ? (
                      <TrendingUp className="w-4 h-4 text-teal-400" />
                    ) : entry.type === 'Expense' ? (
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Package className="w-4 h-4 text-amber-400" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-200">{entry.categoryName}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                        {entry.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="font-mono text-[11px] text-slate-500">{entry.time}</span>
                      {entry.note && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[150px] italic">{entry.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`font-mono text-base font-bold tabular-nums ${isNegative ? 'text-rose-400' : 'text-teal-300'}`}>
                    {isNegative ? '-' : '+'}{formatRs(entry.amount)}
                  </span>
                  <button
                    onClick={() => deleteLedgerEntry(entry.id)}
                    className="text-slate-600 hover:text-rose-400 p-1.5 transition rounded-lg hover:bg-slate-900"
                    title="Delete entry"
                    style={{ minHeight: '36px', minWidth: '36px' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
