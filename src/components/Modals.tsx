import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { User, AppSettings, Loan } from '../types';
import { Modal } from './Modal';
import { Button } from './Button';
import { hashPin } from '../lib/crypto';

interface ModalsProps {
  isAddMemberOpen: boolean;
  setIsAddMemberOpen: (open: boolean) => void;
  isAddDepositOpen: boolean;
  setIsAddDepositOpen: (open: boolean) => void;
  isAddLoanOpen: boolean;
  setIsAddLoanOpen: (open: boolean) => void;
  isAddInstallmentOpen: boolean;
  setIsAddInstallmentOpen: (open: boolean) => void;
  currentUser: User;
  settings: AppSettings | null;
  showToast: (msg: string) => void;
  editMember?: User | null;
}

export const Modals: React.FC<ModalsProps> = ({
  isAddMemberOpen, setIsAddMemberOpen,
  isAddDepositOpen, setIsAddDepositOpen,
  isAddLoanOpen, setIsAddLoanOpen,
  isAddInstallmentOpen, setIsAddInstallmentOpen,
  currentUser, settings, showToast,
  editMember
}) => {
  const [members, setMembers] = useState<User[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  useEffect(() => {
    if (isAddDepositOpen || isAddLoanOpen || isAddInstallmentOpen) {
      getDocs(collection(db, 'members')).then(snap => {
        setMembers(snap.docs.map(d => ({ ...d.data(), id: d.id } as User)));
      });
    }
    if (isAddInstallmentOpen) {
      getDocs(query(collection(db, 'loans'), where('status', '==', 'active'))).then(snap => {
        setLoans(snap.docs.map(d => ({ ...d.data(), id: d.id } as Loan)));
      });
    }
  }, [isAddDepositOpen, isAddLoanOpen, isAddInstallmentOpen]);

  // --- Add Member ---
  const [mName, setMName] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mPin, setMPin] = useState('');
  const [mAddress, setMAddress] = useState('');
  const [mPhoto, setMPhoto] = useState('');
  const [mLoading, setMLoading] = useState(false);

  useEffect(() => {
    if (editMember) {
      setMName(editMember.name);
      setMPhone(editMember.phone);
      setMAddress(editMember.address || '');
      setMPhoto(editMember.photo || '');
      setMPin(''); // Don't show hashed pin
    } else {
      setMName('');
      setMPhone('');
      setMAddress('');
      setMPhoto('');
      setMPin('');
    }
  }, [editMember, isAddMemberOpen]);

  const handleAddMember = async () => {
    if (!mName || !mPhone || (!mPin && !editMember)) { showToast('⚠️ নাম, ফোন ও পিন আবশ্যক'); return; }
    setMLoading(true);
    try {
      const pin_hash = mPin ? await hashPin(mPhone, mPin) : (editMember?.pin_hash || '');
      
      if (editMember) {
        await updateDoc(doc(db, 'members', editMember.id), {
          name: mName, phone: mPhone, pin_hash, address: mAddress, photo: mPhoto
        });
        showToast('✅ সদস্য তথ্য আপডেট করা হয়েছে');
      } else {
        await addDoc(collection(db, 'members'), {
          name: mName, phone: mPhone, pin_hash, address: mAddress, photo: mPhoto,
          role: 'member', join_date: new Date().toISOString().split('T')[0]
        });
        showToast('✅ সদস্য যোগ করা হয়েছে');
      }
      setIsAddMemberOpen(false);
    } catch (e) { showToast('❌ ব্যর্থ হয়েছে'); }
    finally { setMLoading(false); }
  };

  // --- Add Deposit ---
  const [depMemberId, setDepMemberId] = useState('');
  const [depMonth, setDepMonth] = useState('');
  const [depAmount, setDepAmount] = useState(settings?.monthly_deposit || 500);
  const [depFine, setDepFine] = useState(0);
  const [depLoading, setDepLoading] = useState(false);

  const handleAddDeposit = async () => {
    if (!depMemberId || !depMonth || !depAmount) { showToast('⚠️ সব ঘর পূরণ করুন'); return; }
    setDepLoading(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      await addDoc(collection(db, 'deposits'), {
        member_id: depMemberId, month: depMonth, amount: Number(depAmount),
        fine: false, date
      });
      if (depFine > 0) {
        await addDoc(collection(db, 'deposits'), {
          member_id: depMemberId, month: depMonth, amount: Number(depFine),
          fine: true, date, note: 'জরিমানা'
        });
      }
      showToast('✅ জমা যোগ করা হয়েছে');
      setIsAddDepositOpen(false);
    } catch (e) { showToast('❌ ব্যর্থ হয়েছে'); }
    finally { setDepLoading(false); }
  };

  // --- Add Loan ---
  const [lMemberId, setLMemberId] = useState('');
  const [lAmount, setLAmount] = useState(0);
  const [lProfit, setLProfit] = useState(0);
  const [lInst, setLInst] = useState(12);
  const [lPurpose, setLPurpose] = useState('');
  const [lLoading, setLLoading] = useState(false);

  const handleAddLoan = async () => {
    if (!lMemberId || !lAmount || !lInst) { showToast('⚠️ সব ঘর পূরণ করুন'); return; }
    setLLoading(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      const tp = Number(lAmount) + Number(lProfit);
      const rate = lAmount > 0 ? (lProfit / lAmount) * 100 : 0;
      await addDoc(collection(db, 'loans'), {
        member_id: lMemberId, amount: Number(lAmount), interest: rate,
        installments: Number(lInst), date, purpose: lPurpose,
        total_interest: Number(lProfit), total_payable: tp,
        monthly_installment: tp / Number(lInst), status: 'active'
      });
      showToast('✅ ঋণ অনুমোদন হয়েছে');
      setIsAddLoanOpen(false);
    } catch (e) { showToast('❌ ব্যর্থ হয়েছে'); }
    finally { setLLoading(false); }
  };

  // --- Add Installment ---
  const [iMemberId, setIMemberId] = useState('');
  const [iLoanId, setILoanId] = useState('');
  const [iAmount, setIAmount] = useState(0);
  const [iLoading, setILoading] = useState(false);

  const handleAddInstallment = async () => {
    if (!iMemberId || !iLoanId || !iAmount) { showToast('⚠️ সব ঘর পূরণ করুন'); return; }
    setILoading(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      await addDoc(collection(db, 'installments'), {
        member_id: iMemberId, loan_id: iLoanId, amount: Number(iAmount), date
      });
      showToast('✅ কিস্তি যোগ হয়েছে');
      setIsAddInstallmentOpen(false);
    } catch (e) { showToast('❌ ব্যর্থ হয়েছে'); }
    finally { setILoading(false); }
  };

  const fmt = (num: number) => Math.round(num).toLocaleString('en-IN');

  return (
    <>
      {/* Add Member Modal */}
      <Modal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} title={editMember ? "👤 সদস্য তথ্য এডিট করুন" : "👤 নতুন সদস্য যোগ করুন"}>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">নাম *</label>
            <input type="text" value={mName} onChange={(e) => setMName(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="সদস্যের নাম" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">ফোন নম্বর *</label>
            <input type="tel" value={mPhone} onChange={(e) => setMPhone(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="০১XXXXXXXXX" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">পিন কোড {editMember && '(পরিবর্তন করতে চাইলে দিন)'}</label>
            <input type="password" value={mPin} onChange={(e) => setMPin(e.target.value)} maxLength={4} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder={editMember ? "নতুন পিন (ঐচ্ছিক)" : "৪ সংখ্যার পিন"} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">ঠিকানা</label>
            <input type="text" value={mAddress} onChange={(e) => setMAddress(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="ঐচ্ছিক" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">প্রোফাইল ছবি (URL)</label>
            <input type="text" value={mPhoto} onChange={(e) => setMPhoto(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="https://..." />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="gray" className="flex-1" onClick={() => setIsAddMemberOpen(false)}>বাতিল</Button>
            <Button className="flex-2" onClick={handleAddMember} loading={mLoading}>{editMember ? "✅ আপডেট করুন" : "✅ সদস্য যোগ করুন"}</Button>
          </div>
        </div>
      </Modal>

      {/* Add Deposit Modal */}
      <Modal isOpen={isAddDepositOpen} onClose={() => setIsAddDepositOpen(false)} title="💰 মাসিক জমা যোগ করুন">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">সদস্য *</label>
            <select value={depMemberId} onChange={(e) => setDepMemberId(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all bg-white">
              <option value="">বেছে নিন...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">মাস *</label>
            <input type="month" value={depMonth} onChange={(e) => setDepMonth(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all bg-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">জমার পরিমাণ (৳) *</label>
              <input type="number" value={depAmount} onChange={(e) => setDepAmount(Number(e.target.value))} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">জরিমানা (৳)</label>
              <input type="number" value={depFine} onChange={(e) => setDepFine(Number(e.target.value))} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="০" />
            </div>
          </div>
          {(depAmount > 0 || depFine > 0) && (
            <div className="bg-green-50 p-3 rounded-xl text-center text-primary font-bold text-sm">
              💰 মোট ফান্ডে যাবে: ৳{fmt(depAmount + depFine)}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="gray" className="flex-1" onClick={() => setIsAddDepositOpen(false)}>বাতিল</Button>
            <Button className="flex-2" onClick={handleAddDeposit} loading={depLoading}>✅ জমা যোগ করুন</Button>
          </div>
        </div>
      </Modal>

      {/* Add Loan Modal */}
      <Modal isOpen={isAddLoanOpen} onClose={() => setIsAddLoanOpen(false)} title="🏦 ঋণ প্রদান করুন">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">সদস্য *</label>
            <select value={lMemberId} onChange={(e) => setLMemberId(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all bg-white">
              <option value="">বেছে নিন...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">ঋণের পরিমাণ (৳) *</label>
              <input type="number" value={lAmount} onChange={(e) => setLAmount(Number(e.target.value))} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">মুনাফা (৳) *</label>
              <input type="number" value={lProfit} onChange={(e) => setLProfit(Number(e.target.value))} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">কিস্তির সংখ্যা *</label>
            <input type="number" value={lInst} onChange={(e) => setLInst(Number(e.target.value))} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" />
          </div>
          {lAmount > 0 && (
            <div className="bg-blue-50 p-3 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between"><span>মূল ঋণ:</span> <b>৳{fmt(lAmount)}</b></div>
              <div className="flex justify-between text-blue-600"><span>মুনাফা:</span> <b>৳{fmt(lProfit)}</b></div>
              <div className="flex justify-between border-t border-blue-200 pt-1 font-bold text-sm"><span>মোট পরিশোধযোগ্য:</span> <b>৳{fmt(lAmount + lProfit)}</b></div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="gray" className="flex-1" onClick={() => setIsAddLoanOpen(false)}>বাতিল</Button>
            <Button className="flex-2" onClick={handleAddLoan} loading={lLoading}>✅ ঋণ অনুমোদন করুন</Button>
          </div>
        </div>
      </Modal>

      {/* Add Installment Modal */}
      <Modal isOpen={isAddInstallmentOpen} onClose={() => setIsAddInstallmentOpen(false)} title="📲 কিস্তি গ্রহণ করুন">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">সদস্য *</label>
            <select value={iMemberId} onChange={(e) => { setIMemberId(e.target.value); setILoanId(''); }} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all bg-white">
              <option value="">বেছে নিন...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">ঋণ *</label>
            <select value={iLoanId} onChange={(e) => setILoanId(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all bg-white">
              <option value="">বেছে নিন...</option>
              {loans.filter(l => l.member_id === iMemberId).map(l => <option key={l.id} value={l.id}>৳{fmt(l.amount)} ({l.date})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">পরিমাণ (৳) *</label>
            <input type="number" value={iAmount} onChange={(e) => setIAmount(Number(e.target.value))} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="gray" className="flex-1" onClick={() => setIsAddInstallmentOpen(false)}>বাতিল</Button>
            <Button className="flex-2" onClick={handleAddInstallment} loading={iLoading}>✅ কিস্তি যোগ করুন</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
