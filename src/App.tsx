import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';
import { ArrowDownLeft, ArrowUpRight, BookOpenText, CalendarClock, ChevronRight, CircleDollarSign, Clock3, Plus, Search, Settings2, Users, WalletCards, X } from 'lucide-react';

type Customer = { id: string; name: string; phone: string; balance: number; oldestDate: string | null; cylinderCount: number };
type Transaction = { id: string; customerId: string; customerName: string; type: 'credit' | 'payment'; amount: number; date: string; memo: string };
type CylinderRental = { id: string; customerId: string; customerName: string; type: 'rental' | 'return'; quantity: number; cylinderType: string; date: string; memo: string };
type CustomerSort = 'balance' | 'date' | 'name';

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost'; size?: 'default' | 'lg' | 'icon' | 'icon-lg' };
function Button({ variant = 'default', size = 'default', className = '', ...props }: AppButtonProps) {
  const variantClass = variant === 'outline' ? 'border border-border bg-background hover:bg-secondary' : variant === 'ghost' ? 'bg-transparent hover:bg-secondary' : 'bg-primary text-primary-foreground hover:opacity-90';
  const sizeClass = size === 'lg' ? 'h-10 px-4' : size === 'icon' ? 'size-9' : size === 'icon-lg' ? 'size-10' : 'h-9 px-3';
  return <button className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 ${variantClass} ${sizeClass} ${className}`} {...props} />;
}
function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/25 ${className}`} {...props} />;
}

const sampleCustomers: Customer[] = [
  { id: 'C001', name: '김민수', phone: '010-2468-1357', balance: 485000, oldestDate: '2026-07-03', cylinderCount: 3 },
  { id: 'C002', name: '이정희', phone: '010-9981-2046', balance: 320000, oldestDate: '2026-08-18', cylinderCount: 1 },
  { id: 'C003', name: '박성호', phone: '010-7102-8821', balance: 175000, oldestDate: '2026-09-02', cylinderCount: 0 },
  { id: 'C004', name: '최은영', phone: '010-3366-1290', balance: 80000, oldestDate: '2026-09-10', cylinderCount: 2 },
  { id: 'C005', name: '한지우', phone: '010-4877-3301', balance: 0, oldestDate: null, cylinderCount: 0 },
];
const sampleTransactions: Transaction[] = [
  { id: 'T006', customerId: 'C002', customerName: '이정희', type: 'payment', amount: 100000, date: '2026-09-14', memo: '계좌이체' },
  { id: 'T005', customerId: 'C004', customerName: '최은영', type: 'credit', amount: 80000, date: '2026-09-10', memo: '식자재 외상' },
  { id: 'T004', customerId: 'C003', customerName: '박성호', type: 'credit', amount: 175000, date: '2026-09-02', memo: '9월 납품' },
  { id: 'T003', customerId: 'C002', customerName: '이정희', type: 'credit', amount: 420000, date: '2026-08-18', memo: '정기 주문' },
  { id: 'T002', customerId: 'C001', customerName: '김민수', type: 'payment', amount: 150000, date: '2026-08-05', memo: '현금 입금' },
  { id: 'T001', customerId: 'C001', customerName: '김민수', type: 'credit', amount: 635000, date: '2026-07-03', memo: '여름 상품 납품' },
];
const sampleCylinderRentals: CylinderRental[] = [
  { id: 'R004', customerId: 'C001', customerName: '김민수', type: 'return', quantity: 1, cylinderType: 'LPG 20kg', date: '2026-09-12', memo: '빈 용기 회수' },
  { id: 'R003', customerId: 'C004', customerName: '최은영', type: 'rental', quantity: 2, cylinderType: 'LPG 20kg', date: '2026-09-10', memo: '' },
  { id: 'R002', customerId: 'C002', customerName: '이정희', type: 'rental', quantity: 1, cylinderType: 'LPG 50kg', date: '2026-09-05', memo: '' },
  { id: 'R001', customerId: 'C001', customerName: '김민수', type: 'rental', quantity: 4, cylinderType: 'LPG 20kg', date: '2026-09-01', memo: '초기 대여' },
];
const money = (value: number) => new Intl.NumberFormat('ko-KR').format(value) + '원';
const shortDate = (value: string) => new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(value));
const ageInDays = (value: string | null) => value ? Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000)) : 0;
const today = () => new Date().toISOString().slice(0, 10);

export default function Home() {
  const [customers, setCustomers] = useState(sampleCustomers);
  const [transactions, setTransactions] = useState(sampleTransactions);
  const [cylinderRentals, setCylinderRentals] = useState(sampleCylinderRentals);
  const [query, setQuery] = useState('');
  const [customerSort, setCustomerSort] = useState<CustomerSort>('balance');
  const [activeTab, setActiveTab] = useState<'home' | 'customers' | 'history'>('home');
  const [dialog, setDialog] = useState<'customer' | 'credit' | 'payment' | 'rental' | 'return' | 'settings' | 'detail' | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [toast, setToast] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [connected, setConnected] = useState(false);
  const receivables = customers.filter((c) => c.balance > 0);
  const total = receivables.reduce((sum, c) => sum + c.balance, 0);
  const totalCylinders = customers.reduce((sum, customer) => sum + customer.cylinderCount, 0);
  const filtered = customers.filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(query.toLowerCase()));
  const latestDateByCustomer = useMemo(() => {
    const latestDates = new Map<string, string>();
    transactions.forEach((transaction) => {
      const current = latestDates.get(transaction.customerId);
      if (!current || transaction.date > current) latestDates.set(transaction.customerId, transaction.date);
    });
    return latestDates;
  }, [transactions]);
  const displayedCustomers = [...(activeTab === 'home' ? filtered.filter((customer) => customer.balance > 0) : filtered)].sort((a, b) => {
    const nameOrder = a.name.localeCompare(b.name, 'ko-KR');
    if (customerSort === 'name') return nameOrder;
    if (customerSort === 'date') {
      const aDate = latestDateByCustomer.get(a.id) || '';
      const bDate = latestDateByCustomer.get(b.id) || '';
      return bDate.localeCompare(aDate) || nameOrder;
    }
    return b.balance - a.balance || nameOrder;
  });
  const visibleTransactions = useMemo(() => dialog === 'detail' && selected ? transactions.filter((t) => t.customerId === selected.id) : transactions.filter((t) => `${t.customerName} ${t.memo}`.toLowerCase().includes(query.toLowerCase())), [dialog, query, selected, transactions]);
  const visibleCylinderRentals = useMemo(() => selected ? cylinderRentals.filter((item) => item.customerId === selected.id) : [], [cylinderRentals, selected]);

  useEffect(() => {
    const savedUrl = localStorage.getItem('credit-ledger-api-url') || '';
    const savedKey = localStorage.getItem('credit-ledger-access-key') || '';
    setApiUrl(savedUrl); setAccessKey(savedKey);
    if (!savedUrl || !savedKey) return;
    fetch(`${savedUrl}?action=summary&key=${encodeURIComponent(savedKey)}&t=${Date.now()}`).then((response) => response.json()).then((data) => {
      if (!data.ok) throw new Error(data.error || '연결 오류');
      setCustomers(data.customers.map((customer: Customer) => ({ ...customer, cylinderCount: Number(customer.cylinderCount) || 0 }))); setTransactions(data.transactions); setCylinderRentals(data.cylinderRentals || []); setConnected(true);
    }).catch(() => notify('Google Sheets 연결에 실패해 예시 데이터를 표시합니다.'));
  }, []);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(''), 2400); }
  async function submit(event: React.FormEvent<HTMLFormElement>, kind: 'customer' | 'credit' | 'payment') {
    event.preventDefault(); const data = new FormData(event.currentTarget); const payload = Object.fromEntries(data.entries());
    if (apiUrl && accessKey) try { const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: kind === 'customer' ? 'addCustomer' : 'addTransaction', key: accessKey, ...payload, type: kind }) }); const result = await response.json(); if (!result.ok) throw new Error(result.error); } catch { notify('연결을 확인해 주세요. 데모 화면에는 반영했습니다.'); }
    if (kind === 'customer') {
      setCustomers((list) => [...list, { id: `C${String(list.length + 1).padStart(3, '0')}`, name: String(payload.name), phone: String(payload.phone || ''), balance: 0, oldestDate: null, cylinderCount: 0 }]); notify('고객을 등록했습니다.');
    } else {
      const customer = customers.find((c) => c.id === payload.customerId); if (!customer) return; const amount = Number(payload.amount); const date = String(payload.date);
      setTransactions((list) => [{ id: `T${Date.now()}`, customerId: customer.id, customerName: customer.name, type: kind, amount, date, memo: String(payload.memo || '') }, ...list]);
      setCustomers((list) => list.map((c) => c.id === customer.id ? { ...c, balance: Math.max(0, c.balance + (kind === 'credit' ? amount : -amount)), oldestDate: kind === 'credit' && !c.oldestDate ? date : c.oldestDate } : c));
      notify(kind === 'credit' ? '외상을 추가했습니다.' : '입금을 처리했습니다.');
    } setDialog(null);
  }
  async function submitCylinder(event: React.FormEvent<HTMLFormElement>, kind: 'rental' | 'return') {
    event.preventDefault();
    const data = new FormData(event.currentTarget); const payload = Object.fromEntries(data.entries());
    const customer = customers.find((item) => item.id === payload.customerId); if (!customer) return;
    const quantity = Number(payload.quantity); if (!Number.isFinite(quantity) || quantity <= 0) return;
    const cylinderType = String(payload.cylinderType || '').trim();
    const rentedForType = cylinderRentals.filter((item) => item.customerId === customer.id && item.cylinderType === cylinderType).reduce((sum, item) => sum + (item.type === 'rental' ? item.quantity : -item.quantity), 0);
    if (kind === 'return' && quantity > rentedForType) { notify(`${cylinderType} 대여 수량 ${Math.max(0, rentedForType)}개 이하로 입력해 주세요.`); return; }
    if (apiUrl && accessKey) try { const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'addCylinderRental', key: accessKey, ...payload, type: kind }) }); const result = await response.json(); if (!result.ok) throw new Error(result.error); } catch { notify('연결을 확인해 주세요. 데모 화면에는 반영했습니다.'); }
    const item: CylinderRental = { id: `R${Date.now()}`, customerId: customer.id, customerName: customer.name, type: kind, quantity, cylinderType, date: String(payload.date), memo: String(payload.memo || '') };
    setCylinderRentals((list) => [item, ...list]);
    setCustomers((list) => list.map((entry) => entry.id === customer.id ? { ...entry, cylinderCount: Math.max(0, entry.cylinderCount + (kind === 'rental' ? quantity : -quantity)) } : entry));
    setSelected((current) => current && current.id === customer.id ? { ...current, cylinderCount: Math.max(0, current.cylinderCount + (kind === 'rental' ? quantity : -quantity)) } : current);
    notify(kind === 'rental' ? '가스통 대여를 기록했습니다.' : '가스통 반납을 기록했습니다.'); setDialog(null);
  }
  function openDetail(customer: Customer) { setSelected(customer); setDialog('detail'); }
  function openTransaction(type: 'credit' | 'payment', customer: Customer | null = null) { setSelected(customer); setDialog(type); }
  function openCylinder(type: 'rental' | 'return', customer: Customer) { setSelected(customer); setDialog(type); }

  return <main className="min-h-screen bg-background pb-28 text-foreground">
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/92 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"><button onClick={() => setActiveTab('home')} className="flex items-center gap-2.5" aria-label="홈으로 이동"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><BookOpenText className="size-5" /></span><span className="text-left"><strong className="block text-[15px] leading-4 tracking-tight">외상노트</strong><span className="text-[11px] text-muted-foreground">받을 돈, 한눈에</span></span></button><div className="flex items-center gap-2">{connected && <span className="hidden items-center gap-1.5 text-[11px] font-semibold text-payment sm:flex"><i className="size-1.5 rounded-full bg-payment" />Sheets 연결됨</span>}<Button variant="outline" size="icon-lg" onClick={() => setDialog('settings')} aria-label="연결 설정"><Settings2 /></Button></div></div></header>
    <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8">
      <section className="balance-card overflow-hidden rounded-[26px] p-5 text-white shadow-[0_18px_50px_rgba(26,64,55,.2)] sm:p-7"><div className="flex items-start justify-between"><div><p className="text-sm text-white/70">전체 받을 금액</p><p className="mt-2 text-[32px] font-bold tracking-[-.04em] sm:text-4xl">{money(total)}</p></div><span className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium text-white/80">{receivables.length}명 미수</span></div><div className="mt-7 grid gap-2 border-t border-white/15 pt-4 text-sm text-white/72 sm:grid-cols-2"><span className="flex items-center gap-2"><CalendarClock className="size-4" /> 30일 이상 미수금 {money(receivables.filter((c) => ageInDays(c.oldestDate) >= 30).reduce((s, c) => s + c.balance, 0))}</span><span className="flex items-center gap-2 sm:justify-end"><WalletCards className="size-4" /> 현재 대여 가스통 {totalCylinders}개</span></div></section>
      <section className="mt-4 grid grid-cols-3 gap-2.5"><QuickAction icon={<ArrowUpRight />} label="외상 추가" tone="credit" onClick={() => openTransaction('credit')} /><QuickAction icon={<ArrowDownLeft />} label="입금 처리" tone="payment" onClick={() => openTransaction('payment')} /><QuickAction icon={<Users />} label="고객 등록" tone="customer" onClick={() => setDialog('customer')} /></section>
      <div className="mt-7 flex items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 shadow-sm focus-within:ring-3 focus-within:ring-ring/20"><Search className="size-4 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="고객명 또는 전화번호 검색" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" aria-label="고객 검색" />{query && <button onClick={() => setQuery('')} aria-label="검색어 지우기"><X className="size-4 text-muted-foreground" /></button>}</div>
      {activeTab !== 'history' ? <section className="mt-7"><div className="mb-3 flex items-end justify-between gap-3"><div><p className="eyebrow">RECEIVABLES</p><h2 className="mt-1 text-xl font-bold tracking-tight">{activeTab === 'home' ? '미수금 고객' : '전체 고객'}</h2></div><select value={customerSort} onChange={(event) => setCustomerSort(event.target.value as CustomerSort)} aria-label="고객 목록 정렬" className="h-9 shrink-0 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"><option value="balance">잔액 높은 순</option><option value="date">날짜 순</option><option value="name">이름 순</option></select></div><div className="grid gap-2.5 lg:grid-cols-2">{displayedCustomers.map((customer) => <button key={customer.id} onClick={() => openDetail(customer)} className="group flex w-full items-center gap-3.5 rounded-[20px] border border-border/80 bg-card p-4 text-left shadow-[0_3px_14px_rgba(39,49,45,.04)] transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary font-bold text-secondary-foreground">{customer.name.slice(0, 1)}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="text-[15px]">{customer.name}</strong>{ageInDays(customer.oldestDate) >= 30 && <span className="rounded-full bg-warning/12 px-2 py-0.5 text-[10px] font-bold text-warning">{ageInDays(customer.oldestDate)}일 경과</span>}</span><span className="mt-1 block text-xs text-muted-foreground">{customer.oldestDate ? `${shortDate(customer.oldestDate)}부터 · ${customer.phone}` : `미수금 없음 · ${customer.phone}`}</span>{customer.cylinderCount > 0 && <span className="mt-1 block text-[11px] font-bold text-warning">가스통 {customer.cylinderCount}개 대여 중</span>}</span><span className="text-right"><strong className={customer.balance > 0 ? 'block text-[15px] text-ink-red' : 'block text-[15px] text-primary'}>{money(customer.balance)}</strong><span className="mt-1 flex items-center justify-end text-[11px] text-muted-foreground">내역 <ChevronRight className="size-3.5" /></span></span></button>)}{displayedCustomers.length === 0 && <EmptyState />}</div></section> : <section className="mt-7"><div className="mb-3"><p className="eyebrow">HISTORY</p><h2 className="mt-1 text-xl font-bold tracking-tight">최근 거래내역</h2></div><TransactionList items={visibleTransactions} /></section>}
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"><div className="mx-auto grid h-17 max-w-md grid-cols-3 px-4"><NavButton active={activeTab === 'home'} icon={<CircleDollarSign />} label="현황" onClick={() => setActiveTab('home')} /><NavButton active={activeTab === 'customers'} icon={<Users />} label="고객" onClick={() => setActiveTab('customers')} /><NavButton active={activeTab === 'history'} icon={<Clock3 />} label="거래내역" onClick={() => setActiveTab('history')} /></div></nav>
    {dialog && <Modal title={{ customer: '새 고객 등록', credit: '외상 추가', payment: '입금 처리', rental: '가스통 대여', return: '가스통 반납', settings: 'Google Sheets 연결', detail: selected?.name || '거래내역' }[dialog]} onClose={() => setDialog(null)}>{dialog === 'customer' && <CustomerForm onSubmit={(e) => submit(e, 'customer')} />}{(dialog === 'credit' || dialog === 'payment') && <TransactionForm type={dialog} customers={customers} fixedCustomer={selected} onSubmit={(e) => submit(e, dialog)} />}{(dialog === 'rental' || dialog === 'return') && selected && <CylinderForm type={dialog} customer={selected} onSubmit={(e) => submitCylinder(e, dialog)} />}{dialog === 'settings' && <SettingsForm apiUrl={apiUrl} accessKey={accessKey} onSave={(url, key) => { setApiUrl(url); setAccessKey(key); localStorage.setItem('credit-ledger-api-url', url); localStorage.setItem('credit-ledger-access-key', key); setDialog(null); notify('보안 연결 정보를 저장했습니다.'); }} />}{dialog === 'detail' && selected && <CustomerDetail customer={selected} items={visibleTransactions} cylinderItems={visibleCylinderRentals} onAction={(type) => openTransaction(type, selected)} onCylinderAction={(type) => openCylinder(type, selected)} />}</Modal>}
    {toast && <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-xl">{toast}</div>}
  </main>;
}

function QuickAction({ icon, label, tone, onClick }: { icon: React.ReactNode; label: string; tone: string; onClick: () => void }) { return <button onClick={onClick} className={`quick-action quick-${tone}`}><span className="grid size-9 place-items-center rounded-xl bg-current/10 [&_svg]:size-[18px]">{icon}</span><span className="mt-2 text-xs font-bold sm:text-sm">{label}</span></button>; }
function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) { return <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? 'text-primary' : 'text-muted-foreground'} [&_svg]:size-5`} aria-current={active ? 'page' : undefined}>{icon}{label}</button>; }
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[88vh] w-full overflow-y-auto rounded-t-[28px] bg-card p-5 shadow-2xl sm:max-w-md sm:rounded-[24px]"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold tracking-tight">{title}</h2><Button variant="ghost" size="icon" onClick={onClose} aria-label="닫기"><X /></Button></div>{children}</section></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm font-semibold">{label}{children}</label>; }
function CustomerForm({ onSubmit }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) { return <form onSubmit={onSubmit} className="grid gap-4"><Field label="고객명"><Input name="name" required placeholder="예: 김민수" className="h-11" /></Field><Field label="전화번호"><Input name="phone" type="tel" placeholder="010-0000-0000" className="h-11" /></Field><Field label="메모"><Input name="memo" placeholder="선택 입력" className="h-11" /></Field><Button type="submit" size="lg" className="mt-2 h-12 rounded-xl text-base">고객 등록하기</Button></form>; }
function TransactionForm({ type, customers, fixedCustomer, onSubmit }: { type: 'credit' | 'payment'; customers: Customer[]; fixedCustomer: Customer | null; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) { return <form onSubmit={onSubmit} className="grid gap-4">{fixedCustomer ? <div><p className="mb-1.5 text-sm font-semibold">고객</p><input type="hidden" name="customerId" value={fixedCustomer.id} /><div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-secondary/65 p-3.5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary font-bold text-primary-foreground">{fixedCustomer.name.slice(0, 1)}</span><span className="min-w-0 flex-1"><strong className="block text-sm">{fixedCustomer.name}</strong><span className="mt-0.5 block text-xs text-muted-foreground">{fixedCustomer.phone || '전화번호 없음'} · 현재 {money(fixedCustomer.balance)}</span></span><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">선택 고정</span></div></div> : <Field label="고객"><select name="customerId" required className="h-11 rounded-lg border border-input bg-background px-3 text-sm">{customers.map((c) => <option key={c.id} value={c.id}>{c.name} · 현재 {money(c.balance)}</option>)}</select></Field>}<Field label={type === 'credit' ? '외상 금액' : '입금 금액'}><Input name="amount" type="number" min="1" required placeholder="0" className="h-11 text-lg font-bold" /></Field><Field label="거래일"><Input name="date" type="date" required defaultValue={today()} className="h-11" /></Field><Field label="메모"><Input name="memo" placeholder={type === 'credit' ? '품목 또는 외상 사유' : '현금, 계좌이체 등'} className="h-11" /></Field><Button type="submit" size="lg" className={`mt-2 h-12 rounded-xl text-base ${type === 'payment' ? 'bg-payment hover:bg-payment/90' : ''}`}>{type === 'credit' ? '외상 추가하기' : '입금 처리하기'}</Button></form>; }
function CylinderForm({ type, customer, onSubmit }: { type: 'rental' | 'return'; customer: Customer; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) { return <form onSubmit={onSubmit} className="grid gap-4"><div><p className="mb-1.5 text-sm font-semibold">고객</p><input type="hidden" name="customerId" value={customer.id} /><div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-secondary/65 p-3.5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary font-bold text-primary-foreground">{customer.name.slice(0, 1)}</span><span className="min-w-0 flex-1"><strong className="block text-sm">{customer.name}</strong><span className="mt-0.5 block text-xs text-muted-foreground">현재 가스통 {customer.cylinderCount}개 대여 중</span></span><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">선택 고정</span></div></div><Field label="가스통 규격"><Input name="cylinderType" required placeholder="예: LPG 20kg" className="h-11" /></Field><Field label={type === 'rental' ? '대여 수량' : '반납 수량'}><Input name="quantity" type="number" min="1" max={type === 'return' ? customer.cylinderCount : undefined} required placeholder="0" className="h-11 text-lg font-bold" /></Field><Field label={type === 'rental' ? '대여일' : '반납일'}><Input name="date" type="date" required defaultValue={today()} className="h-11" /></Field><Field label="메모"><Input name="memo" placeholder="용기 번호 또는 참고사항" className="h-11" /></Field><Button type="submit" size="lg" disabled={type === 'return' && customer.cylinderCount === 0} className={`mt-2 h-12 rounded-xl text-base ${type === 'return' ? 'bg-payment hover:bg-payment/90' : ''}`}>{type === 'rental' ? '대여 기록하기' : customer.cylinderCount === 0 ? '반납할 가스통이 없습니다' : '반납 기록하기'}</Button></form>; }
function SettingsForm({ apiUrl, accessKey, onSave }: { apiUrl: string; accessKey: string; onSave: (url: string, key: string) => void }) { const [url, setUrl] = useState(apiUrl); const [key, setKey] = useState(accessKey); return <form onSubmit={(e) => { e.preventDefault(); onSave(url, key); }} className="grid gap-4"><div className="rounded-2xl bg-secondary/65 p-4 text-sm leading-6 text-secondary-foreground"><strong className="block">설정은 한 번만 하면 됩니다.</strong>배포한 Apps Script 주소와 직접 만든 접근 키를 입력하세요. 두 값은 이 기기에만 저장됩니다.</div><Field label="Apps Script 웹 앱 URL"><Input value={url} onChange={(e) => setUrl(e.target.value)} type="url" required placeholder="https://script.google.com/macros/s/.../exec" className="h-11" /></Field><Field label="접근 키"><Input value={key} onChange={(e) => setKey(e.target.value)} type="password" required minLength={16} placeholder="16자 이상의 긴 암호" className="h-11" /></Field><Button type="submit" size="lg" className="h-12 rounded-xl">보안 연결 저장</Button><p className="text-center text-xs text-muted-foreground">연결 전에는 예시 데이터로 체험할 수 있습니다.</p></form>; }
function CustomerDetail({ customer, items, cylinderItems, onAction, onCylinderAction }: { customer: Customer; items: Transaction[]; cylinderItems: CylinderRental[]; onAction: (type: 'credit' | 'payment') => void; onCylinderAction: (type: 'rental' | 'return') => void }) { return <div><div className="grid grid-cols-2 gap-2"><div className="rounded-2xl bg-secondary/60 p-4"><p className="text-xs text-muted-foreground">현재 받을 금액</p><p className="mt-1 text-xl font-bold text-ink-red">{money(customer.balance)}</p></div><div className="rounded-2xl bg-warning/10 p-4"><p className="text-xs text-muted-foreground">대여 중인 가스통</p><p className="mt-1 text-xl font-bold text-warning">{customer.cylinderCount}개</p></div></div><p className="mt-2 px-1 text-xs text-muted-foreground">{customer.phone}</p><div className="mt-3 grid grid-cols-2 gap-2"><Button onClick={() => onAction('credit')} className="h-11"><Plus /> 외상 추가</Button><Button onClick={() => onAction('payment')} variant="outline" className="h-11 text-payment"><ArrowDownLeft /> 입금 처리</Button><Button onClick={() => onCylinderAction('rental')} className="h-11 bg-warning hover:bg-warning/90"><Plus /> 가스통 대여</Button><Button onClick={() => onCylinderAction('return')} variant="outline" className="h-11 text-warning">가스통 반납</Button></div><h3 className="mb-2 mt-6 text-sm font-bold">가스통 대여내역</h3><CylinderRentalList items={cylinderItems} /><h3 className="mb-2 mt-6 text-sm font-bold">외상·입금 거래내역</h3><TransactionList items={items} /></div>; }
function TransactionList({ items }: { items: Transaction[] }) { return <div className="overflow-hidden rounded-[20px] border border-border bg-card">{items.map((item, index) => <div key={item.id} className={`flex items-center gap-3 p-4 ${index ? 'border-t border-border/70' : ''}`}><span className={`grid size-10 place-items-center rounded-xl ${item.type === 'credit' ? 'bg-ink-red/8 text-ink-red' : 'bg-payment/10 text-payment'}`}>{item.type === 'credit' ? <ArrowUpRight className="size-5" /> : <ArrowDownLeft className="size-5" />}</span><span className="min-w-0 flex-1"><strong className="block text-sm">{item.customerName}</strong><span className="mt-0.5 block truncate text-xs text-muted-foreground">{shortDate(item.date)} · {item.memo || (item.type === 'credit' ? '외상' : '입금')}</span></span><strong className={`text-sm ${item.type === 'credit' ? 'text-ink-red' : 'text-payment'}`}>{item.type === 'credit' ? '+' : '−'}{money(item.amount)}</strong></div>)}{items.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">거래내역이 없습니다.</div>}</div>; }
function CylinderRentalList({ items }: { items: CylinderRental[] }) { return <div className="overflow-hidden rounded-[20px] border border-border bg-card">{items.map((item, index) => <div key={item.id} className={`flex items-center gap-3 p-4 ${index ? 'border-t border-border/70' : ''}`}><span className={`grid size-10 place-items-center rounded-xl font-bold ${item.type === 'rental' ? 'bg-warning/10 text-warning' : 'bg-payment/10 text-payment'}`}>{item.type === 'rental' ? '+' : '−'}</span><span className="min-w-0 flex-1"><strong className="block text-sm">{item.cylinderType}</strong><span className="mt-0.5 block truncate text-xs text-muted-foreground">{shortDate(item.date)} · {item.memo || (item.type === 'rental' ? '대여' : '반납')}</span></span><strong className={`text-sm ${item.type === 'rental' ? 'text-warning' : 'text-payment'}`}>{item.type === 'rental' ? '대여' : '반납'} {item.quantity}개</strong></div>)}{items.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">가스통 대여내역이 없습니다.</div>}</div>; }
function EmptyState() { return <div className="col-span-full rounded-[20px] border border-dashed border-border p-10 text-center"><WalletCards className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">검색 결과가 없습니다.</p></div>; }
