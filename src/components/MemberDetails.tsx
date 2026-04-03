import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, doc, deleteDoc } from 'firebase/firestore';
import { User, Deposit, Loan, Installment } from '../types';
import { Modal } from './Modal';
import { Button } from './Button';
import { cn } from '../lib/utils';
import { Phone, MapPin, Calendar, Edit2, Trash2, X, Hourglass, CheckCircle2, Wallet, Landmark, Receipt, History, ArrowRight } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { motion, AnimatePresence } from 'motion/react';

interface MemberDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  member: User | null;
  currentUser: User;
  onEdit: (member: User) => void;
  showToast: (msg: string) => void;
}

const MONTHS_BN = [
  'জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'
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

    if (deposit) return { label: 'দিয়েছেন', status: 'paid', amount: deposit.amount };
    if (isFuture) return { label: 'আসেনি', status: 'future' };
    return { label: 'দেননি', status: 'missed' };
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" noPadding hideHeader>
      <div className="bg-app-bg min-h-[90vh] flex flex-col pb-8">
        {/* Profile Header - Immersive & Premium */}
        <div className="relative h-56 shrink-0 overflow-hidden rounded-b-[48px] shadow-2xl">
          {/* Background Image/Gradient */}
          <div className="absolute inset-0 bg-linear-to-br from-primary-dark via-primary to-primary-light">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.4),transparent)]" />
          </div>

          <button 
            onClick={onClose}
            className="absolute top-5 right-5 w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-white active:scale-90 transition-all z-20"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute inset-0 flex flex-col items-center justify-center pb-6">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="relative"
            >
              <div className="w-28 h-28 rounded-full bg-white/10 backdrop-blur-md border-4 border-white/30 flex items-center justify-center text-4xl font-bold shadow-2xl overflow-hidden mb-3">
                {member.photo ? (
                  <img src={member.photo} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="font-serif text-white">{member.name[0].toUpperCase()}</span>
                )}
              </div>
              {currentUser.role === 'admin' && (
                <button 
                  onClick={() => onEdit(member)}
                  className="absolute bottom-2 right-0 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center shadow-lg border-2 border-primary active:scale-90 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </motion.div>
            <motion.h2 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold font-serif text-white tracking-tight"
            >
              {member.name}
            </motion.h2>
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mt-1 text-white/90 text-sm font-medium"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{member.phone}</span>
            </motion.div>
          </div>
        </div>

        <div className="px-5 space-y-5 -mt-8 relative z-10">
          {/* Stats Bento Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard 
              icon={<Wallet className="w-4 h-4" />} 
              label="মোট সঞ্চয়" 
              value={`৳${fmt(totalDeposit)}`} 
              color="text-primary"
              bgColor="bg-primary/10"
              delay={0.3}
            />
            <StatCard 
              icon={<Landmark className="w-4 h-4" />} 
              label="চলমান ঋণ" 
              value={`${activeLoans.length}টি`} 
              color="text-danger"
              bgColor="bg-danger/10"
              delay={0.4}
            />
            <StatCard 
              icon={<Receipt className="w-4 h-4" />} 
              label="পরিশোধিত কিস্তি" 
              value={`৳${fmt(totalInstallmentPaid)}`} 
              color="text-blue-600"
              bgColor="bg-blue-600/10"
              delay={0.5}
            />
            <StatCard 
              icon={<History className="w-4 h-4" />} 
              label="মোট ঋণ সংখ্যা" 
              value={`${loans.length}টি`} 
              color="text-app-text-secondary"
              bgColor="bg-app-bg-secondary"
              delay={0.6}
            />
          </div>

          {/* Quick Info Bar */}
          <div className="bg-white/80 backdrop-blur-md border border-white/50 rounded-2xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-wider">যোগদান</div>
                <div className="text-xs font-bold text-app-text-secondary">{member.join_date || 'অজানা'}</div>
              </div>
            </div>
            <div className="h-8 w-px bg-app-border/50" />
            <div className="flex items-center gap-2 flex-1 min-w-0 ml-2">
              <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-wider">ঠিকানা</div>
                <div className="text-xs font-bold text-app-text-secondary break-words">{member.address || 'দেওয়া নেই'}</div>
              </div>
            </div>
          </div>

          {/* Personal Details Section */}
          <div className="bg-white rounded-[32px] shadow-xl border border-app-border/30 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-6 bg-accent rounded-full" />
              <h3 className="text-sm font-bold text-app-text-primary font-serif">ব্যক্তিগত তথ্য</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <DetailItem label="মোবাইল নম্বর" value={member.phone} />
              <DetailItem label="এনআইডি" value={member.nid} />
              <DetailItem label="পিতার নাম" value={member.father_name} />
              <DetailItem label="মাতার নাম" value={member.mother_name} />
              <DetailItem label="পেশা" value={member.occupation} />
            </div>

            <div className="pt-4 border-t border-app-border/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                <h4 className="text-xs font-bold text-app-text-secondary">নমিনী তথ্য</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DetailItem label="নমিনীর নাম" value={member.nominee_name} />
                <DetailItem label="সম্পর্ক" value={member.nominee_relation} />
              </div>
            </div>
          </div>

          {/* Active Loans Section (if any) */}
          {activeLoans.length > 0 && (
            <div className="bg-white rounded-[32px] shadow-xl border border-app-border/30 p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-6 bg-danger rounded-full" />
                <h3 className="text-sm font-bold text-app-text-primary font-serif">সক্রিয় ঋণসমূহ</h3>
              </div>
              <div className="space-y-3">
                {activeLoans.map(loan => {
                  const paid = installments.filter(i => i.loan_id === loan.id).reduce((s, i) => s + n(i.amount), 0);
                  const remaining = n(loan.total_payable) - paid;
                  const progress = (paid / n(loan.total_payable)) * 100;
                  
                  return (
                    <div key={loan.id} className="p-3 rounded-2xl bg-danger/5 border border-danger/10">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-xs font-bold text-app-text-primary">৳{fmt(loan.amount)} (মূল)</div>
                          <div className="text-[10px] text-app-text-muted">কিস্তি: {loan.installments}টি</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-danger">৳{fmt(remaining)} বাকি</div>
                          <div className="text-[10px] text-app-text-muted">মোট: ৳{fmt(loan.total_payable)}</div>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-danger/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-danger"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Annual History - Ultra Compact Grid */}
          <div className="bg-white rounded-[32px] shadow-xl border border-app-border/30 p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                <h3 className="text-sm font-bold text-app-text-primary font-serif">
                  বার্ষিক জমার বিবরণ
                </h3>
              </div>
              <div className="flex items-center bg-app-bg-secondary/50 rounded-full px-3 py-1 border border-app-border/50">
                <input 
                  type="number" 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-14 bg-transparent text-xs font-bold outline-none text-center text-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {MONTHS_BN.map((m, i) => {
                const { label, status, amount } = getMonthStatus(i);
                return (
                  <div 
                    key={i}
                    className={cn(
                      "relative p-2 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 min-h-[64px]",
                      status === 'paid' ? "bg-primary/5 border-primary/20" : 
                      status === 'missed' ? "bg-danger/5 border-danger/20" : 
                      "bg-app-bg-secondary/20 border-transparent"
                    )}
                  >
                    <div className="text-[9px] font-bold text-app-text-muted uppercase tracking-tighter">{m}</div>
                    <div className="shrink-0">
                      {status === 'paid' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      {status === 'missed' && <X className="w-4 h-4 text-danger" />}
                      {status === 'future' && <Hourglass className="w-4 h-4 text-app-text-muted opacity-30" />}
                    </div>
                    <div className={cn(
                      "text-[9px] font-black",
                      status === 'paid' ? "text-primary" : 
                      status === 'missed' ? "text-danger" : 
                      "text-app-text-muted/60"
                    )}>
                      {status === 'paid' ? `৳${fmt(amount || 0)}` : label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center gap-3 pt-2">
            <button 
              onClick={onClose}
              className="flex-1 bg-app-bg-secondary hover:bg-app-border text-app-text-secondary font-bold py-4 rounded-2xl text-xs transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              বন্ধ করুন
            </button>
            {currentUser.role === 'admin' && (
              <button 
                onClick={handleDelete}
                className="w-14 h-14 bg-danger/10 text-danger border border-danger/20 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-sm"
                title="মুছুন"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bgColor: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color, bgColor, delay = 0 }) => (
  <motion.div 
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay }}
    className="p-4 rounded-[28px] border border-app-border/20 shadow-sm flex flex-col gap-2 bg-white relative overflow-hidden group"
  >
    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", bgColor, color)}>
      {icon}
    </div>
    <div>
      <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-wider mb-0.5">{label}</div>
      <div className={cn("text-base font-black tracking-tight", color)}>{value}</div>
    </div>
    {/* Decorative background element */}
    <div className={cn("absolute -right-2 -bottom-2 w-12 h-12 opacity-5 rounded-full", bgColor)} />
  </motion.div>
);

const DetailItem: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <div className="text-[10px] text-app-text-muted font-bold uppercase tracking-wider mb-0.5">{label}</div>
    <div className="text-xs font-bold text-app-text-secondary break-words">{value || 'দেওয়া নেই'}</div>
  </div>
);


