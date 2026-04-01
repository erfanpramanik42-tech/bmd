import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, doc, deleteDoc } from 'firebase/firestore';
import { User, Deposit, Loan, Installment } from '../types';
import { Modal } from './Modal';
import { Button } from './Button';
import { cn } from '../lib/utils';
import { Phone, MapPin, Calendar, Edit2, Trash2, X, Hourglass, CheckCircle2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface MemberDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  member: User | null;
  currentUser: User;
  onEdit: (member: User) => void;
  showToast: (msg: string) => void;
}

const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export const MemberDetails: React.FC<MemberDetailsProps> = ({
  isOpen, onClose, member, currentUser, onEdit, showToast
}) => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!member || !isOpen) return;

    const unsubDeps = onSnapshot(
      query(collection(db, 'deposits'), where('member_id', '==', member.id)),
      (snap) => setDeposits(snap.docs.map(d => ({ ...d.data(), id: d.id } as Deposit))),
      (error) => handleFirestoreError(error, OperationType.GET, 'deposits')
    );

    const unsubLoans = onSnapshot(
      query(collection(db, 'loans'), where('member_id', '==', member.id)),
      (snap) => setLoans(snap.docs.map(d => ({ ...d.data(), id: d.id } as Loan))),
      (error) => handleFirestoreError(error, OperationType.GET, 'loans')
    );

    const unsubInst = onSnapshot(
      query(collection(db, 'installments'), where('member_id', '==', member.id)),
      (snap) => setInstallments(snap.docs.map(d => ({ ...d.data(), id: d.id } as Installment))),
      (error) => handleFirestoreError(error, OperationType.GET, 'installments')
    );

    return () => {
      unsubDeps(); unsubLoans(); unsubInst();
    };
  }, [member, isOpen]);

  if (!member) return null;

  const n = (v: any) => Number(v) || 0;
  const fmt = (num: number) => Math.round(num).toLocaleString('en-IN');

  const totalDeposit = deposits.filter(d => !d.fine).reduce((s, d) => s + n(d.amount), 0);
  const totalLoanAmount = loans.reduce((s, l) => s + n(l.amount), 0);
  const activeLoans = loans.filter(l => l.status === 'active');
  const totalInstallmentPaid = installments.reduce((s, i) => s + n(i.amount), 0);

  const handleDelete = async () => {
    if (!window.confirm('আপনি কি নিশ্চিতভাবে এই সদস্যকে মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'members', member.id));
      showToast('✅ সদস্য মুছে ফেলা হয়েছে');
      onClose();
    } catch (e) {
      showToast('❌ মুছতে ব্যর্থ হয়েছে');
    }
  };

  const getMonthStatus = (monthIdx: number) => {
    const monthStr = `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}`;
    const deposit = deposits.find(d => d.month === monthStr && !d.fine);
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const isFuture = selectedYear > currentYear || (selectedYear === currentYear && monthIdx > currentMonth);
    const isPastOrCurrent = !isFuture;

    if (deposit) return { label: 'দিয়েছেন', status: 'paid', amount: deposit.amount };
    if (isFuture) return { label: 'আসেনি', status: 'future' };
    return { label: 'দেননি', status: 'missed' };
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" noPadding hideHeader>
      <div className="bg-app-bg min-h-[80vh] flex flex-col">
        {/* Profile Header */}
        <div className="bg-linear-to-br from-primary-dark to-primary p-6 pb-8 rounded-b-[32px] text-white relative shadow-lg">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white active:scale-90 transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-yellow-400 to-green-500 border-4 border-white/20 flex items-center justify-center text-3xl font-bold shadow-inner overflow-hidden shrink-0">
              {member.photo ? (
                <img src={member.photo} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                member.name[0].toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{member.name}</h2>
              <div className="flex items-center gap-1.5 text-white/80 text-xs mt-1">
                <Phone className="w-3 h-3" />
                <span>{member.phone}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/70 text-[10px] mt-1.5">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{member.address || 'ঠিকানা দেওয়া নেই'}</span>
                <span className="mx-1">•</span>
                <Calendar className="w-3 h-3" />
                <span>যোগদান: {member.join_date || 'অজানা'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 -mt-4">
          {/* Stats Card */}
          <div className="bg-white rounded-2xl shadow-app overflow-hidden divide-y divide-app-border">
            <div className="flex justify-between items-center p-3 px-4">
              <span className="text-sm text-app-text-secondary">মোট জমা</span>
              <span className="text-sm font-bold text-primary">৳{fmt(totalDeposit)}</span>
            </div>
            <div className="flex justify-between items-center p-3 px-4">
              <span className="text-sm text-app-text-secondary">মোট ঋণ</span>
              <span className="text-sm font-bold text-app-text-primary">{loans.length}টি</span>
            </div>
            <div className="flex justify-between items-center p-3 px-4">
              <span className="text-sm text-app-text-secondary">সক্রিয় ঋণ</span>
              <span className="text-sm font-bold text-danger">{activeLoans.length}টি</span>
            </div>
            <div className="flex justify-between items-center p-3 px-4">
              <span className="text-sm text-app-text-secondary">মোট কিস্তি পরিশোধ</span>
              <span className="text-sm font-bold text-app-text-primary">৳{fmt(totalInstallmentPaid)}</span>
            </div>
          </div>

          {/* Annual History Card */}
          <div className="bg-white rounded-2xl shadow-app p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                📅 বার্ষিক জমার হিসাব
              </h3>
              <input 
                type="number" 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-24 p-1.5 px-3 border-2 border-app-border rounded-lg text-sm font-bold outline-none focus:border-primary transition-all text-center"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {MONTHS_BN.map((m, i) => {
                const { label, status, amount } = getMonthStatus(i);
                return (
                  <div 
                    key={i}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all flex items-center justify-between",
                      status === 'paid' ? "bg-green-50 border-green-100" : 
                      status === 'missed' ? "bg-red-50 border-red-100" : 
                      "bg-white border-app-border"
                    )}
                  >
                    <div>
                      <div className="text-[11px] font-bold text-app-text-primary">{m}</div>
                      <div className={cn(
                        "text-[10px] font-semibold mt-0.5",
                        status === 'paid' ? "text-primary" : 
                        status === 'missed' ? "text-danger" : 
                        "text-app-text-muted"
                      )}>
                        {status === 'paid' ? `৳${fmt(amount || 0)}` : label}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {status === 'paid' && <CheckCircle2 className="w-5 h-5 text-primary" />}
                      {status === 'missed' && <X className="w-5 h-5 text-danger" />}
                      {status === 'future' && <Hourglass className="w-5 h-5 text-app-text-muted opacity-50" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="gray" 
              className="flex-1 py-3.5 rounded-xl font-bold"
              onClick={onClose}
            >
              বন্ধ
            </Button>
            {currentUser.role === 'admin' && (
              <>
                <button 
                  onClick={() => onEdit(member)}
                  className="w-14 h-14 bg-white border-2 border-app-border rounded-xl flex flex-col items-center justify-center text-primary active:scale-95 transition-all shadow-sm"
                >
                  <Edit2 className="w-5 h-5" />
                  <span className="text-[9px] font-bold mt-1">এডিট</span>
                </button>
                <button 
                  onClick={handleDelete}
                  className="w-14 h-14 bg-danger text-white rounded-xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-md"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="text-[9px] font-bold mt-1">মুছুন</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
