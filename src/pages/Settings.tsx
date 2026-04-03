import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { AppSettings, User, Investment, Expense } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { cn } from '../lib/utils';
import { Settings as SettingsIcon, Plus, Trash2, Edit2, Bell, FileText, User as UserIcon, Banknote, Wallet, Send, FileSpreadsheet } from 'lucide-react';

import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface SettingsProps {
  currentUser: User;
  showToast: (msg: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ currentUser, showToast }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [admins, setAdmins] = useState<User[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [cashEntries, setCashEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Investment Modal State
  const [isAddInvOpen, setIsAddInvOpen] = useState(false);
  const [newInvTitle, setNewInvTitle] = useState('');
  const [newInvAmount, setNewInvAmount] = useState('');
  const [newInvProfit, setNewInvProfit] = useState('');
  const [newInvDate, setNewInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [invLoading, setInvLoading] = useState(false);

  // Receive Investment Modal State
  const [isReceiveInvOpen, setIsReceiveInvOpen] = useState(false);
  const [selectedInv, setSelectedInv] = useState<Investment | null>(null);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receiveLoading, setReceiveLoading] = useState(false);

  // Add Contact Modal State
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  const [contactLoading, setContactLoading] = useState(false);

  // Add Cash Entry Modal State
  const [isAddCashOpen, setIsAddCashOpen] = useState(false);
  const [newCashTitle, setNewCashTitle] = useState('');
  const [newCashAmount, setNewCashAmount] = useState('');
  const [newCashType, setNewCashType] = useState<'in' | 'out'>('in');
  const [cashLoading, setCashLoading] = useState(false);

  // Add Expense Modal State
  const [isAddExpOpen, setIsAddExpOpen] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpDate, setNewExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expLoading, setExpLoading] = useState(false);

  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvTitle || !newInvAmount || !newInvProfit) {
      showToast('⚠️ সব ঘর পূরণ করুন');
      return;
    }
    setInvLoading(true);
    try {
      await addDoc(collection(db, 'investments'), {
        title: newInvTitle,
        amount: Number(newInvAmount),
        profit: Number(newInvProfit),
        expected_return: Number(newInvAmount) + Number(newInvProfit),
        invest_date: newInvDate,
        status: 'active',
        created_at: new Date().toISOString()
      });
      showToast('✅ বিনিয়োগ যোগ করা হয়েছে');
      setIsAddInvOpen(false);
      setNewInvTitle('');
      setNewInvAmount('');
      setNewInvProfit('');
    } catch (e) {
      showToast('❌ বিনিয়োগ যোগ করতে সমস্যা হয়েছে');
    } finally {
      setInvLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone || !newContactRole) {
      showToast('⚠️ সব ঘর পূরণ করুন');
      return;
    }
    setContactLoading(true);
    try {
      await addDoc(collection(db, 'contacts'), {
        name: newContactName,
        phone: newContactPhone,
        role: newContactRole,
        created_at: new Date().toISOString()
      });
      showToast('✅ কন্টাক্ট যোগ করা হয়েছে');
      setIsAddContactOpen(false);
      setNewContactName('');
      setNewContactPhone('');
      setNewContactRole('');
    } catch (e) {
      showToast('❌ কন্টাক্ট যোগ করতে সমস্যা হয়েছে');
    } finally {
      setContactLoading(false);
    }
  };

  const handleAddCashEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCashTitle || !newCashAmount) {
      showToast('⚠️ সব ঘর পূরণ করুন');
      return;
    }
    setCashLoading(true);
    try {
      await addDoc(collection(db, 'cash_entries'), {
        title: newCashTitle,
        amount: Number(newCashAmount),
        type: newCashType,
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      });
      showToast('✅ ক্যাশ এন্ট্রি যোগ করা হয়েছে');
      setIsAddCashOpen(false);
      setNewCashTitle('');
      setNewCashAmount('');
    } catch (e) {
      showToast('❌ ক্যাশ এন্ট্রি যোগ করতে সমস্যা হয়েছে');
    } finally {
      setCashLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpTitle || !newExpAmount) {
      showToast('⚠️ সব ঘর পূরণ করুন');
      return;
    }
    setExpLoading(true);
    try {
      await addDoc(collection(db, 'expenses'), {
        title: newExpTitle,
        amount: Number(newExpAmount),
        date: newExpDate,
        created_at: new Date().toISOString()
      });
      showToast('✅ খরচ যোগ করা হয়েছে');
      setIsAddExpOpen(false);
      setNewExpTitle('');
      setNewExpAmount('');
    } catch (e) {
      showToast('❌ খরচ যোগ করতে সমস্যা হয়েছে');
    } finally {
      setExpLoading(false);
    }
  };

  // Notification form state
  const [notifSubject, setNotifSubject] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifTarget, setNotifTarget] = useState('all');

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifSubject || !notifBody) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        title: notifSubject,
        body: notifBody,
        target: notifTarget,
        sent_at: new Date().toISOString(),
        sent_by: currentUser.id,
        read_by: []
      });
      setNotifSubject('');
      setNotifBody('');
      showToast('✅ বিজ্ঞপ্তি পাঠানো হয়েছে');
    } catch (e) {
      showToast('❌ বিজ্ঞপ্তি পাঠানো ব্যর্থ হয়েছে');
    }
  };

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'main'), (doc) => {
      if (doc.exists()) setSettings(doc.data() as AppSettings);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/main'));

    const unsubAdmins = onSnapshot(collection(db, 'admins'), (snap) => {
      setAdmins(snap.docs.map(d => ({ ...d.data(), id: d.id } as User)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'admins'));

    const unsubInv = onSnapshot(collection(db, 'investments'), (snap) => {
      setInvestments(snap.docs.map(d => ({ ...d.data(), id: d.id } as Investment)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'investments'));

    const unsubExp = onSnapshot(collection(db, 'expenses'), (snap) => {
      setExpenses(snap.docs.map(d => ({ ...d.data(), id: d.id } as Expense)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'expenses'));

    const unsubContacts = onSnapshot(collection(db, 'contacts'), (snap) => {
      setContacts(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'contacts'));

    const unsubCash = onSnapshot(collection(db, 'cash_entries'), (snap) => {
      setCashEntries(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'cash_entries'));

    setLoading(false);
    return () => {
      unsubSettings(); unsubAdmins(); unsubInv(); unsubExp(); unsubContacts(); unsubCash();
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await updateDoc(doc(db, 'settings', 'main'), {
        monthly_deposit: Number(settings.monthly_deposit),
        interest_rate: Number(settings.interest_rate),
        excel_link: settings.excel_link
      });
      showToast('✅ সেটিংস সংরক্ষিত হয়েছে');
    } catch (e) {
      showToast('❌ সেভ করতে সমস্যা হয়েছে');
    }
  };

  const handleReceiveInvestment = (inv: Investment) => {
    setSelectedInv(inv);
    setReceivedAmount((inv.amount + inv.profit).toString());
    setIsReceiveInvOpen(true);
  };

  const confirmReceiveInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInv || !receivedAmount) return;
    
    const amount = Number(receivedAmount);
    if (isNaN(amount)) {
      showToast('❌ সঠিক অংক লিখুন');
      return;
    }

    setReceiveLoading(true);
    try {
      await updateDoc(doc(db, 'investments', selectedInv.id), {
        status: 'received',
        received_amount: amount,
        received_date: new Date().toISOString().split('T')[0]
      });
      showToast('✅ বিনিয়োগের টাকা ফান্ডে যোগ হয়েছে');
      setIsReceiveInvOpen(false);
      setSelectedInv(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `investments/${selectedInv.id}`);
      showToast('❌ আপডেট করতে সমস্যা হয়েছে');
    } finally {
      setReceiveLoading(false);
    }
  };

  const fmt = (num: number) => Math.round(num).toLocaleString('en-IN');

  return (
    <div className="space-y-4 pb-10">
      <h3 className="font-serif text-base font-bold flex items-center gap-2">
        ⚙️ সেটিংস
      </h3>

      <Card>
        <div className="text-sm font-bold mb-4 flex items-center gap-2">
          💰 ফান্ড সেটিংস
        </div>
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">মাসিক জমার পরিমাণ (৳)</label>
            <input 
              type="number" 
              value={settings?.monthly_deposit || ''}
              onChange={(e) => setSettings(s => s ? { ...s, monthly_deposit: Number(e.target.value) } : null)}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" 
              placeholder="500"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">ডিফল্ট সুদের হার (%)</label>
            <input 
              type="number" 
              value={settings?.interest_rate || ''}
              onChange={(e) => setSettings(s => s ? { ...s, interest_rate: Number(e.target.value) } : null)}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" 
              placeholder="10"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">Excel শিট লিংক</label>
            <input 
              type="url" 
              value={settings?.excel_link || ''}
              onChange={(e) => setSettings(s => s ? { ...s, excel_link: e.target.value } : null)}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" 
              placeholder="https://docs.google.com/spreadsheets/..."
            />
          </div>
          <Button type="submit" className="w-full">💾 সংরক্ষণ করুন</Button>
        </form>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-bold">👑 অ্যাডমিন তালিকা</div>
          <Button size="sm" variant="primary" className="h-8 px-3 rounded-lg text-[10px]">
            <Plus className="w-3 h-3" /> যোগ করুন
          </Button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 bg-app-bg-secondary rounded-xl">
            <div className="w-9 h-9 rounded-full bg-linear-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">স</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">সুপার অ্যাডমিন <span className="text-[8px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full ml-1">সুপার</span></div>
              <div className="text-[10px] text-app-text-muted">📞 {settings?.super_admin_phone || '(যেকোনো ফোন)'}</div>
            </div>
          </div>
          {admins.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-2 bg-app-bg-secondary rounded-xl">
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-sm">{a.name[0].toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate">{a.name} {a.id === currentUser.id && <span className="text-[8px] bg-green-100 text-primary px-1.5 py-0.5 rounded-full ml-1">আমি</span>}</div>
                <div className="text-[10px] text-app-text-muted">📞 {a.phone}</div>
              </div>
              {currentUser.isSuperAdmin && (
                <button className="p-2 text-danger active:scale-90 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-bold">📈 বিনিয়োগ ব্যবস্থাপনা</div>
          <Button size="sm" variant="primary" className="h-8 px-3 rounded-lg text-[10px]" onClick={() => setIsAddInvOpen(true)}>
            <Plus className="w-3 h-3" /> যোগ করুন
          </Button>
        </div>
        <div className="space-y-2">
          {investments.length === 0 ? (
            <div className="text-center py-4 text-app-text-muted text-xs italic">কোনো বিনিয়োগ নেই</div>
          ) : (
            investments.map(i => (
              <div key={i.id} className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <div className="text-xs font-bold">{i.title}</div>
                  <div className="flex gap-2 items-center">
                    <span className={cn(
                      "text-[8px] font-bold px-1.5 py-0.5 rounded-full",
                      i.status === 'active' ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                    )}>
                      {i.status === 'active' ? '🔵 চলমান' : '✅ সম্পন্ন'}
                    </span>
                    {i.status === 'active' && (
                      <button 
                        onClick={() => handleReceiveInvestment(i)}
                        className="text-[9px] bg-primary text-white px-2 py-0.5 rounded-md font-bold active:scale-95 transition-all"
                      >
                        বুঝে পেয়েছি
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-app-text-muted mb-2">📅 {i.invest_date}</div>
                <div className="flex gap-4 text-[11px]">
                  <span>বিনিয়োগ: <b>৳{fmt(i.amount)}</b></span>
                  <span>লাভ: <b className="text-blue-600">৳{fmt(i.profit)}</b></span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Add Investment Modal */}
      <Modal isOpen={isAddInvOpen} onClose={() => setIsAddInvOpen(false)} title="📈 নতুন বিনিয়োগ যোগ করুন">
        <form onSubmit={handleAddInvestment} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">বিনিয়োগের নাম *</label>
            <input 
              type="text" 
              value={newInvTitle}
              onChange={(e) => setNewInvTitle(e.target.value)}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" 
              placeholder="যেমন: জমি ক্রয়"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">বিনিয়োগের পরিমাণ (৳) *</label>
              <input 
                type="number" 
                value={newInvAmount}
                onChange={(e) => setNewInvAmount(e.target.value)}
                className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" 
                placeholder="৫০০০"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">সম্ভাব্য লাভ (৳) *</label>
              <input 
                type="number" 
                value={newInvProfit}
                onChange={(e) => setNewInvProfit(e.target.value)}
                className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" 
                placeholder="১০০০"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">বিনিয়োগের তারিখ *</label>
            <input 
              type="date" 
              value={newInvDate}
              onChange={(e) => setNewInvDate(e.target.value)}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" 
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="gray" className="flex-1" onClick={() => setIsAddInvOpen(false)}>বাতিল</Button>
            <Button type="submit" className="flex-2" loading={invLoading}>✅ বিনিয়োগ যোগ করুন</Button>
          </div>
        </form>
      </Modal>

      {/* Receive Investment Modal */}
      <Modal isOpen={isReceiveInvOpen} onClose={() => setIsReceiveInvOpen(false)} title="💰 বিনিয়োগ ফেরত গ্রহণ">
        <form onSubmit={confirmReceiveInvestment} className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 mb-2">
            <div className="text-xs font-bold text-blue-800">{selectedInv?.title}</div>
            <div className="text-[10px] text-blue-600">মূল বিনিয়োগ: ৳{selectedInv ? fmt(selectedInv.amount) : 0}</div>
            <div className="text-[10px] text-blue-600">সম্ভাব্য লাভ: ৳{selectedInv ? fmt(selectedInv.profit) : 0}</div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">কত টাকা লাভসহ ফেরত পেয়েছেন? *</label>
            <input 
              type="number" 
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" 
              placeholder="৬০০০"
              autoFocus
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="gray" className="flex-1" onClick={() => setIsReceiveInvOpen(false)}>বাতিল</Button>
            <Button type="submit" className="flex-2" loading={receiveLoading}>✅ বুঝে পেয়েছি</Button>
          </div>
        </form>
      </Modal>

      {/* Contacts / Persons in Charge */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-bold flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-primary" /> ফান্ডে দায়িত্বরত ব্যক্তি
          </div>
          <Button size="sm" variant="primary" className="h-8 px-3 rounded-lg text-[10px]" onClick={() => setIsAddContactOpen(true)}>
            <Plus className="w-3 h-3" /> যোগ করুন
          </Button>
        </div>
        <div className="space-y-2">
          {contacts.length === 0 ? (
            <div className="text-center py-4 text-app-text-muted text-xs italic">কেউ যোগ করা হয়নি</div>
          ) : (
            contacts.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-2 bg-app-bg-secondary rounded-xl">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {c.photo ? <img src={c.photo} className="w-full h-full rounded-full object-cover" /> : c.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{c.name}</div>
                  <div className="text-[10px] text-primary font-bold">{c.position || c.role}</div>
                  <div className="text-[10px] text-app-text-muted">📞 {c.phone}</div>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 text-app-text-muted active:scale-90 transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button className="p-2 text-danger active:scale-90 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Add Contact Modal */}
      <Modal isOpen={isAddContactOpen} onClose={() => setIsAddContactOpen(false)} title="👤 নতুন কন্টাক্ট যোগ করুন">
        <form onSubmit={handleAddContact} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">নাম *</label>
            <input 
              type="text" 
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" 
              placeholder="যেমন: আব্দুর রহমান"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">ফোন নম্বর *</label>
            <input 
              type="text" 
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" 
              placeholder="017XXXXXXXX"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">পদবী/দায়িত্ব *</label>
            <input 
              type="text" 
              value={newContactRole}
              onChange={(e) => setNewContactRole(e.target.value)}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" 
              placeholder="যেমন: ক্যাশিয়ার"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="gray" className="flex-1" onClick={() => setIsAddContactOpen(false)}>বাতিল</Button>
            <Button type="submit" className="flex-2" loading={contactLoading}>✅ কন্টাক্ট যোগ করুন</Button>
          </div>
        </form>
      </Modal>

      {/* Notifications */}
      <Card>
        <div className="text-sm font-bold mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500" /> বিজ্ঞপ্তি পাঠান
        </div>
        <form onSubmit={handleSendNotification} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-app-text-secondary mb-1 block">প্রাপক *</label>
            <select 
              value={notifTarget}
              onChange={(e) => setNotifTarget(e.target.value)}
              className="w-full p-2.5 border-2 border-app-border rounded-xl text-xs outline-none focus:border-primary transition-all"
            >
              <option value="all">📢 সকল সদস্য</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-app-text-secondary mb-1 block">বিষয় *</label>
            <input 
              type="text" 
              value={notifSubject}
              onChange={(e) => setNotifSubject(e.target.value)}
              className="w-full p-2.5 border-2 border-app-border rounded-xl text-xs outline-none focus:border-primary transition-all" 
              placeholder="যেমন: মাসিক সভার বিজ্ঞপ্তি"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-app-text-secondary mb-1 block">বিস্তারিত বার্তা *</label>
            <textarea 
              rows={3}
              value={notifBody}
              onChange={(e) => setNotifBody(e.target.value)}
              className="w-full p-2.5 border-2 border-app-border rounded-xl text-xs outline-none focus:border-primary transition-all resize-none" 
              placeholder="বিজ্ঞপ্তির বিস্তারিত লিখুন..."
            />
          </div>
          <Button type="submit" className="w-full h-10 text-xs">
            <Send className="w-3.5 h-3.5 mr-2" /> বিজ্ঞপ্তি পাঠান
          </Button>
        </form>
      </Card>

      {/* Terms & Conditions */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> শর্তাবলী সম্পাদনা
          </div>
          <Button size="sm" variant="primary" className="h-8 px-3 rounded-lg text-[10px]">
            <Edit2 className="w-3 h-3" /> সম্পাদনা
          </Button>
        </div>
        <div className="text-[10px] text-app-text-muted italic">থ্রি-ডট মেনুতে যা সদস্যরা দেখবেন</div>
      </Card>

      {/* Developer Info */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-bold flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-indigo-500" /> ডেভেলপার তথ্য
          </div>
          <Button size="sm" variant="primary" className="h-8 px-3 rounded-lg text-[10px]">
            <Edit2 className="w-3 h-3" /> সম্পাদনা
          </Button>
        </div>
        <div className="flex items-center gap-3 p-3 bg-app-bg-secondary rounded-xl">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
            <img src="https://picsum.photos/seed/dev/200" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-xs font-bold">Sarfaraz Islam Sujon</div>
            <div className="text-[10px] text-app-text-muted">📞 01796369416</div>
          </div>
        </div>
      </Card>

      {/* Cash Fund Addition */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-bold flex items-center gap-2">
            <Banknote className="w-4 h-4 text-green-600" /> নগদ টাকা ফান্ডে যোগ
          </div>
          <Button size="sm" variant="primary" className="h-8 px-3 rounded-lg text-[10px]" onClick={() => setIsAddCashOpen(true)}>
            <Plus className="w-3 h-3" /> যোগ করুন
          </Button>
        </div>
        <div className="text-[10px] text-app-text-muted mb-3">কোনো সদস্যের না এমন নগদ টাকা সরাসরি ফান্ডে যোগ করুন। চাইলে সদস্যদের মধ্যে ভাগও করতে পারবেন।</div>
        <div className="space-y-2">
          {cashEntries.length === 0 ? (
            <div className="text-center py-4 text-app-text-muted text-xs italic">কোনো এন্ট্রি নেই</div>
          ) : (
            cashEntries.map(e => (
              <div key={e.id} className="p-2.5 bg-green-50 border border-green-100 rounded-xl flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold">{e.title}</div>
                  <div className="text-[9px] text-app-text-muted">{e.date}</div>
                </div>
                <div className="text-xs font-black text-green-600">৳{fmt(e.amount)}</div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Add Cash Entry Modal */}
      <Modal isOpen={isAddCashOpen} onClose={() => setIsAddCashOpen(false)} title="💵 নতুন ক্যাশ এন্ট্রি">
        <form onSubmit={handleAddCashEntry} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">বিবরণ *</label>
            <input 
              type="text" 
              value={newCashTitle}
              onChange={(e) => setNewCashTitle(e.target.value)}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" 
              placeholder="যেমন: অনুদান"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">পরিমাণ (৳) *</label>
            <input 
              type="number" 
              value={newCashAmount}
              onChange={(e) => setNewCashAmount(e.target.value)}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" 
              placeholder="৫০০"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="gray" className="flex-1" onClick={() => setIsAddCashOpen(false)}>বাতিল</Button>
            <Button type="submit" className="flex-2" loading={cashLoading}>✅ এন্ট্রি যোগ করুন</Button>
          </div>
        </form>
      </Modal>

      {/* Expense Management */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm font-bold flex items-center gap-2">
            <Wallet className="w-4 h-4 text-danger" /> খরচ ব্যবস্থাপনা
          </div>
          <Button size="sm" variant="primary" className="h-8 px-3 rounded-lg text-[10px]" onClick={() => setIsAddExpOpen(true)}>
            <Plus className="w-3 h-3" /> যোগ করুন
          </Button>
        </div>
        <div className="space-y-2">
          {expenses.length === 0 ? (
            <div className="text-center py-4 text-app-text-muted text-xs italic">কোনো খরচ নেই</div>
          ) : (
            expenses.map(e => (
              <div key={e.id} className="p-2.5 bg-red-50 border border-red-100 rounded-xl flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold">{e.title}</div>
                  <div className="text-[9px] text-app-text-muted">{e.date}</div>
                </div>
                <div className="text-xs font-black text-danger">৳{fmt(e.amount)}</div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Add Expense Modal */}
      <Modal isOpen={isAddExpOpen} onClose={() => setIsAddExpOpen(false)} title="💸 নতুন খরচ যোগ করুন">
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">খরচের বিবরণ *</label>
            <input 
              type="text" 
              value={newExpTitle}
              onChange={(e) => setNewExpTitle(e.target.value)}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" 
              placeholder="যেমন: অফিস ভাড়া"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">পরিমাণ (৳) *</label>
            <input 
              type="number" 
              value={newExpAmount}
              onChange={(e) => setNewExpAmount(e.target.value)}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" 
              placeholder="৫০০"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">তারিখ *</label>
            <input 
              type="date" 
              value={newExpDate}
              onChange={(e) => setNewExpDate(e.target.value)}
              className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" 
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="gray" className="flex-1" onClick={() => setIsAddExpOpen(false)}>বাতিল</Button>
            <Button type="submit" className="flex-2" loading={expLoading}>✅ খরচ যোগ করুন</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
