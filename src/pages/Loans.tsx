import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Loan, User, Installment } from '../types';
import { Card } from '../components/Card';
import { cn } from '../lib/utils';
import { Landmark } from 'lucide-react';

import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface LoansProps {
  currentUser: User;
  onAddLoan: () => void;
  onInstallment: (loanId: string) => void;
}

export const Loans: React.FC<LoansProps> = ({ currentUser, onAddLoan, onInstallment }) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [memberTab, setMemberTab] = useState<'mine' | 'others'>('mine');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubLoans = onSnapshot(query(collection(db, 'loans'), orderBy('date', 'desc')), (snap) => {
      setLoans(snap.docs.map(d => ({ ...d.data(), id: d.id } as Loan)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'loans'));

    const unsubMem = onSnapshot(collection(db, 'members'), (snap) => {
      setMembers(snap.docs.map(d => ({ ...d.data(), id: d.id } as User)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'members'));

    const unsubInst = onSnapshot(collection(db, 'installments'), (snap) => {
      setInstallments(snap.docs.map(d => d.data() as Installment));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'installments'));

    return () => {
      unsubLoans(); unsubMem(); unsubInst();
    };
  }, []);

  const isAdmin = currentUser.role === 'admin';
  let filteredLoans = loans;

  if (isAdmin) {
    if (filter === 'active') filteredLoans = loans.filter(l => l.status === 'active');
    if (filter === 'completed') filteredLoans = loans.filter(l => l.status === 'completed');
  } else {
    if (memberTab === 'mine') {
      filteredLoans = loans.filter(l => l.member_id === currentUser.id);
    } else {
      filteredLoans = loans.filter(l => l.member_id !== currentUser.id);
    }
    if (filter === 'active') filteredLoans = filteredLoans.filter(l => l.status === 'active');
    if (filter === 'completed') filteredLoans = filteredLoans.filter(l => l.status === 'completed');
  }

  const fmt = (num: number) => Math.round(num).toLocaleString('en-IN');

  return (
    <div className="space-y-4">
      <h3 className="font-serif text-base font-bold flex items-center gap-2">
        🏦 ঋণ ব্যবস্থাপনা
      </h3>

      {isAdmin ? (
        <div className="flex bg-app-bg-secondary rounded-lg p-1 mb-3">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-1 text-center py-2 rounded-md text-xs font-bold transition-all",
                filter === f ? "bg-white text-primary shadow-sm" : "text-app-text-muted"
              )}
            >
              {f === 'all' ? 'সব' : f === 'active' ? 'সক্রিয়' : 'সম্পন্ন'}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex bg-app-bg-secondary rounded-lg p-1 mb-3">
          {(['mine', 'others'] as const).map((t) => (
            <button 
              key={t}
              onClick={() => setMemberTab(t)}
              className={cn(
                "flex-1 text-center py-2 rounded-md text-xs font-bold transition-all",
                memberTab === t ? "bg-white text-primary shadow-sm" : "text-app-text-muted"
              )}
            >
              {t === 'mine' ? 'আমার ঋণ' : 'অন্যদের ঋণ'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-app-text-muted italic">লোড হচ্ছে...</div>
      ) : filteredLoans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-3 opacity-30">🏦</div>
          <h3 className="text-sm font-bold text-app-text-secondary mb-1">
            {!isAdmin && memberTab === 'mine' ? 'আপনার কোনো ঋণ নেই' : 'কোনো ঋণ নেই'}
          </h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLoans.map((l) => {
            const m = members.find(mem => mem.id === l.member_id);
            const paid = installments.filter(i => i.loan_id === l.id).reduce((s, i) => s + Number(i.amount), 0);
            const tp = Number(l.total_payable);
            const rem = Math.max(0, tp - paid);
            const pct = Math.min(100, Math.round(paid / tp * 100) || 0);

            return (
              <Card key={l.id} className={cn("border-l-4", l.status === 'completed' ? "border-app-text-muted opacity-75" : "border-primary")}>
                <div className="flex justify-between items-start mb-2.5">
                  <div>
                    <div className="text-sm font-bold">{m?.name || 'মুছে ফেলা সদস্য'}</div>
                    <div className="text-[11px] text-app-text-muted mt-0.5">📅 {l.date}{l.purpose ? ` • ${l.purpose}` : ''}</div>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    l.status === 'active' ? "bg-red-50 text-danger" : "bg-green-50 text-primary"
                  )}>
                    {l.status === 'active' ? '🔴 সক্রিয়' : '✅ সম্পন্ন'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center">
                    <div className="text-xs font-bold">৳{fmt(l.amount)}</div>
                    <div className="text-[9px] text-app-text-muted mt-0.5">মূল ঋণ</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold">৳{fmt(l.total_interest)}</div>
                    <div className="text-[9px] text-app-text-muted mt-0.5">মুনাফা</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold">৳{fmt(l.monthly_installment)}</div>
                    <div className="text-[9px] text-app-text-muted mt-0.5">মাসিক কিস্তি</div>
                  </div>
                </div>

                <div className="h-1.5 bg-app-bg-secondary rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-linear-to-r from-primary to-primary-light rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>

                <div className="flex justify-between text-[10px] text-app-text-muted font-medium">
                  <span>পরিশোধ: ৳{fmt(paid)} ({pct}%)</span>
                  <span>বাকি: ৳{fmt(rem)}</span>
                </div>

                {isAdmin && l.status === 'active' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-app-border">
                    <button 
                      onClick={() => onInstallment(l.id)}
                      className="flex-1 py-1.5 bg-primary text-white text-[11px] font-bold rounded-md active:scale-95 transition-all"
                    >
                      💳 কিস্তি নিন
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {isAdmin && (
        <button 
          onClick={onAddLoan}
          className="fixed bottom-[84px] right-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-all z-150"
        >
          <Landmark className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};
