import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { User, Deposit, Loan, Installment, Request } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { cn } from '../lib/utils';
import { User as UserIcon, FileText } from 'lucide-react';

import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface MyPageProps {
  currentUser: User;
  onEditProfile: () => void;
  onAction: (action: string) => void;
}

export const MyPage: React.FC<MyPageProps> = ({ currentUser, onEditProfile, onAction }) => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [tab, setTab] = useState<'overview' | 'requests'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubDeps = onSnapshot(query(collection(db, 'deposits'), where('member_id', '==', currentUser.id)), (snap) => {
      setDeposits(snap.docs.map(d => d.data() as Deposit));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'deposits'));

    const unsubLoans = onSnapshot(query(collection(db, 'loans'), where('member_id', '==', currentUser.id)), (snap) => {
      setLoans(snap.docs.map(d => ({ ...d.data(), id: d.id } as Loan)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'loans'));

    const unsubInst = onSnapshot(query(collection(db, 'installments'), where('member_id', '==', currentUser.id)), (snap) => {
      setInstallments(snap.docs.map(d => d.data() as Installment));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'installments'));

    const unsubReqs = onSnapshot(query(collection(db, 'requests'), where('member_id', '==', currentUser.id)), (snap) => {
      const reqs = snap.docs.map(d => ({ ...d.data(), id: d.id } as Request));
      // Sort client-side to avoid index requirement
      reqs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRequests(reqs);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'requests'));

    setLoading(false);
    return () => {
      unsubDeps(); unsubLoans(); unsubInst(); unsubReqs();
    };
  }, [currentUser.id]);

  const fmt = (num: number) => Math.round(num).toLocaleString('en-IN');
  const fmtMonth = (ms: string) => {
    if (!ms) return '';
    const mn = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const [y, m] = ms.split('-');
    return mn[parseInt(m) - 1] + ' ' + y;
  };

  const totalDep = deposits.reduce((s, d) => s + Number(d.amount), 0);
  const activeLoans = loans.filter(l => l.status === 'active');
  const totalInstPaid = installments.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-4">
      <div className="bg-linear-to-br from-primary-dark to-primary rounded-app p-5 text-white flex items-center gap-4 shadow-lg">
        <div className="w-[60px] h-[60px] rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold overflow-hidden shrink-0 border-2 border-white/30">
          {currentUser.photo ? <img src={currentUser.photo} alt={currentUser.name} className="w-full h-full object-cover" /> : currentUser.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold truncate">{currentUser.name}</div>
          <div className="text-xs opacity-80 mt-0.5">📞 {currentUser.phone}</div>
          <div className="text-[10px] opacity-65 mt-1">যোগদান: {currentUser.join_date || '?'}</div>
        </div>
        <Button size="sm" variant="outline" className="shrink-0 border-white/40 text-white h-8 px-3 rounded-lg text-[10px]" onClick={onEditProfile}>
          ✏️ এডিট
        </Button>
      </div>

      <div className="flex bg-app-bg-secondary rounded-lg p-1 mb-3">
        <button 
          onClick={() => setTab('overview')}
          className={cn("flex-1 text-center py-2 rounded-md text-xs font-bold transition-all", tab === 'overview' ? "bg-white text-primary shadow-sm" : "text-app-text-muted")}
        >
          আমার তথ্য
        </button>
        <button 
          onClick={() => setTab('requests')}
          className={cn("flex-1 text-center py-2 rounded-md text-xs font-bold transition-all", tab === 'requests' ? "bg-white text-primary shadow-sm" : "text-app-text-muted")}
        >
          আমার রিকোয়েস্ট
        </button>
      </div>

      {tab === 'overview' ? (
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-app-border/50 last:border-0">
              <span className="text-xs text-app-text-muted">মোট জমা</span>
              <span className="text-sm font-black text-primary">৳{fmt(totalDep)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-app-border/50 last:border-0">
              <span className="text-xs text-app-text-muted">সক্রিয় ঋণ</span>
              <span className="text-sm font-black text-danger">{activeLoans.length}টি</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-app-border/50 last:border-0">
              <span className="text-xs text-app-text-muted">মোট কিস্তি পরিশোধ</span>
              <span className="text-sm font-black text-blue-600">৳{fmt(totalInstPaid)}</span>
            </div>
          </Card>

          {activeLoans.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-danger uppercase tracking-wider">🔴 আমার সক্রিয় ঋণ</h4>
              {activeLoans.map(l => {
                const paid = installments.filter(i => i.loan_id === l.id).reduce((s, i) => s + Number(i.amount), 0);
                const pct = Math.min(100, Math.round(paid / Number(l.total_payable) * 100) || 0);
                const rem = Math.max(0, Number(l.total_payable) - paid);
                return (
                  <Card key={l.id} className="p-3.5 border-l-4 border-danger">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-bold">৳{fmt(l.amount)} ঋণ</div>
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-red-50 text-danger rounded-full">সক্রিয়</span>
                    </div>
                    <div className="text-[10px] text-app-text-muted mb-3">{l.date}{l.purpose ? ` • ${l.purpose}` : ''}</div>
                    <div className="h-1.5 bg-app-bg-secondary rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-danger rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-app-text-muted mb-3">
                      <span>দেওয়া: ৳{fmt(paid)} ({pct}%)</span>
                      <span>বাকি: ৳{fmt(rem)}</span>
                    </div>
                    <Button size="sm" className="w-full h-8 text-[10px]" onClick={() => onAction('req_installment')}>
                      📲 কিস্তির রিকোয়েস্ট
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-3 opacity-30">📭</div>
              <h3 className="text-sm font-bold text-app-text-secondary mb-1">কোনো রিকোয়েস্ট নেই</h3>
              <p className="text-xs text-app-text-muted">কুইক অ্যাকশন থেকে রিকোয়েস্ট পাঠান</p>
            </div>
          ) : (
            requests.map(r => {
              const statusLabel = r.status === 'pending' ? '⏳ অপেক্ষমান' : r.status === 'approved' ? '✅ অনুমোদিত' : '❌ বাতিল';
              const statusColor = r.status === 'pending' ? 'bg-amber-50 text-amber-600' : r.status === 'approved' ? 'bg-green-50 text-primary' : 'bg-red-50 text-danger';
              
              let details = '';
              if (r.type === 'deposit') details = `৳${fmt(r.data.amount)} • ${fmtMonth(r.data.month)}`;
              else if (r.type === 'loan') details = `৳${fmt(r.data.amount)} • ${r.data.installments} কিস্তি`;
              else details = `৳${fmt(r.data.amount)} কিস্তি`;

              return (
                <Card key={r.id} className={cn("p-3.5 border-l-4", r.status === 'approved' ? "border-primary" : r.status === 'rejected' ? "border-danger" : "border-accent")}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-xs font-bold">{r.type === 'deposit' ? '💰 জমা' : r.type === 'loan' ? '🏦 ঋণ' : '📲 কিস্তি'} রিকোয়েস্ট</div>
                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", statusColor)}>{statusLabel}</span>
                  </div>
                  <div className="text-[11px] text-app-text-secondary">{details}</div>
                  <div className="text-[9px] text-app-text-muted mt-2">{r.created_at.split('T')[0]}</div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
