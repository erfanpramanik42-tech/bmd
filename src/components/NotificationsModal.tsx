import React from 'react';
import { Modal } from './Modal';
import { User, Request } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, addDoc, deleteDoc, collection, setDoc, query, where, getDocs } from 'firebase/firestore';
import { Check, X, UserPlus, Clock, Wallet, Landmark, Receipt } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './Button';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingRequests: any[];
  pendingRegs: any[];
  members: User[];
  deposits: any[];
  installments: any[];
  loans: any[];
  notifications: any[];
  currentUser: User;
  showToast: (msg: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  pendingRequests,
  pendingRegs,
  members,
  deposits,
  installments,
  loans,
  notifications,
  currentUser,
  showToast
}) => {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const unpaidMembers = members.filter(m => {
    const hasPaid = deposits.some(d => d.member_id === m.id && d.month === currentMonth && !d.fine);
    return !hasPaid;
  });

  const [loanProfits, setLoanProfits] = React.useState<Record<string, number>>({});

  const handleApproveRequest = async (req: any) => {
    if (req.status !== 'pending') {
      showToast('⚠️ এই রিকোয়েস্টটি অলরেডি প্রসেস করা হয়েছে');
      return;
    }
    try {
      const date = new Date().toISOString().split('T')[0];
      if (req.type === 'deposit') {
        // Double check if deposit already exists for this month
        const depQuery = query(
          collection(db, 'deposits'), 
          where('member_id', '==', req.member_id), 
          where('month', '==', req.data.month),
          where('fine', '==', false)
        );
        const depSnap = await getDocs(depQuery);
        if (!depSnap.empty) {
          showToast('⚠️ এই মাসের জমা অলরেডি দেওয়া হয়েছে');
          return;
        }

        await addDoc(collection(db, 'deposits'), {
          member_id: req.member_id,
          month: req.data.month,
          amount: Number(req.data.amount),
          fine: false,
          date
        });
        await addDoc(collection(db, 'notifications'), {
          title: 'জমা রিকোয়েস্ট অনুমোদিত',
          body: `আপনার ৳${fmt(req.data.amount)} জমা রিকোয়েস্টটি অনুমোদিত হয়েছে।`,
          target: req.member_id,
          sent_at: new Date().toISOString(),
          sent_by: currentUser.id,
          read_by: []
        });
      } else if (req.type === 'loan') {
        const profit = loanProfits[req.id] || 0;
        if (profit <= 0) { showToast('⚠️ মুনাফার পরিমাণ দিন'); return; }
        
        const amount = Number(req.data.amount);
        const tp = amount + profit; 
        const rate = (profit / amount) * 100;

        await addDoc(collection(db, 'loans'), {
          member_id: req.member_id,
          amount: amount,
          interest: rate,
          installments: Number(req.data.installments),
          date,
          purpose: req.data.purpose,
          total_interest: profit,
          total_payable: tp,
          monthly_installment: tp / Number(req.data.installments),
          status: 'active'
        });
        await addDoc(collection(db, 'notifications'), {
          title: 'ঋণ রিকোয়েস্ট অনুমোদিত',
          body: `আপনার ৳${fmt(req.data.amount)} ঋণ রিকোয়েস্টটি অনুমোদিত হয়েছে।`,
          target: req.member_id,
          sent_at: new Date().toISOString(),
          sent_by: currentUser.id,
          read_by: []
        });
      } else if (req.type === 'installment') {
        const amount = Number(req.data.amount);
        await addDoc(collection(db, 'installments'), {
          member_id: req.member_id,
          loan_id: req.data.loan_id,
          amount: amount,
          date
        });

        // Check if loan is completed
        const loan = loans.find(l => l.id === req.data.loan_id);
        if (loan) {
          const loanInsts = installments.filter(i => i.loan_id === loan.id);
          const totalPaid = loanInsts.reduce((sum, i) => sum + Number(i.amount), 0) + amount;
          
          if (totalPaid >= loan.total_payable) {
            await updateDoc(doc(db, 'loans', loan.id), { status: 'completed' });
            showToast('🎊 ঋণটি সম্পূর্ণ পরিশোধিত হয়েছে!');
          }
        }

        await addDoc(collection(db, 'notifications'), {
          title: 'কিস্তি রিকোয়েস্ট অনুমোদিত',
          body: `আপনার ৳${fmt(req.data.amount)} কিস্তি রিকোয়েস্টটি অনুমোদিত হয়েছে।`,
          target: req.member_id,
          sent_at: new Date().toISOString(),
          sent_by: currentUser.id,
          read_by: []
        });
      }
      await updateDoc(doc(db, 'requests', req.id), { status: 'approved' });
      showToast('✅ রিকোয়েস্ট অনুমোদিত হয়েছে');
    } catch (e) {
      showToast('❌ অনুমোদন ব্যর্থ হয়েছে');
    }
  };

  const handleRejectRequest = async (req: any) => {
    if (req.status !== 'pending') {
      showToast('⚠️ এই রিকোয়েস্টটি অলরেডি প্রসেস করা হয়েছে');
      return;
    }
    try {
      await updateDoc(doc(db, 'requests', req.id), { status: 'rejected' });
      await addDoc(collection(db, 'notifications'), {
        title: 'রিকোয়েস্ট বাতিল',
        body: `আপনার ${req.type === 'deposit' ? 'জমা' : req.type === 'loan' ? 'ঋণ' : 'কিস্তি'} রিকোয়েস্টটি বাতিল করা হয়েছে।`,
        target: req.member_id,
        sent_at: new Date().toISOString(),
        sent_by: currentUser.id,
        read_by: []
      });
      showToast('❌ রিকোয়েস্ট বাতিল করা হয়েছে');
    } catch (e) {
      showToast('❌ বাতিল ব্যর্থ হয়েছে');
    }
  };

  const handleApproveReg = async (reg: any) => {
    try {
      const memberData = {
        name: reg.name,
        phone: reg.phone,
        pin_hash: reg.pin_hash,
        role: 'member',
        join_date: new Date().toISOString().split('T')[0]
      };
      
      if (reg.firebase_uid) {
        await setDoc(doc(db, 'members', reg.firebase_uid), memberData);
      } else {
        await addDoc(collection(db, 'members'), memberData);
      }
      
      await deleteDoc(doc(db, 'pending_regs', reg.id));
      showToast('✅ সদস্যপদ অনুমোদিত হয়েছে');
    } catch (e) {
      showToast('❌ অনুমোদন ব্যর্থ হয়েছে');
    }
  };

  const handleRejectReg = async (regId: string) => {
    try {
      await deleteDoc(doc(db, 'pending_regs', regId));
      showToast('❌ নিবন্ধন বাতিল করা হয়েছে');
    } catch (e) {
      showToast('❌ বাতিল ব্যর্থ হয়েছে');
    }
  };

  const markAsRead = async (notifId: string) => {
    try {
      const notif = notifications.find(n => n.id === notifId);
      if (!notif) return;
      const readBy = notif.read_by || [];
      if (!readBy.includes(currentUser.id)) {
        await updateDoc(doc(db, 'notifications', notifId), {
          read_by: [...readBy, currentUser.id]
        });
      }
    } catch (e) { console.error(e); }
  };

  const fmt = (num: number) => Math.round(num).toLocaleString('en-IN');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🔔 নোটিফিকেশন">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1 pb-4">
        
        {currentUser.role === 'admin' ? (
          <>
            {/* Pending Registrations */}
            {pendingRegs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-2">
                  <UserPlus className="w-3 h-3" /> নতুন সদস্য নিবন্ধন ({pendingRegs.length})
                </h4>
                {pendingRegs.map(reg => (
                  <div key={reg.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{reg.name}</div>
                      <div className="text-[10px] text-app-text-muted">📞 {reg.phone}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRejectReg(reg.id)} className="w-8 h-8 rounded-lg bg-white border border-red-200 text-danger flex items-center justify-center active:scale-90 transition-all">
                        <X className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleApproveReg(reg)} className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center active:scale-90 transition-all shadow-sm">
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3 h-3" /> পেন্ডিং রিকোয়েস্ট ({pendingRequests.length})
                </h4>
                {pendingRequests.map(req => {
                  const member = members.find(m => m.id === req.member_id);
                  const Icon = req.type === 'deposit' ? Wallet : req.type === 'loan' ? Landmark : Receipt;
                  return (
                    <div key={req.id} className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-blue-600 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-app-text-muted uppercase tracking-tight">
                          {req.type === 'deposit' ? 'জমা' : req.type === 'loan' ? 'ঋণ' : 'কিস্তি'} রিকোয়েস্ট
                        </div>
                        <div className="text-xs font-bold truncate">{member?.name || 'অজানা সদস্য'}</div>
                        <div className="text-[11px] font-black text-blue-700">
                          ৳{fmt(req.data.amount)}
                          {req.type === 'loan' && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-[9px] text-app-text-muted">মুনাফা:</span>
                              <input 
                                type="number" 
                                placeholder="মুনাফা"
                                value={loanProfits[req.id] || ''}
                                onChange={(e) => setLoanProfits({...loanProfits, [req.id]: Number(e.target.value)})}
                                className="w-20 p-1 text-[10px] border rounded bg-white outline-none focus:border-primary"
                              />
                            </div>
                          )}
                          {req.type === 'installment' && (
                            <span className="text-[9px] font-normal text-app-text-muted ml-1">
                              (ঋণ: ৳{fmt(loans.find(l => l.id === req.data.loan_id)?.total_payable || 0)})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleRejectRequest(req)} className="w-8 h-8 rounded-lg bg-white border border-red-200 text-danger flex items-center justify-center active:scale-90 transition-all">
                          <X className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleApproveRequest(req)} className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center active:scale-90 transition-all shadow-sm">
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Unpaid Members */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-danger uppercase tracking-wider flex items-center gap-2">
                <X className="w-3 h-3" /> মাসিক চাদা জমা দেয়নি ({unpaidMembers.length})
              </h4>
              {unpaidMembers.length === 0 ? (
                <div className="bg-green-50 text-primary p-3 rounded-xl text-[10px] font-bold text-center">
                  🎉 সবাই এই মাসের চাদা জমা দিয়েছেন!
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {unpaidMembers.map(m => (
                    <div key={m.id} className="bg-red-50 border border-red-100 rounded-xl p-2.5 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-danger shrink-0">
                        {m.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">{m.name}</div>
                        <div className="text-[9px] text-app-text-muted">📞 {m.phone}</div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-[9px] border-red-200 text-danger">
                        🔔 রিমাইন্ডার
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {pendingRegs.length === 0 && pendingRequests.length === 0 && unpaidMembers.length === 0 && (
              <div className="text-center py-10">
                <div className="text-4xl mb-2 opacity-30">📭</div>
                <p className="text-xs text-app-text-muted italic">কোনো নতুন নোটিফিকেশন নেই</p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            {notifications.filter(n => n.target === 'all' || n.target === currentUser.id).length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-2 opacity-30">📭</div>
                <p className="text-xs text-app-text-muted italic">কোনো নোটিফিকেশন নেই</p>
              </div>
            ) : (
              notifications
                .filter(n => n.target === 'all' || n.target === currentUser.id)
                .map(notif => {
                  const isRead = notif.read_by?.includes(currentUser.id);
                  return (
                    <div 
                      key={notif.id} 
                      onClick={() => markAsRead(notif.id)}
                      className={cn(
                        "p-4 rounded-xl border transition-all cursor-pointer",
                        isRead ? "bg-white border-app-border opacity-70" : "bg-primary/5 border-primary/20 shadow-sm"
                      )}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h5 className="text-xs font-bold text-app-text-primary">{notif.title}</h5>
                        {!isRead && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                      </div>
                      <p className="text-[11px] text-app-text-secondary leading-relaxed">{notif.body}</p>
                      <div className="mt-2 text-[9px] text-app-text-muted">
                        {new Date(notif.sent_at).toLocaleString('bn-BD')}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
