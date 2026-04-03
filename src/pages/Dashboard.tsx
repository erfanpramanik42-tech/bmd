import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { Deposit, Loan, Installment, Investment, Expense, User, CashEntry } from '../types';
import { Card } from '../components/Card';
import { cn } from '../lib/utils';

import { 
  TrendingUp, 
  Wallet, 
  Landmark, 
  Receipt, 
  ArrowDownLeft, 
  ArrowUpRight,
  PiggyBank,
  HandCoins,
  CreditCard,
  BarChart3,
  Users,
  CheckCircle2,
  History,
  Clock,
  UserPlus
} from 'lucide-react';

import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface DashboardProps {
  currentUser: User;
  onAction: (action: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, onAction }) => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [membersCount, setMembersCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'deposit' | 'loan' | 'investment' | 'expense'>('all');

  const getCategoryIcon = (category: string, type: 'in' | 'out') => {
    switch (category) {
      case 'deposit':
        return <PiggyBank className="w-4 h-4" />;
      case 'loan':
        return <HandCoins className="w-4 h-4" />;
      case 'investment':
        return <BarChart3 className="w-4 h-4" />;
      case 'expense':
        return <Receipt className="w-4 h-4" />;
      default:
        return type === 'in' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    const unsubDeps = onSnapshot(collection(db, 'deposits'), (snap) => {
      setDeposits(snap.docs.map(d => ({ ...d.data(), id: d.id } as Deposit)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'deposits'));

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

    const unsubMem = onSnapshot(collection(db, 'members'), (snap) => {
      setMembersCount(snap.size);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'members'));

    let unsubReqs = () => {};
    if (currentUser.role === 'admin') {
      unsubReqs = onSnapshot(query(collection(db, 'requests'), where('status', '==', 'pending')), (snap) => {
        setPendingRequestsCount(snap.size);
      }, (error) => handleFirestoreError(error, OperationType.GET, 'requests'));
    }

    return () => {
      unsubDeps(); unsubLoans(); unsubInst(); unsubInv(); unsubExp(); unsubMem(); unsubCash(); unsubReqs();
    };
  }, []);

  const n = (v: any) => Number(v) || 0;
  const fmt = (num: number) => Math.round(num).toLocaleString('en-IN');

  const totalDeposits = deposits.reduce((s, d) => s + n(d.amount), 0);
  const totalInstPaid = installments.reduce((s, i) => s + n(i.amount), 0);
  const totalLoanGiven = loans.reduce((s, l) => s + n(l.amount), 0);
  const totalActiveInv = investments.filter(i => i.status === 'active').reduce((s, i) => s + n(i.amount), 0);
  const totalReceivedProfit = investments.filter(i => i.status === 'received')
    .reduce((s, i) => s + n(i.received_amount) - n(i.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + n(e.amount), 0);
  const totalCashAdded = cashEntries.reduce((s, e) => s + (e.type === 'in' ? n(e.amount) : -n(e.amount)), 0);

  const totalFund = totalDeposits + totalInstPaid + totalReceivedProfit + totalCashAdded - totalLoanGiven - totalActiveInv - totalExpenses;

  const activeLoans = loans.filter(l => l.status === 'active');
  const activeLoanPrincipalTotal = activeLoans.reduce((s, l) => s + n(l.amount), 0);
  const activeLoanInterestTotal = activeLoans.reduce((s, l) => s + n(l.total_interest), 0);

  const interestEarned = installments.reduce((s, i) => {
    const l = loans.find(ln => ln.id === i.loan_id);
    if (!l || !l.total_payable || !l.total_interest) return s;
    return s + n(i.amount) * (n(l.total_interest) / n(l.total_payable));
  }, 0);

  const totalFine = deposits.filter(d => d.fine).reduce((s, d) => s + n(d.amount), 0);

  // Combine all transactions for the recent list
  const allTransactions = [
    ...deposits.map(d => ({ id: d.id, title: 'জমা', amount: d.amount, date: d.date, type: 'in' as const, category: 'deposit' })),
    ...installments.map(i => ({ id: i.id, title: 'কিস্তি', amount: i.amount, date: i.date, type: 'in' as const, category: 'deposit' })),
    ...loans.map(l => ({ id: l.id, title: 'ঋণ প্রদান', amount: l.amount, date: l.date, type: 'out' as const, category: 'loan' })),
    ...expenses.map(e => ({ id: e.id, title: e.title, amount: e.amount, date: e.date, type: e.type || 'out', category: 'expense' })),
    ...cashEntries.map(c => ({ id: c.id, title: c.title, amount: c.amount, date: c.date, type: c.type, category: 'expense' })),
    ...investments.filter(i => i.status === 'received').map(i => ({ 
      id: i.id, 
      title: `বিনিয়োগ ফেরত: ${i.title}`, 
      amount: i.received_amount || 0, 
      date: i.received_date || i.invest_date, 
      type: 'in' as const,
      category: 'investment'
    })),
    ...investments.filter(i => i.status === 'active').map(i => ({ 
      id: i.id, 
      title: `বিনিয়োগ: ${i.title}`, 
      amount: i.amount, 
      date: i.invest_date, 
      type: 'out' as const,
      category: 'investment'
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTransactions = activeTab === 'all' 
    ? allTransactions.slice(0, 15) 
    : allTransactions.filter(tx => tx.category === activeTab).slice(0, 15);

  return (
    <div className="space-y-4">
      <div className="bg-linear-to-br from-primary-dark to-primary rounded-app p-5 text-white relative overflow-hidden shadow-lg">
        <div className="absolute right-[-8px] top-[-16px] text-[120px] opacity-[0.06] font-bold">৳</div>
        <div className="text-xs opacity-80 mb-1">মোট ফান্ড ব্যালেন্স</div>
        <div className="text-3xl font-bold tracking-tight">
          <small className="text-base font-medium">৳</small> {fmt(totalFund)}
        </div>
        
        {activeLoans.length > 0 && (
          <div className="text-[11px] opacity-75 mt-1.5 flex items-center gap-1.5">
            <span>সক্রিয় ঋণ: ৳{fmt(activeLoanPrincipalTotal)}</span>
            <span className="opacity-60">+</span>
            <span className="text-accent font-bold">মুনাফা: ৳{fmt(activeLoanInterestTotal)}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
          <div className="space-y-0.5">
            <div className="text-[13px] font-bold text-accent">৳{fmt(interestEarned + totalReceivedProfit)}</div>
            <div className="text-[11px] opacity-85">মোট অর্জিত মুনাফা</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[13px] font-bold">৳{fmt(totalFine)}</div>
            <div className="text-[11px] opacity-85">মোট জরিমানা</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[13px] font-bold">৳{fmt(totalActiveInv)}</div>
            <div className="text-[11px] opacity-85">বিনিয়োগ চলমান</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[13px] font-bold">৳{fmt(totalExpenses)}</div>
            <div className="text-[11px] opacity-85">ব্যয় হয়েছে</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {currentUser.role === 'admin' ? (
          <>
            <QuickAction icon={<UserPlus className="w-6 h-6 text-blue-600" />} label="সদস্য যোগ" onClick={() => onAction('add_member')} />
            <QuickAction icon={<Wallet className="w-6 h-6 text-amber-600" />} label="জমা" onClick={() => onAction('add_deposit')} />
            <QuickAction icon={<Landmark className="w-6 h-6 text-primary" />} label="ঋণ দিন" onClick={() => onAction('add_loan')} />
            <QuickAction icon={<span className="text-2xl">📲</span>} label="কিস্তি" onClick={() => onAction('add_installment')} />
          </>
        ) : (
          <>
            <QuickAction icon={<Wallet className="w-6 h-6 text-amber-600" />} label="জমা রিকোয়েস্ট" onClick={() => onAction('req_deposit')} />
            <QuickAction icon={<Landmark className="w-6 h-6 text-primary" />} label="ঋণ রিকোয়েস্ট" onClick={() => onAction('req_loan')} />
            <QuickAction icon={<span className="text-2xl">📲</span>} label="কিস্তি রিকোয়েস্ট" onClick={() => onAction('req_installment')} />
            <QuickAction icon={<Users className="w-6 h-6 text-blue-600" />} label="আমার তথ্য" onClick={() => onAction('goto_mypage')} />
          </>
        )}
      </div>

      {currentUser.role === 'admin' && pendingRequestsCount > 0 && (
        <Card className="bg-accent/10 border-accent/20 p-4 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center text-xl shadow-lg">
              🔔
            </div>
            <div>
              <div className="text-sm font-bold text-accent">{pendingRequestsCount}টি নতুন অনুরোধ</div>
              <div className="text-[10px] text-app-text-muted">অনুমোদনের জন্য অপেক্ষা করছে</div>
            </div>
          </div>
          <button 
            onClick={() => onAction('goto_requests')}
            className="px-4 py-2 bg-accent text-white rounded-full text-[10px] font-bold shadow-md active:scale-95 transition-all"
          >
            দেখুন
          </button>
        </Card>
      )}

      {/* Active Investments Section */}
      {investments.filter(i => i.status === 'active').length > 0 && (
        <div className="space-y-2.5">
          <h3 className="font-serif text-base font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> চলমান বিনিয়োগ
          </h3>
          <div className="space-y-2">
            {investments.filter(i => i.status === 'active').map(inv => (
              <Card key={inv.id} className="p-3 bg-linear-to-br from-blue-50 to-white border-blue-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-xs font-bold text-blue-900">{inv.title}</div>
                    <div className="text-[10px] text-app-text-muted">📅 {inv.invest_date}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-blue-600">৳{fmt(inv.amount)}</div>
                    <div className="text-[9px] text-app-text-muted">বিনিয়োগকৃত</div>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-blue-100/50">
                  <div className="text-[10px] text-app-text-muted">সম্ভাব্য লাভ: <span className="text-green-600 font-bold">৳{fmt(inv.expected_return)}</span></div>
                  <div className="text-[9px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-bold uppercase tracking-wider">চলমান</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard icon={<Users className="w-5 h-5" />} value={membersCount} label="মোট সদস্য" color="primary" />
        <StatCard icon={<Wallet className="w-5 h-5" />} value={`৳${fmt(totalDeposits)}`} label="মোট জমা" color="accent" />
        <StatCard icon={<HandCoins className="w-5 h-5" />} value={activeLoans.length} label="সক্রিয় ঋণ" color="danger" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} value={loans.filter(l => l.status === 'completed').length} label="সম্পন্ন ঋণ" color="blue" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> সাম্প্রতিক লেনদেন
          </h3>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'সব', icon: <TrendingUp className="w-3 h-3" /> },
            { id: 'deposit', label: 'জমা', icon: <PiggyBank className="w-3 h-3" /> },
            { id: 'loan', label: 'ঋণ', icon: <HandCoins className="w-3 h-3" /> },
            { id: 'investment', label: 'বিনিয়োগ', icon: <BarChart3 className="w-3 h-3" /> },
            { id: 'expense', label: 'খরচ', icon: <Receipt className="w-3 h-3" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border flex items-center gap-1.5",
                activeTab === tab.id 
                  ? "bg-primary text-white border-primary shadow-md" 
                  : "bg-white text-app-text-muted border-app-border"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className={cn(
          "space-y-2 pr-1",
          filteredTransactions.length > 5 && "max-h-[340px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200"
        )}>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-app-text-muted text-sm italic bg-app-card rounded-xl border border-dashed border-app-border">
              এই ক্যাটাগরিতে কোনো লেনদেন পাওয়া যায়নি
            </div>
          ) : (
            filteredTransactions.map((tx, idx) => (
              <div key={`${tx.id}-${idx}`} className="flex items-center justify-between p-3 bg-app-card rounded-xl border border-app-border shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center relative",
                    tx.type === 'in' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  )}>
                    {getCategoryIcon(tx.category, tx.type)}
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-bold",
                      tx.type === 'in' ? "bg-green-500 text-white" : "bg-red-500 text-white"
                    )}>
                      {tx.type === 'in' ? '↓' : '↑'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-app-text-primary">{tx.title}</div>
                    <div className="text-[9px] text-app-text-muted">{tx.date}</div>
                  </div>
                </div>
                <div className={cn(
                  "text-xs font-black",
                  tx.type === 'in' ? "text-green-600" : "text-red-600"
                )}>
                  {tx.type === 'in' ? '+' : '-'} ৳{fmt(tx.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const QuickAction = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-1.5 p-3 bg-app-card rounded-app-sm shadow-app active:scale-95 transition-all border border-app-border/50"
  >
    <div className="mb-0.5">{icon}</div>
    <span className="text-[10px] font-bold text-app-text-secondary text-center leading-tight">{label}</span>
  </button>
);

const StatCard = ({ icon, value, label, color }: { icon: React.ReactNode, value: string | number, label: string, color: string }) => (
  <div className={cn(
    "p-3.5 rounded-app border-1.5 flex flex-col gap-1 shadow-app bg-app-card",
    color === 'primary' && "border-primary/25",
    color === 'accent' && "border-accent/25",
    color === 'danger' && "border-danger/25",
    color === 'blue' && "border-blue-500/25"
  )}>
    <div className={cn(
      "mb-1",
      color === 'primary' && "text-primary",
      color === 'accent' && "text-amber-600",
      color === 'danger' && "text-danger",
      color === 'blue' && "text-blue-600"
    )}>{icon}</div>
    <div className={cn(
      "text-xl font-extrabold tracking-tight leading-none",
      color === 'primary' && "text-primary",
      color === 'accent' && "text-amber-600",
      color === 'danger' && "text-danger",
      color === 'blue' && "text-blue-600"
    )}>{value}</div>
    <div className="text-[10px] text-app-text-muted font-medium">{label}</div>
  </div>
);
