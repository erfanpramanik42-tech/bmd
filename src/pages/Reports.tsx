import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { Deposit, Loan, Installment, User, AppSettings, Investment, Expense, CashEntry } from '../types';
import { Card } from '../components/Card';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { TrendingUp, TrendingDown, Wallet, Banknote, PieChart, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ReportsProps {
  currentUser: User;
}

export const Reports: React.FC<ReportsProps> = ({ currentUser }) => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    const unsubDeps = onSnapshot(collection(db, 'deposits'), (snap) => {
      setDeposits(snap.docs.map(d => d.data() as Deposit));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'deposits'));

    const unsubMem = onSnapshot(collection(db, 'members'), (snap) => {
      setMembers(snap.docs.map(d => ({ ...d.data(), id: d.id } as User)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'members'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'main'), (doc) => {
      if (doc.exists()) setSettings(doc.data() as AppSettings);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/main'));

    const unsubLoans = onSnapshot(collection(db, 'loans'), (snap) => {
      setLoans(snap.docs.map(d => ({ ...d.data(), id: d.id } as Loan)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'loans'));

    const unsubInst = onSnapshot(collection(db, 'installments'), (snap) => {
      setInstallments(snap.docs.map(d => ({ ...d.data(), id: d.id } as Installment)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'installments'));

    const unsubInv = onSnapshot(collection(db, 'investments'), (snap) => {
      setInvestments(snap.docs.map(d => ({ ...d.data(), id: d.id } as Investment)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'investments'));

    const unsubExp = onSnapshot(collection(db, 'expenses'), (snap) => {
      setExpenses(snap.docs.map(d => ({ ...d.data(), id: d.id } as Expense)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'expenses'));

    const unsubCash = onSnapshot(collection(db, 'cash_entries'), (snap) => {
      setCashEntries(snap.docs.map(d => ({ ...d.data(), id: d.id } as CashEntry)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'cash_entries'));

    return () => {
      unsubDeps(); unsubMem(); unsubSettings(); unsubLoans(); unsubInst(); unsubInv(); unsubExp(); unsubCash();
    };
  }, [isAdmin, currentUser.id]);

  const fmt = (num: number) => Math.round(num).toLocaleString('en-IN');
  const n = (v: any) => Number(v) || 0;
  const mn = ['জানু', 'ফেব', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);

  const years = [...new Set(deposits.filter(d => d.month).map(d => d.month.slice(0, 4)))].sort().reverse();
  if (years.length === 0) years.push(new Date().getFullYear().toString());

  // Calculations
  const totalDeposits = deposits.reduce((s, d) => s + Number(d.amount), 0);
  const totalLoansDisbursed = loans.reduce((s, l) => s + Number(l.amount), 0);
  const totalInstallments = installments.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalInvestmentsOut = investments.reduce((s, i) => s + Number(i.amount), 0);
  const totalInvestmentReturns = investments.filter(i => i.status === 'received').reduce((s, i) => s + Number(i.received_amount || 0), 0);
  const totalCashAdded = cashEntries.reduce((s, e) => e.type === 'out' ? s - Number(e.amount) : s + Number(e.amount), 0);

  const currentCash = totalDeposits + totalInstallments + totalInvestmentReturns + totalCashAdded - totalLoansDisbursed - totalExpenses - totalInvestmentsOut;
  
  const totalLoanProfit = installments.reduce((s, i) => {
    const l = loans.find(ln => ln.id === i.loan_id);
    if (!l || !l.total_payable || !l.total_interest) return s;
    return s + Number(i.amount) * (Number(l.total_interest) / Number(l.total_payable));
  }, 0);

  const totalInvestmentProfit = investments.filter(i => i.status === 'received').reduce((s, i) => s + (Number(i.received_amount || 0) - Number(i.amount)), 0);
  const totalProfit = totalLoanProfit + totalInvestmentProfit;

  return (
    <div className="space-y-4 pb-10">
      <h3 className="font-serif text-base font-bold flex items-center gap-2">
        📊 রিপোর্ট ও পরিসংখ্যান
      </h3>

      {/* Summary Section */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-linear-to-br from-primary-dark to-primary text-white p-3">
          <div className="flex justify-between items-start mb-2">
            <div className="p-1.5 bg-white/20 rounded-lg"><Wallet className="w-4 h-4" /></div>
            <div className="text-[10px] font-bold opacity-80">ফান্ড ব্যালেন্স</div>
          </div>
          <div className="text-lg font-black">৳{fmt(currentCash)}</div>
          <div className="text-[9px] mt-1 opacity-70">বর্তমানে হাতে আছে</div>
        </Card>

        <Card className="bg-linear-to-br from-green-600 to-green-500 text-white p-3">
          <div className="flex justify-between items-start mb-2">
            <div className="p-1.5 bg-white/20 rounded-lg"><TrendingUp className="w-4 h-4" /></div>
            <div className="text-[10px] font-bold opacity-80">মোট লাভ</div>
          </div>
          <div className="text-lg font-black">৳{fmt(totalProfit)}</div>
          <div className="text-[9px] mt-1 opacity-70">বিনিয়োগ ও ঋণ থেকে</div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-3">
          <div className="bg-white p-3 rounded-2xl border border-app-border shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="w-3 h-3 text-green-600" />
              <span className="text-[10px] font-bold text-app-text-secondary">মোট জমা</span>
            </div>
            <div className="text-sm font-black">৳{fmt(totalDeposits)}</div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-app-border shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownRight className="w-3 h-3 text-danger" />
              <span className="text-[10px] font-bold text-app-text-secondary">মোট খরচ</span>
            </div>
            <div className="text-sm font-black">৳{fmt(totalExpenses)}</div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-white p-3 rounded-2xl border border-app-border shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="w-3 h-3 text-orange-600" />
              <span className="text-[10px] font-bold text-app-text-secondary">ঋণ বিতরণ</span>
            </div>
            <div className="text-sm font-black">৳{fmt(totalLoansDisbursed)}</div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-app-border shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <PieChart className="w-3 h-3 text-blue-600" />
              <span className="text-[10px] font-bold text-app-text-secondary">বিনিয়োগ</span>
            </div>
            <div className="text-sm font-black">৳{fmt(totalInvestmentsOut)}</div>
          </div>
        </div>
      </div>

      {/* Excel Sheet Embed */}
      <Card className="p-0 overflow-hidden">
        <div className="p-3 px-4 bg-linear-to-r from-primary to-primary-light text-white flex items-center justify-between">
          <div className="text-sm font-bold">📊 ফান্ডের Excel শিট</div>
          {settings?.excel_link && (
            <a 
              href={settings.excel_link} 
              target="_blank" 
              rel="noreferrer"
              className="text-[10px] bg-white/20 px-2 py-1 rounded-md font-bold"
            >
              ↗ পূর্ণ সাইটে দেখুন
            </a>
          )}
        </div>
        <div className="min-h-[200px] flex items-center justify-center p-6 text-center text-app-text-muted">
          {settings?.excel_link ? (
            <iframe 
              src={settings.excel_link.replace(/\/(edit|pub).*$/, '/preview')} 
              className="w-full h-[400px] border-none"
              title="Excel Sheet"
            />
          ) : (
            <div>
              <div className="text-4xl mb-2">📋</div>
              <div className="text-sm font-bold mb-1 text-app-text-secondary">Excel শিটের লিংক যোগ করা হয়নি</div>
              <div className="text-xs">সেটিংস থেকে লিংক যোগ করুন</div>
            </div>
          )}
        </div>
      </Card>

      {/* Monthly Summary Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-3 px-4 bg-linear-to-br from-indigo-600 to-indigo-400 text-white">
          <div className="text-sm font-bold flex items-center gap-2">
            <PieChart className="w-4 h-4" /> মাসিক সারসংক্ষেপ ({year})
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-app-bg-secondary border-b border-app-border">
                <th className="p-2 text-left">মাস</th>
                <th className="p-2 text-right">জমা</th>
                <th className="p-2 text-right">ঋণ</th>
                <th className="p-2 text-right">খরচ</th>
                <th className="p-2 text-right">লাভ</th>
              </tr>
            </thead>
            <tbody>
              {months.map((mo, i) => {
                const mDeps = deposits.filter(d => d.month === mo).reduce((s, d) => s + n(d.amount), 0);
                const mLoans = loans.filter(l => l.date.startsWith(mo)).reduce((s, l) => s + n(l.amount), 0);
                const mExps = expenses.filter(e => e.date.startsWith(mo)).reduce((s, e) => s + n(e.amount), 0);
                const mInstProfit = installments.filter(inst => inst.date.startsWith(mo)).reduce((s, inst) => {
                  const l = loans.find(ln => ln.id === inst.loan_id);
                  if (!l || !l.total_payable || !l.total_interest) return s;
                  return s + n(inst.amount) * (n(l.total_interest) / n(l.total_payable));
                }, 0);
                
                if (mDeps === 0 && mLoans === 0 && mExps === 0 && mInstProfit === 0) return null;

                return (
                  <tr key={mo} className="border-b border-app-border last:border-0">
                    <td className="p-2 font-bold">{mn[i]}</td>
                    <td className="p-2 text-right text-primary font-bold">৳{fmt(mDeps)}</td>
                    <td className="p-2 text-right text-orange-600">৳{fmt(mLoans)}</td>
                    <td className="p-2 text-right text-danger">৳{fmt(mExps)}</td>
                    <td className="p-2 text-right text-green-600 font-bold">৳{fmt(mInstProfit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Member-wise Deposit */}
      <Card className="p-0 overflow-hidden">
        <div className="p-3 px-4 bg-linear-to-br from-primary-dark to-primary text-white">
          <div className="text-sm font-bold mb-2">👤 সদস্য-ভিত্তিক জমা</div>
          <div className="flex gap-2">
            <select 
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="flex-1 bg-white/20 border border-white/30 rounded-md px-2 py-1.5 text-xs outline-none"
            >
              {years.map(y => <option key={y} value={y} className="text-black">{y} সাল</option>)}
            </select>
            <select 
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="flex-1 bg-white/20 border border-white/30 rounded-md px-2 py-1.5 text-xs outline-none"
            >
              <option value="card" className="text-black">📋 কার্ড ভিউ</option>
              <option value="table" className="text-black">📊 টেবিল ভিউ</option>
            </select>
          </div>
        </div>

        <div className="p-2 space-y-2">
          {members.length === 0 ? (
            <div className="text-center py-10 text-app-text-muted italic text-sm">কোনো সদস্য নেই</div>
          ) : viewMode === 'card' ? (
            members.map(m => {
              const mDeps = months.map(mo => deposits.filter(d => d.member_id === m.id && d.month === mo && !d.fine).reduce((s, d) => s + Number(d.amount), 0));
              const total = mDeps.reduce((s, v) => s + v, 0);
              const paidCount = mDeps.filter(v => v > 0).length;
              const pct = Math.round(paidCount / 12 * 100);
              const color = pct === 100 ? 'text-primary' : pct >= 50 ? 'text-amber-600' : 'text-danger';

              return (
                <div key={m.id} className="bg-app-bg-secondary rounded-xl overflow-hidden border border-app-border/50">
                  <div className="flex items-center gap-2.5 p-2.5 border-b border-app-border/50">
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary-dark to-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {m.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{m.name}</div>
                      <div className="text-[10px] text-app-text-muted">{m.phone}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-primary">৳{fmt(total)}</div>
                      <div className={cn("text-[9px] font-bold", color)}>{paidCount}/12 মাস</div>
                    </div>
                  </div>
                  <div className="p-2 grid grid-cols-6 gap-1">
                    {mDeps.map((v, i) => {
                      const isPaid = v > 0;
                      return (
                        <div key={i} className={cn(
                          "text-center py-1.5 rounded-md",
                          isPaid ? "bg-green-50" : "bg-red-50"
                        )}>
                          <div className="text-[8px] text-app-text-muted mb-0.5">{mn[i]}</div>
                          <div className={cn("text-[9px] font-bold", isPaid ? "text-primary" : "text-danger/40")}>
                            {isPaid ? '৳'+fmt(v) : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-width-[600px]">
                <thead>
                  <tr>
                    <th className="bg-primary text-white p-2 text-[10px] sticky left-0 z-10 text-left">নাম</th>
                    {mn.map(m => <th key={m} className="bg-primary text-white p-2 text-[10px]">{m}</th>)}
                    <th className="bg-primary text-white p-2 text-[10px]">মোট</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, ri) => {
                    const mDeps = months.map(mo => deposits.filter(d => d.member_id === m.id && d.month === mo && !d.fine).reduce((s, d) => s + Number(d.amount), 0));
                    const total = mDeps.reduce((s, v) => s + v, 0);
                    return (
                      <tr key={m.id} className={ri % 2 === 0 ? '' : 'bg-app-bg-secondary'}>
                        <td className="p-2 text-[10px] font-bold sticky left-0 bg-inherit border-b border-app-border">{m.name}</td>
                        {mDeps.map((v, i) => (
                          <td key={i} className={cn("p-2 text-[10px] text-center border-b border-app-border", v > 0 ? "text-primary font-bold" : "text-app-text-muted")}>
                            {v > 0 ? '৳'+fmt(v) : '—'}
                          </td>
                        ))}
                        <td className="p-2 text-[10px] font-black text-primary border-b border-app-border text-center">৳{fmt(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Loan Report */}
      <Card className="p-0 overflow-hidden">
        <div className="p-3 px-4 bg-linear-to-br from-orange-600 to-orange-400 text-white flex items-center justify-between">
          <div className="text-sm font-bold flex items-center gap-2">
            <Banknote className="w-4 h-4" /> ঋণ রিপোর্ট ও রিকভারি
          </div>
          <div className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-md">
            মোট ঋণ: ৳{fmt(totalLoansDisbursed)}
          </div>
        </div>
        <div className="p-2 space-y-2">
          {loans.length === 0 ? (
            <div className="text-center py-6 text-app-text-muted italic text-sm">কোনো ঋণ নেই</div>
          ) : (
            loans.map(l => {
              const member = members.find(m => m.id === l.member_id);
              const paid = installments.filter(i => i.loan_id === l.id).reduce((s, i) => s + Number(i.amount), 0);
              const remaining = Number(l.total_payable) - paid;
              const progress = (paid / Number(l.total_payable)) * 100;
              
              return (
                <div key={l.id} className="bg-app-bg-secondary rounded-xl p-3 border border-app-border/50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-bold">
                        {member?.name[0].toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-xs font-bold">{member?.name || 'অজানা সদস্য'}</div>
                        <div className="text-[9px] text-app-text-muted">📅 {l.date}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-orange-600">৳{fmt(remaining)} বাকি</div>
                      <div className="text-[9px] text-app-text-muted">মোট: ৳{fmt(l.total_payable)}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-[9px] mb-1 font-bold">
                    <span className="text-green-600">পরিশোধ: ৳{fmt(paid)}</span>
                    <span className="text-app-text-muted">{Math.round(progress)}% সম্পন্ন</span>
                  </div>
                  
                  <div className="h-1.5 w-full bg-orange-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 transition-all duration-500" 
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
