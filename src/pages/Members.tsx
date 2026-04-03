import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { User, Deposit, Loan, Installment } from '../types';
import { Card } from '../components/Card';
import { cn } from '../lib/utils';
import { Search, UserPlus } from 'lucide-react';

import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface MembersProps {
  currentUser: User;
  onMemberClick: (member: User) => void;
  onAddMember: () => void;
}

export const Members: React.FC<MembersProps> = ({ currentUser, onMemberClick, onAddMember }) => {
  const [members, setMembers] = useState<User[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubMem = onSnapshot(collection(db, 'members'), (snap) => {
      setMembers(snap.docs.map(d => ({ ...d.data(), id: d.id } as User)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'members'));

    const unsubDeps = onSnapshot(collection(db, 'deposits'), (snap) => {
      setDeposits(snap.docs.map(d => d.data() as Deposit));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'deposits'));

    const unsubLoans = onSnapshot(collection(db, 'loans'), (snap) => {
      setLoans(snap.docs.map(d => d.data() as Loan));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'loans'));

    const unsubInst = onSnapshot(collection(db, 'installments'), (snap) => {
      setInstallments(snap.docs.map(d => d.data() as Installment));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'installments'));

    return () => {
      unsubMem(); unsubDeps(); unsubLoans(); unsubInst();
    };
  }, []);

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.phone.includes(search)
  );

  const n = (v: any) => Number(v) || 0;
  const fmt = (num: number) => Math.round(num).toLocaleString('en-IN');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base font-bold flex items-center gap-2">
          👥 সদস্য তালিকা
        </h3>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-muted" />
        <input 
          type="text" 
          placeholder="সদস্য খুঁজুন..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-app-card border-2 border-transparent focus:border-primary rounded-app-sm shadow-app outline-none text-sm transition-all"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-app-text-muted italic">লোড হচ্ছে...</div>
      ) : filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-3 opacity-30">👤</div>
          <h3 className="text-sm font-bold text-app-text-secondary mb-1">
            {search ? 'কোনো ফলাফল নেই' : 'কোনো সদস্য নেই'}
          </h3>
          <p className="text-xs text-app-text-muted">
            {currentUser.role === 'admin' ? 'সদস্য যোগ করতে নিচের বাটনে চাপ দিন' : 'অ্যাডমিন এখনো কাউকে যোগ করেননি'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map((m) => {
            const memberDeps = deposits.filter(d => d.member_id === m.id);
            const totalDep = memberDeps.reduce((s, d) => s + n(d.amount), 0);
            
            const activeLoans = loans.filter(l => {
              if (l.member_id !== m.id) return false;
              if (l.status === 'completed') return false;
              const paid = installments.filter(i => i.loan_id === l.id).reduce((s, i) => s + n(i.amount), 0);
              return paid < n(l.total_payable) - 0.01;
            });

            const isMe = currentUser.role === 'member' && currentUser.id === m.id;

            return (
              <Card 
                key={m.id} 
                onClick={() => onMemberClick(m)}
                className="flex items-center gap-3 p-3"
              >
                <div className="w-11 h-11 rounded-full bg-linear-to-br from-primary-light to-accent flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0">
                  {m.photo ? <img src={m.photo} alt={m.name} className="w-full h-full object-cover" /> : m.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate flex items-center gap-1.5">
                    {m.name}
                    {isMe && <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded-full">আমি</span>}
                  </div>
                  <div className="text-[11px] text-app-text-muted mt-0.5">📞 {m.phone}</div>
                  <div className="text-[11px] text-primary font-semibold mt-1">
                    জমা: ৳{fmt(totalDep)} {activeLoans.length > 0 ? `• 🔴 ঋণ: ${activeLoans.length}টি` : '• ✅ ঋণমুক্ত'}
                  </div>
                </div>
                <div className="shrink-0">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-full",
                    activeLoans.length > 0 ? "bg-red-50 text-danger" : "bg-green-50 text-primary"
                  )}>
                    {activeLoans.length > 0 ? 'ঋণ' : 'মুক্ত'}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {currentUser.role === 'admin' && (
        <button 
          onClick={onAddMember}
          className="fixed bottom-[84px] right-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-all z-150"
        >
          <UserPlus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};
