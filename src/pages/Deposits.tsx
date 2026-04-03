import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Deposit, User } from '../types';
import { Card } from '../components/Card';
import { cn } from '../lib/utils';
import { Wallet } from 'lucide-react';

import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface DepositsProps {
  currentUser: User;
  onAddDeposit: () => void;
}

export const Deposits: React.FC<DepositsProps> = ({ currentUser, onAddDeposit }) => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubDeps = onSnapshot(query(collection(db, 'deposits'), orderBy('date', 'desc')), (snap) => {
      setDeposits(snap.docs.map(d => ({ ...d.data(), id: d.id } as Deposit)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'deposits'));

    const unsubMem = onSnapshot(collection(db, 'members'), (snap) => {
      setMembers(snap.docs.map(d => ({ ...d.data(), id: d.id } as User)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'members'));

    return () => {
      unsubDeps(); unsubMem();
    };
  }, []);

  const isAdmin = currentUser.role === 'admin';
  let filteredDeps = deposits;
  if (filter !== 'all') {
    filteredDeps = filteredDeps.filter(d => d.month === filter);
  }

  const fmt = (num: number) => Math.round(num).toLocaleString('en-IN');
  const fmtMonth = (ms: string) => {
    if (!ms) return '';
    const mn = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const [y, m] = ms.split('-');
    return mn[parseInt(m) - 1] + ' ' + y;
  };

  // Generate month pills for filter
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ val: v, label: fmtMonth(v).split(' ')[0] + ' ' + d.getFullYear() });
  }

  return (
    <div className="space-y-4">
      <h3 className="font-serif text-base font-bold flex items-center gap-2">
        💰 মাসিক জমা
      </h3>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button 
          onClick={() => setFilter('all')}
          className={cn(
            "shrink-0 px-4 py-1.5 rounded-full text-[11px] font-bold border-2 transition-all",
            filter === 'all' ? "bg-primary text-white border-primary" : "bg-app-card text-app-text-muted border-app-border"
          )}
        >
          সব
        </button>
        {months.map(m => (
          <button 
            key={m.val}
            onClick={() => setFilter(m.val)}
            className={cn(
              "shrink-0 px-4 py-1.5 rounded-full text-[11px] font-bold border-2 transition-all",
              filter === m.val ? "bg-primary text-white border-primary" : "bg-app-card text-app-text-muted border-app-border"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-app-text-muted italic">লোড হচ্ছে...</div>
      ) : filteredDeps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-3 opacity-30">💸</div>
          <h3 className="text-sm font-bold text-app-text-secondary mb-1">কোনো জমা নেই</h3>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDeps.map((d) => {
            const m = members.find(mem => mem.id === d.member_id);
            return (
              <Card key={d.id} className="flex items-center gap-3 p-3">
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0",
                  d.fine ? "bg-red-50" : "bg-green-50"
                )}>
                  {d.fine ? '⚠️' : '💰'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{m?.name || 'মুছে ফেলা সদস্য'}</div>
                  <div className="text-[11px] text-app-text-muted mt-0.5">
                    {d.fine ? 'জরিমানা' : 'জমা'} • {fmtMonth(d.month)} • {d.date}
                  </div>
                  {d.note && <div className="text-[10px] text-app-text-muted italic mt-0.5 truncate">{d.note}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className={cn("text-sm font-bold", d.fine ? "text-danger" : "text-primary")}>
                    +৳{fmt(d.amount)}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {isAdmin && (
        <button 
          onClick={onAddDeposit}
          className="fixed bottom-[84px] right-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-all z-150"
        >
          <Wallet className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};
