import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { User, Role, AppSettings } from './types';
import { Header } from './components/Header';
import { BottomNav, Page } from './components/BottomNav';
import { Toast } from './components/Toast';
import { Modal } from './components/Modal';
import { Button } from './components/Button';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Info, 
  FileText, 
  TrendingUp, 
  UserCheck, 
  Share2, 
  Download, 
  Trash2, 
  LogOut, 
  Moon, 
  Sun,
  MoreVertical,
  Clipboard,
  Medal,
  LineChart,
  CloudUpload,
  CloudDownload
} from 'lucide-react';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { Deposits } from './pages/Deposits';
import { Loans } from './pages/Loans';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { MyPage } from './pages/MyPage';
import { Modals } from './components/Modals';
import { MemberDetails } from './components/MemberDetails';
import { NotificationsModal } from './components/NotificationsModal';
import { hashPin, normalizeDigits } from './lib/crypto';
import { handleFirestoreError, OperationType } from './lib/firestore-utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Modal states
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddDepositOpen, setIsAddDepositOpen] = useState(false);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isAddInstallmentOpen, setIsAddInstallmentOpen] = useState(false);
  
  // Additional Modals
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isInvestDetailsOpen, setIsInvestDetailsOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [pendingRegs, setPendingRegs] = useState<any[]>([]);

  const [investments, setInvestments] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Member details state
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [isMemberDetailsOpen, setIsMemberDetailsOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<User | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('bm_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('bm_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('bm_theme', 'light');
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setIsAuthReady(true);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (e: any) {
          console.error("Anonymous sign-in failed", e);
          if (e.code === 'auth/admin-restricted-operation') {
            const msg = `⚠️ ফায়ারবেস কনসোলে 'Anonymous Auth' চালু করা নেই। অনুগ্রহ করে Firebase Console > Authentication > Sign-in method-এ গিয়ে এটি Enable করুন।`;
            showToast(msg);
            console.warn(msg);
          } else {
            showToast(`❌ লগইন ব্যর্থ: ${e.message}`);
          }
          setIsAuthReady(true);
        }
      }
    });

    const savedUser = localStorage.getItem('bm_session');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    // Load settings (publicly readable by auth users)
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AppSettings);
      } else {
        // Initialize default settings if they don't exist
        const defaultSettings: AppSettings = {
          id: 'main',
          monthly_deposit: 500,
          interest_rate: 10,
          excel_link: '',
          super_admin_phone: '01796369416',
          super_admin_pin_hash: '' // Will be set later or used for bootstrap
        };
        setDoc(doc(db, 'settings', 'main'), defaultSettings).catch(console.error);
        setSettings(defaultSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/main');
    });

    // If no user is logged in, only load settings
    if (!user) {
      setLoading(false);
      return () => unsubscribeSettings();
    }

    // Load investments for details modal
    const unsubscribeInv = onSnapshot(collection(db, 'investments'), (snap) => {
      setInvestments(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'investments'));

    // Load contacts for contacts modal
    const unsubscribeContacts = onSnapshot(collection(db, 'contacts'), (snap) => {
      setContacts(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'contacts'));

    // Load general notifications for members
    const qNotifs = user.role === 'admin' 
      ? query(collection(db, 'notifications'), orderBy('sent_at', 'desc'))
      : query(collection(db, 'notifications'), where('target', 'in', [user.id, 'all']), orderBy('sent_at', 'desc'));

    const unsubscribeNotifs = onSnapshot(qNotifs, (snap) => {
      setNotifications(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'notifications'));

    let unsubscribeMembers = () => {};
    let unsubscribeDeposits = () => {};
    let unsubscribeInstallments = () => {};
    let unsubscribeLoans = () => {};
    let unsubscribeRequests = () => {};
    let unsubscribeRegs = () => {};

    // Admin-only listeners
    if (user.role === 'admin') {
      unsubscribeMembers = onSnapshot(collection(db, 'members'), (snap) => {
        setMembers(snap.docs.map(d => ({ ...d.data(), id: d.id } as User)));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'members'));

      unsubscribeDeposits = onSnapshot(collection(db, 'deposits'), (snap) => {
        setDeposits(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'deposits'));

      unsubscribeInstallments = onSnapshot(collection(db, 'installments'), (snap) => {
        setInstallments(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'installments'));

      unsubscribeLoans = onSnapshot(collection(db, 'loans'), (snap) => {
        setLoans(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'loans'));

      unsubscribeRequests = onSnapshot(query(collection(db, 'requests'), where('status', '==', 'pending')), (snap) => {
        setPendingRequests(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'requests'));

      unsubscribeRegs = onSnapshot(collection(db, 'pending_regs'), (snap) => {
        setPendingRegs(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'pending_regs'));
    }

    setLoading(false);
    return () => {
      unsubscribeSettings();
      unsubscribeInv();
      unsubscribeContacts();
      unsubscribeMembers();
      unsubscribeDeposits();
      unsubscribeInstallments();
      unsubscribeLoans();
      unsubscribeNotifs();
      unsubscribeRequests();
      unsubscribeRegs();
    };
  }, [isAuthReady, user]);

  const showToast = (msg: string) => setToastMessage(msg);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('bm_session');
    showToast('লগআউট হয়েছে');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-linear-to-br from-primary-dark via-primary to-primary-light flex flex-col items-center justify-center z-[9999] text-white gap-4">
        <div className="text-[60px] animate-pulse">🤝</div>
        <h2 className="font-serif text-xl font-bold">বন্ধুমহল ফাউন্ডেশন</h2>
        <p className="text-xs opacity-75">সংযোগ স্থাপন হচ্ছে...</p>
        <div className="w-9 h-9 border-3 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={(u) => { setUser(u); localStorage.setItem('bm_session', JSON.stringify(u)); }} showToast={showToast} settings={settings} />;
  }

  const handleAction = (action: string) => {
    if (action === 'add_member') setIsAddMemberOpen(true);
    if (action === 'add_deposit' || action === 'req_deposit') setIsAddDepositOpen(true);
    if (action === 'add_loan' || action === 'req_loan') setIsAddLoanOpen(true);
    if (action === 'add_installment' || action === 'req_installment') setIsAddInstallmentOpen(true);
    if (action === 'goto_mypage') setActivePage('mypage');
  };

  return (
    <div className="flex flex-col min-h-screen pb-[68px] bg-app-bg">
      <Header 
        title="বন্ধুমহল ফাউন্ডেশন" 
        subtitle="Bondhumohol Foundation"
        rightElement={
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-semibold text-white bg-white/20",
              user.role === 'admin' && "bg-accent"
            )}>
              {user.role === 'admin' ? '👑 অ্যাডমিন' : '👤 সদস্য'}
            </span>
            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="w-[34px] h-[34px] bg-white/15 rounded-lg flex items-center justify-center text-white relative active:bg-white/30 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {user.role === 'admin' ? (
                (pendingRequests.length + pendingRegs.length) > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                    {pendingRequests.length + pendingRegs.length}
                  </span>
                )
              ) : (
                notifications.filter(n => !n.read_by?.includes(user.id)).length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                    {notifications.filter(n => !n.read_by?.includes(user.id)).length}
                  </span>
                )
              )}
            </button>
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="w-[34px] h-[34px] bg-white/15 rounded-lg flex items-center justify-center text-white text-base active:bg-white/30 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <main className="flex-1 p-[13px] pb-1 overflow-y-auto scrollbar-hide">
        {activePage === 'dashboard' && <Dashboard currentUser={user} onAction={handleAction} />}
        {activePage === 'members' && (
          <Members 
            currentUser={user} 
            onMemberClick={(m) => { setSelectedMember(m); setIsMemberDetailsOpen(true); }} 
            onAddMember={() => setIsAddMemberOpen(true)} 
          />
        )}
        {activePage === 'deposits' && <Deposits currentUser={user} onAddDeposit={() => setIsAddDepositOpen(true)} />}
        {activePage === 'loans' && <Loans currentUser={user} onAddLoan={() => setIsAddLoanOpen(true)} onInstallment={() => setIsAddInstallmentOpen(true)} />}
        {activePage === 'reports' && <Reports currentUser={user} />}
        {activePage === 'settings' && <Settings currentUser={user} showToast={showToast} />}
        {activePage === 'mypage' && <MyPage currentUser={user} onEditProfile={() => { setMemberToEdit(user); setIsAddMemberOpen(true); }} onAction={handleAction} />}
      </main>

      <BottomNav activePage={activePage} onPageChange={setActivePage} role={user.role} />
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      <Modals 
        isAddMemberOpen={isAddMemberOpen} 
        setIsAddMemberOpen={(open) => { setIsAddMemberOpen(open); if (!open) setMemberToEdit(null); }}
        isAddDepositOpen={isAddDepositOpen} setIsAddDepositOpen={setIsAddDepositOpen}
        isAddLoanOpen={isAddLoanOpen} setIsAddLoanOpen={setIsAddLoanOpen}
        isAddInstallmentOpen={isAddInstallmentOpen} setIsAddInstallmentOpen={setIsAddInstallmentOpen}
        currentUser={user} settings={settings} showToast={showToast}
        editMember={memberToEdit}
      />

      <MemberDetails 
        isOpen={isMemberDetailsOpen}
        onClose={() => setIsMemberDetailsOpen(false)}
        member={selectedMember}
        currentUser={user}
        onEdit={(m) => { setMemberToEdit(m); setIsMemberDetailsOpen(false); setIsAddMemberOpen(true); }}
        showToast={showToast}
      />

      <NotificationsModal 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        pendingRequests={pendingRequests}
        pendingRegs={pendingRegs}
        members={members}
        deposits={deposits}
        installments={installments}
        loans={loans}
        notifications={notifications}
        currentUser={user}
        showToast={showToast}
      />

      {/* Menu Modal */}
      <Modal 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        hideHeader 
        position="top-right"
        size="sm"
        disableAnimation
        noPadding
      >
        <div className="bg-white overflow-hidden">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between py-4 px-5 border-b border-app-border/5">
            <div className="flex items-center gap-4">
              <div className="text-[#FBBF24]">
                <Moon className="w-5 h-5 fill-current" />
              </div>
              <span className="text-[14px] font-bold text-app-text-primary">ডার্ক মোড</span>
            </div>
            <button 
              onClick={toggleDarkMode}
              className={cn(
                "w-11 h-6 rounded-full transition-all relative p-1",
                isDarkMode ? "bg-primary" : "bg-slate-200"
              )}
            >
              <div className={cn(
                "w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300",
                isDarkMode ? "translate-x-5" : "translate-x-0"
              )} />
            </button>
          </div>

          {/* Menu Items List */}
          <div className="divide-y divide-app-border/5">
            {[
              { icon: <Clipboard className="w-5 h-5 text-amber-700/60" />, label: 'ফাউন্ডেশনের শর্তাবলী', onClick: () => setIsTermsOpen(true) },
              { icon: <LineChart className="w-5 h-5 text-red-500/80" />, label: 'বিনিয়োগের বিস্তারিত', onClick: () => setIsInvestDetailsOpen(true) },
              { icon: <Medal className="w-5 h-5 text-blue-500" />, label: 'ফান্ডে দায়িত্বরত ব্যক্তি', onClick: () => setIsContactsOpen(true) },
              { icon: <Info className="w-5 h-5 text-blue-400" />, label: 'অ্যাপ সম্পর্কে', onClick: () => setIsAboutOpen(true) },
              { icon: <CloudUpload className="w-5 h-5 text-orange-500" />, label: 'ডেটা ব্যাকআপ', onClick: () => {} },
              { icon: <CloudDownload className="w-5 h-5 text-orange-600" />, label: 'ডেটা রিস্টোর', onClick: () => {} },
              { icon: <Trash2 className="w-5 h-5 text-red-500" />, label: 'সব ডেটা মুছুন', color: 'text-red-600', onClick: () => {} },
              { icon: <LogOut className="w-5 h-5 text-red-500" />, label: 'লগআউট', color: 'text-red-600', onClick: handleLogout },
            ].map((item, i) => (
              <button 
                key={i}
                onClick={() => { item.onClick(); setIsMenuOpen(false); }}
                className="w-full flex items-center gap-4 py-4.5 px-5 hover:bg-app-bg-secondary active:bg-app-bg-secondary transition-colors text-left"
              >
                <div className="flex-shrink-0">
                  {item.icon}
                </div>
                <span className={cn(
                  "text-[14px] font-bold",
                  item.color || "text-app-text-secondary"
                )}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Static Content Modals */}
      <Modal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} title="ফাউন্ডেশনের শর্তাবলী">
        <div className="prose prose-sm max-h-[60vh] overflow-y-auto p-2">
          <h4 className="text-primary">১. সদস্যপদ</h4>
          <p>ফাউন্ডেশনের সদস্য হতে হলে নির্ধারিত ফি প্রদান করতে হবে এবং নিয়মিত মাসিক জমা দিতে হবে।</p>
          <h4 className="text-primary">২. সঞ্চয় ও ঋণ</h4>
          <p>প্রতি মাসের ১০ তারিখের মধ্যে মাসিক জমা দিতে হবে। ঋণ গ্রহণের ক্ষেত্রে নির্দিষ্ট শর্তাবলী প্রযোজ্য হবে।</p>
          {/* Add more content as needed */}
        </div>
      </Modal>

      <Modal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} title="অ্যাপ সম্পর্কে">
        <div className="text-center p-4 space-y-4">
          <div className="text-5xl">🤝</div>
          <div>
            <h3 className="font-serif text-lg font-bold text-primary">বন্ধুমহল ফাউন্ডেশন</h3>
            <p className="text-xs text-app-text-muted">ভার্সন ৩.০.০</p>
          </div>
          <p className="text-sm text-app-text-secondary leading-relaxed">
            এটি একটি সঞ্চয় ও ঋণ ব্যবস্থাপনা অ্যাপ। বন্ধুদের মধ্যে স্বচ্ছতা ও সহজ হিসাব রাখার জন্য এটি তৈরি করা হয়েছে।
          </p>
          <div className="pt-4 border-t border-app-border">
            <p className="text-[10px] text-app-text-muted">© ২০২৪ বন্ধুমহল ফাউন্ডেশন। সর্বস্বত্ব সংরক্ষিত।</p>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isInvestDetailsOpen} onClose={() => setIsInvestDetailsOpen(false)} title="📈 বিনিয়োগের বিস্তারিত">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto p-1">
          {investments.length === 0 ? (
            <div className="text-center py-8 text-app-text-muted text-xs italic">কোনো বিনিয়োগ নেই</div>
          ) : (
            investments.map(inv => (
              <div key={inv.id} className={cn(
                "p-3 rounded-xl border",
                inv.status === 'active' ? "bg-blue-50 border-blue-100" : "bg-green-50 border-green-100"
              )}>
                <div className="flex justify-between items-center mb-1">
                  <div className="text-xs font-bold">{inv.title}</div>
                  <span className={cn(
                    "text-[8px] font-bold px-1.5 py-0.5 rounded-full",
                    inv.status === 'active' ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                  )}>
                    {inv.status === 'active' ? 'চলমান' : 'সম্পন্ন'}
                  </span>
                </div>
                <div className="text-[10px] text-app-text-muted mb-2">📅 {inv.invest_date}</div>
                <div className="flex justify-between text-[11px]">
                  <span>বিনিয়োগ: <b>৳{inv.amount.toLocaleString('en-IN')}</b></span>
                  <span>লাভ: <b className="text-blue-600">৳{inv.profit.toLocaleString('en-IN')}</b></span>
                </div>
                {inv.status === 'received' && (
                  <div className="mt-2 pt-2 border-t border-green-200 text-[11px] text-green-700 font-bold">
                    💰 ফেরত পেয়েছেন: ৳{inv.received_amount?.toLocaleString('en-IN')} ({inv.received_date})
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal isOpen={isContactsOpen} onClose={() => setIsContactsOpen(false)} title="👤 ফান্ডে দায়িত্বরত ব্যক্তি">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto p-1">
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-app-text-muted text-xs italic">কেউ যোগ করা হয়নি</div>
          ) : (
            contacts.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 bg-app-bg-secondary rounded-xl">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {c.photo ? <img src={c.photo} className="w-full h-full rounded-full object-cover" /> : c.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{c.name}</div>
                  <div className="text-[10px] text-primary font-bold">{c.position || c.role}</div>
                  <div className="text-[10px] text-app-text-muted">📞 {c.phone}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} title="📄 ডকুমেন্টস">
        <div className="space-y-4 p-2">
          <div className="p-4 bg-app-bg-secondary rounded-xl text-center">
            <FileText className="w-10 h-10 text-primary mx-auto mb-2 opacity-50" />
            <p className="text-xs text-app-text-muted italic">এখনো কোনো ডকুমেন্ট আপলোড করা হয়নি।</p>
          </div>
          <Button variant="gray" className="w-full" onClick={() => setIsDocsOpen(false)}>বন্ধ করুন</Button>
        </div>
      </Modal>
    </div>
  );
}

// --- Auth Screen ---

interface AuthScreenProps {
  onLogin: (user: User) => void;
  showToast: (msg: string) => void;
  settings: AppSettings | null;
}

function AuthScreen({ onLogin, showToast, settings }: AuthScreenProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [pinBuf, setPinBuf] = useState('');
  const [loading, setLoading] = useState(false);

  // Registration states
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regPinConfirm, setRegPinConfirm] = useState('');

  const handleNumpad = (n: number) => {
    if (pinBuf.length >= 4) return;
    const newBuf = pinBuf + n;
    setPinBuf(newBuf);
    if (newBuf.length === 4) {
      setTimeout(() => doLogin(newBuf), 200);
    }
  };

  const handleDel = () => setPinBuf(pinBuf.slice(0, -1));

  const doLogin = async (inputPin: string) => {
    if (!phone) { showToast('⚠️ ফোন নম্বর দিন'); setPinBuf(''); return; }
    setLoading(true);
    
    try {
      const normPhone = normalizeDigits(phone);
      const inputHash = await hashPin(normPhone, inputPin);
      
      // 1. Super Admin Check
      if (settings && inputHash === settings.super_admin_pin_hash && (settings.super_admin_phone === '' || normPhone === settings.super_admin_phone)) {
        onLogin({ id: 'SUPER', name: 'সুপার অ্যাডমিন', phone: normPhone, role: 'admin', isSuperAdmin: true });
        return;
      }

      // 2. Admin Check
      const adminSnap = await getDocs(query(collection(db, 'admins'), where('phone', '==', normPhone), where('pin_hash', '==', inputHash)));
      if (!adminSnap.empty) {
        const adminDoc = adminSnap.docs[0];
        const adminData = adminDoc.data() as User;
        
        // Link Firebase UID to Admin for Security Rules
        if (auth.currentUser) {
          const firebaseUid = auth.currentUser.uid;
          await updateDoc(doc(db, 'admins', adminDoc.id), { firebase_uid: firebaseUid });
          adminData.firebase_uid = firebaseUid;
        }
        
        onLogin({ ...adminData, id: adminDoc.id, role: 'admin' });
        return;
      }

      // 3. Member Check
      const memberSnap = await getDocs(query(collection(db, 'members'), where('phone', '==', normPhone), where('pin_hash', '==', inputHash)));
      if (!memberSnap.empty) {
        const memberDoc = memberSnap.docs[0];
        const memberData = memberDoc.data() as User;
        
        // Link Firebase UID to Member for Security Rules
        if (auth.currentUser) {
          const firebaseUid = auth.currentUser.uid;
          await updateDoc(doc(db, 'members', memberDoc.id), { firebase_uid: firebaseUid });
          memberData.firebase_uid = firebaseUid;
        }
        
        onLogin({ ...memberData, id: memberDoc.id, role: 'member' });
        return;
      }

      // 4. Pending Check
      const pendingSnap = await getDocs(query(collection(db, 'pending_regs'), where('phone', '==', normPhone)));
      if (!pendingSnap.empty) {
        showToast('⏳ আপনার নিবন্ধন অনুমোদনের অপেক্ষায় আছে');
      } else {
        showToast('❌ ফোন বা পিন সঠিক নয়');
      }
      setPinBuf('');
    } catch (e) {
      showToast('❌ লগইন ব্যর্থ হয়েছে');
      setPinBuf('');
    } finally {
      setLoading(false);
    }
  };

  const doRegister = async () => {
    if (!regName || !regPhone || !regPin) { showToast('⚠️ নাম, ফোন ও পিন আবশ্যক'); return; }
    if (regPin.length !== 4) { showToast('⚠️ পিন অবশ্যই ৪ সংখ্যার'); return; }
    if (regPin !== regPinConfirm) { showToast('⚠️ পিন মিলছে না'); return; }
    
    setLoading(true);
    try {
      const normPhone = normalizeDigits(regPhone);
      const pin_hash = await hashPin(normPhone, regPin);
      
      // Check if any admins exist
      const adminSnap = await getDocs(collection(db, 'admins'));
      const isFirstUser = adminSnap.empty;

      if (isFirstUser && auth.currentUser) {
        // First user becomes admin automatically
        const adminData = {
          name: regName,
          phone: normPhone,
          pin_hash,
          role: 'admin',
          join_date: new Date().toISOString(),
          firebase_uid: auth.currentUser.uid
        };
        await setDoc(doc(db, 'admins', auth.currentUser.uid), adminData);
        
        showToast('✅ আপনি প্রথম ইউজার হিসেবে অ্যাডমিন হিসেবে নিবন্ধিত হয়েছেন');
        onLogin({ 
          ...adminData,
          id: auth.currentUser.uid
        } as User);
      } else {
        await addDoc(collection(db, 'pending_regs'), {
          name: regName,
          phone: normPhone,
          pin_hash,
          role: 'member',
          firebase_uid: auth.currentUser.uid,
          created_at: new Date().toISOString()
        });
        showToast('✅ নিবন্ধন অনুরোধ পাঠানো হয়েছে');
        setTab('login');
        setPhone(normPhone);
      }
    } catch (e) {
      showToast('❌ নিবন্ধন ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-linear-to-br from-primary-dark via-primary to-primary-light z-[9999] overflow-y-auto">
      <div className="shrink-0 h-[28vh] flex flex-col items-center justify-center p-4 text-white text-center">
        <div className="text-[44px] mb-2">🤝</div>
        <h1 className="font-serif text-xl font-bold mb-1">বন্ধুমহল ফাউন্ডেশন</h1>
        <p className="text-[11px] opacity-80">আপনার বন্ধুদের সঞ্চয় তহবিল</p>
      </div>
      
      <div className="bg-app-bg rounded-t-[28px] p-[18px] px-4 pb-8 shrink-0 min-h-[62vh]">
        <div className="flex bg-app-bg-secondary rounded-lg p-1 mb-5">
          <button 
            onClick={() => setTab('login')}
            className={cn("flex-1 text-center py-2.5 rounded-md text-sm font-bold transition-all", tab === 'login' ? "bg-white text-primary shadow-sm" : "text-app-text-muted")}
          >
            লগইন
          </button>
          <button 
            onClick={() => setTab('register')}
            className={cn("flex-1 text-center py-2.5 rounded-md text-sm font-bold transition-all", tab === 'register' ? "bg-white text-primary shadow-sm" : "text-app-text-muted")}
          >
            নিবন্ধন
          </button>
        </div>

        {tab === 'login' ? (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">ফোন নম্বর</label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3.5 border-2 border-app-border rounded-app-sm text-base font-sans outline-none focus:border-primary transition-all" 
                placeholder="০১XXXXXXXXX"
              />
            </div>
            
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">পিন কোড</label>
              <div className="flex gap-2.5 justify-center my-4">
                {[0, 1, 2, 3].map(i => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-[52px] h-[52px] border-2 border-app-border rounded-xl flex items-center justify-center text-2xl font-bold transition-all bg-white",
                      pinBuf.length > i && "bg-primary border-primary text-white"
                    )}
                  >
                    {pinBuf.length > i ? '●' : '•'}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                  <button key={n} onClick={() => handleNumpad(n)} className="p-4 text-xl font-bold bg-app-bg-secondary rounded-xl active:scale-92 transition-all">{n}</button>
                ))}
                <button onClick={handleDel} className="p-4 text-sm font-bold bg-white border border-app-border rounded-xl active:scale-92 transition-all">⌫</button>
                <button onClick={() => handleNumpad(0)} className="p-4 text-xl font-bold bg-app-bg-secondary rounded-xl active:scale-92 transition-all">0</button>
                <button onClick={() => doLogin(pinBuf)} className="p-4 text-xl font-bold bg-primary text-white rounded-xl active:scale-92 transition-all">✓</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-100 p-3 rounded-xl text-[11px] text-primary leading-relaxed">
              ℹ️ নিবন্ধনের পর অ্যাডমিন অনুমোদন দিলে লগইন করতে পারবেন।
            </div>
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">আপনার নাম *</label>
              <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="নাম লিখুন" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">ফোন নম্বর *</label>
              <input type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="০১XXXXXXXXX" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">পিন কোড *</label>
                <input type="password" value={regPin} onChange={(e) => setRegPin(e.target.value)} maxLength={4} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="৪ সংখ্যা" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-app-text-secondary mb-1 block">পিন নিশ্চিত করুন *</label>
                <input type="password" value={regPinConfirm} onChange={(e) => setRegPinConfirm(e.target.value)} maxLength={4} className="w-full p-3 border-2 border-app-border rounded-app-sm text-sm outline-none focus:border-primary transition-all" placeholder="পুনরায় দিন" />
              </div>
            </div>
            <Button onClick={doRegister} loading={loading} className="w-full mt-4">📝 নিবন্ধন করুন</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Utils ---
// Redundant functions removed as they are now imported from src/lib/crypto.ts
