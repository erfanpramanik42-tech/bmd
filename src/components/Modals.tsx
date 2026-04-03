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
      if (currentUser.role === 'member') {
        setDepMemberId(currentUser.id);
        setLMemberId(currentUser.id);
        setIMemberId(currentUser.id);
      }
      getDocs(collection(db, 'members')).then(snap => {
        setMembers(snap.docs.map(d => ({ ...d.data(), id: d.id } as User)));
      });
    }
    if (isAddInstallmentOpen) {
      const q = currentUser.role === 'admin' 
        ? query(collection(db, 'loans'), where('status', '==', 'active'))
        : query(collection(db, 'loans'), where('member_id', '==', currentUser.id), where('status', '==', 'active'));
      
      getDocs(q).then(snap => {
        setLoans(snap.docs.map(d => ({ ...d.data(), id: d.id } as Loan)));
      });
    }
  }, [isAddDepositOpen, isAddLoanOpen, isAddInstallmentOpen, currentUser]);

  // --- Add Member ---
  const [mName, setMName] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mPin, setMPin] = useState('');
  const [mAddress, setMAddress] = useState('');
  const [mPhoto, setMPhoto] = useState('');
  const [mFather, setMFather] = useState('');
  const [mMother, setMMother] = useState('');
  const [mNid, setMNid] = useState('');
  const [mOccupation, setMOccupation] = useState('');
  const [mNomineeName, setMNomineeName] = useState('');
  const [mNomineeRelation, setMNomineeRelation] = useState('');
  const [mLoading, setMLoading] = useState(false);

  useEffect(() => {
    if (editMember) {
      setMName(editMember.name);
      setMPhone(editMember.phone);
      setMAddress(editMember.address || '');
      setMPhoto(editMember.photo || '');
      setMFather(editMember.father_name || '');
      setMMother(editMember.mother_name || '');
      setMNid(editMember.nid || '');
      setMOccupation(editMember.occupation || '');
      setMNomineeName(editMember.nominee_name || '');
      setMNomineeRelation(editMember.nominee_relation || '');
      setMPin(''); // Don't show hashed pin
    } else {
      setMName('');
      setMPhone('');
      setMAddress('');
      setMPhoto('');
      setMFather('');
      setMMother('');
      setMNid('');
      setMOccupation('');
      setMNomineeName('');
      setMNomineeRelation('');
      setMPin('');
    }
  }, [editMember, isAddMemberOpen]);

  const handleAddMember = async () => {
    if (!mName || !mPhone || (!mPin && !editMember)) { showToast('⚠️ নাম, ফোন ও পিন আবশ্যক'); return; }
    setMLoading(true);
    try {
      const pin_hash = mPin ? await hashPin(mPhone, mPin) : (editMember?.pin_hash || '');
      
      const memberData = {
        name: mName, 
        phone: mPhone, 
        pin_hash, 
        address: mAddress, 
        photo: mPhoto,
        father_name: mFather,
        mother_name: mMother,
        nid: mNid,
        occupation: mOccupation,
        nominee_name: mNomineeName,
        nominee_relation: mNomineeRelation
      };

      if (editMember) {
        const collectionName = editMember.role === 'admin' ? 'admins' : 'members';
        await updateDoc(doc(db, collectionName, editMember.id), memberData);
        showToast('✅ তথ্য আপডেট করা হয়েছে');
      } else {
        await addDoc(collection(db, 'members'), {
          ...memberData,
          role: 'member', 
          join_date: new Date().toISOString().split('T')[0]
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
      // Check if deposit already exists for this month (excluding fines)
      const depQuery = query(
        collection(db, 'deposits'), 
        where('member_id', '==', depMemberId), 
        where('month', '==', depMonth),
        where('fine', '==', false)
      );
      const depSnap = await getDocs(depQuery);
      if (!depSnap.empty) {
        showToast('⚠️ এই মাসের জমা অলরেডি দেওয়া হয়েছে');
        setDepLoading(false);
        return;
      }

      // Check for pending requests for this month
      const reqQuery = query(
        collection(db, 'requests'),
        where('member_id', '==', depMemberId),
        where('type', '==', 'deposit'),
        where('status', '==', 'pending')
      );
      const reqSnap = await getDocs(reqQuery);
      const hasPendingForMonth = reqSnap.docs.some(d => d.data().data?.month === depMonth);
      
      if (hasPendingForMonth) {
        showToast('⚠️ এই মাসের জন্য একটি রিকোয়েস্ট অলরেডি পেন্ডিং আছে');
        setDepLoading(false);
        return;
      }

      const date = new Date().toISOString().split('T')[0];
      if (currentUser.role === 'admin') {
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
      } else {
        await addDoc(collection(db, 'requests'), {
          type: 'deposit',
          member_id: currentUser.id,
          data: { month: depMonth, amount: Number(depAmount) },
          status: 'pending',
          created_at: new Date().toISOString()
        });
        showToast('✅ জমার রিকোয়েস্ট পাঠানো হয়েছে');
      }
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
      if (currentUser.role !== 'admin') {
        // Check for pending loan requests
        const q = query(
          collection(db, 'requests'),
          where('member_id', '==', currentUser.id),
          where('type', '==', 'loan'),
          where('status', '==', 'pending')
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          showToast('⚠️ আপনার একটি ঋণের রিকোয়েস্ট অলরেডি পেন্ডিং আছে');
          setLLoading(false);
          return;
        }
      }

      const date = new Date().toISOString().split('T')[0];
      const tp = Number(lAmount) + Number(lProfit);
      const rate = lAmount > 0 ? (lProfit / lAmount) * 100 : 0;
      
      if (currentUser.role === 'admin') {
        await addDoc(collection(db, 'loans'), {
          member_id: lMemberId, amount: Number(lAmount), interest: rate,
          installments: Number(lInst), date, purpose: lPurpose,
          total_interest: Number(lProfit), total_payable: tp,
          monthly_installment: tp / Number(lInst), status: 'active'
        });
        showToast('✅ ঋণ অনুমোদন হয়েছে');
      } else {
        await addDoc(collection(db, 'requests'), {
          type: 'loan',
          member_id: currentUser.id,
          data: { amount: Number(lAmount), installments: Number(lInst), purpose: lPurpose },
          status: 'pending',
          created_at: new Date().toISOString()
        });
        showToast('✅ ঋণের রিকোয়েস্ট পাঠানো হয়েছে');
      }
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
      if (currentUser.role !== 'admin') {
        // Check for pending installment requests for this loan
        const q = query(
          collection(db, 'requests'),
          where('member_id', '==', currentUser.id),
          where('type', '==', 'installment'),
          where('status', '==', 'pending')
        );
        const snap = await getDocs(q);
        const hasPendingForLoan = snap.docs.some(d => d.data().data?.loan_id === iLoanId);
        if (hasPendingForLoan) {
          showToast('⚠️ এই ঋণের জন্য একটি কিস্তি রিকোয়েস্ট পেন্ডিং আছে');
          setILoading(false);
          return;
        }
      }

      const date = new Date().toISOString().split('T')[0];
      if (currentUser.role === 'admin') {
        await addDoc(collection(db, 'installments'), {
          member_id: iMemberId, loan_id: iLoanId, amount: Number(iAmount), date
        });
        showToast('✅ কিস্তি যোগ হয়েছে');
      } else {
        await addDoc(collection(db, 'requests'), {
          type: 'installment',
          member_id: currentUser.id,
          data: { loan_id: iLoanId, amount: Number(iAmount) },
          status: 'pending',
          created_at: new Date().toISOString()
        });
        showToast('✅ কিস্তির রিকোয়েস্ট পাঠানো হয়েছে');
      }
      setIsAddInstallmentOpen(false);
    } catch (e) { showToast('❌ ব্যর্থ হয়েছে'); }
    finally { setILoading(false); }
  };

  const fmt = (num: number) => Math.round(num).toLocaleString('en-IN');

  return (
    <>
      {/* Add Member Modal */}
      <Modal 
        isOpen={isAddMemberOpen} 
        onClose={() => setIsAddMemberOpen(false)} 
        title={editMember ? "👤 সদস্য তথ্য এডিট করুন" : "👤 নতুন সদস্য যোগ করুন"}
        position="bottom"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 pb-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">নাম *</label>
              <input type="text" value={mName} onChange={(e) => setMName(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="সদস্যের নাম" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">ফোন নম্বর *</label>
              <input type="tel" value={mPhone} onChange={(e) => setMPhone(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="০১XXXXXXXXX" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">পিন কোড {editMember && '(ঐচ্ছিক)'}</label>
              <input type="password" value={mPin} onChange={(e) => setMPin(e.target.value)} maxLength={4} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="৪ সংখ্যার পিন" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">পিতার নাম</label>
              <input type="text" value={mFather} onChange={(e) => setMFather(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="পিতার নাম" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">মাতার নাম</label>
              <input type="text" value={mMother} onChange={(e) => setMMother(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="মাতার নাম" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">এনআইডি নম্বর</label>
              <input type="text" value={mNid} onChange={(e) => setMNid(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="NID Number" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">পেশা</label>
              <input type="text" value={mOccupation} onChange={(e) => setMOccupation(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="পেশা" />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">ঠিকানা</label>
              <input type="text" value={mAddress} onChange={(e) => setMAddress(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="বর্তমান ঠিকানা" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">নমিনীর নাম</label>
              <input type="text" value={mNomineeName} onChange={(e) => setMNomineeName(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="নমিনীর নাম" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">নমিনীর সাথে সম্পর্ক</label>
              <input type="text" value={mNomineeRelation} onChange={(e) => setMNomineeRelation(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="সম্পর্ক" />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">প্রোফাইল ছবি</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-app-bg-secondary flex items-center justify-center overflow-hidden border-2 border-app-border shrink-0">
                  {mPhoto ? <img src={mPhoto} alt="Profile" className="w-full h-full object-cover" /> : <div className="text-xl">👤</div>}
                </div>
                <div className="flex-1">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setMPhoto(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                    className="w-full text-xs text-app-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all" 
                  />
                  <p className="text-[9px] text-app-text-muted mt-1">সর্বোচ্চ ১ মেগাবাইট। ছোট ছবি ব্যবহার করুন।</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-2 sticky bottom-0 bg-white pb-1">
            <Button variant="gray" className="flex-1" onClick={() => setIsAddMemberOpen(false)}>বাতিল</Button>
            <Button className="flex-2" onClick={handleAddMember} loading={mLoading}>{editMember ? "✅ আপডেট করুন" : "✅ সদস্য যোগ করুন"}</Button>
          </div>
        </div>
      </Modal>

      {/* Add Deposit Modal */}
      <Modal 
        isOpen={isAddDepositOpen} 
        onClose={() => setIsAddDepositOpen(false)} 
        title={currentUser.role === 'admin' ? "💰 মাসিক জমা যোগ করুন" : "💰 জমার রিকোয়েস্ট পাঠান"}
        position="bottom"
      >
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">সদস্য *</label>
            <select 
              value={depMemberId} 
              onChange={(e) => setDepMemberId(e.target.value)} 
              disabled={currentUser.role === 'member'}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all bg-white disabled:bg-app-bg-secondary"
            >
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
      <Modal 
        isOpen={isAddLoanOpen} 
        onClose={() => setIsAddLoanOpen(false)} 
        title={currentUser.role === 'admin' ? "🏦 ঋণ প্রদান করুন" : "🏦 ঋণের রিকোয়েস্ট পাঠান"}
        position="bottom"
      >
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">সদস্য *</label>
            <select 
              value={lMemberId} 
              onChange={(e) => setLMemberId(e.target.value)} 
              disabled={currentUser.role === 'member'}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all bg-white disabled:bg-app-bg-secondary"
            >
              <option value="">বেছে নিন...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={currentUser.role === 'admin' ? "col-span-1" : "col-span-2"}>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">ঋণের পরিমাণ (৳) *</label>
              <input type="number" value={lAmount} onChange={(e) => setLAmount(Number(e.target.value))} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" />
            </div>
            {currentUser.role === 'admin' && (
              <div>
                <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">মুনাফা (৳) *</label>
                <input type="number" value={lProfit} onChange={(e) => setLProfit(Number(e.target.value))} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" />
              </div>
            )}
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
      <Modal 
        isOpen={isAddInstallmentOpen} 
        onClose={() => setIsAddInstallmentOpen(false)} 
        title={currentUser.role === 'admin' ? "📲 কিস্তি গ্রহণ করুন" : "📲 কিস্তির রিকোয়েস্ট পাঠান"}
        position="bottom"
      >
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">সদস্য *</label>
            <select 
              value={iMemberId} 
              onChange={(e) => { setIMemberId(e.target.value); setILoanId(''); }} 
              disabled={currentUser.role === 'member'}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all bg-white disabled:bg-app-bg-secondary"
            >
              <option value="">বেছে নিন...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">ঋণ *</label>
            <select 
              value={iLoanId} 
              onChange={(e) => {
                const lid = e.target.value;
                setILoanId(lid);
                const loan = loans.find(l => l.id === lid);
                if (loan) setIAmount(Math.round(loan.monthly_installment));
              }} 
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all bg-white"
            >
              <option value="">বেছে নিন...</option>
              {loans.filter(l => l.member_id === iMemberId && l.status === 'active').map(l => (
                <option key={l.id} value={l.id}>
                  ৳{fmt(l.amount)} (মাসিক: ৳{fmt(l.monthly_installment)}) - {l.date}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">পরিমাণ (৳) *</label>
            <input 
              type="number" 
              value={iAmount} 
              onChange={(e) => setIAmount(Number(e.target.value))} 
              readOnly={currentUser.role === 'member'}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all disabled:bg-app-bg-secondary" 
            />
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
