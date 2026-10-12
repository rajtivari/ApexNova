'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowDownToLine, Check, CircleDollarSign, Crosshair, LogOut, ShieldCheck, Users, Wallet, X } from 'lucide-react';

const SESSION_KEY = 'apexnova-local-session-v1';
const PAYMENTS_KEY = 'apexnova-local-payments-v1';
const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN');

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [payments, setPayments] = useState([]);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState('PENDING');

  useEffect(() => {
    try {
      const current = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (current?.role === 'SUPER_ADMIN') setSession(current);
      setPayments(JSON.parse(localStorage.getItem(PAYMENTS_KEY) || '[]'));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => { if (ready) localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments)); }, [payments, ready]);

  function updatePayment(id, status) {
    setPayments((items) => items.map((item) => item.id === id ? { ...item, status, reviewedAt: new Date().toISOString(), reviewedBy: session?.email || 'Local demo admin' } : item));
  }
  function signOut() { localStorage.removeItem(SESSION_KEY); window.location.href = '/ApexNova/login'; }

  if (!ready) return <main className="shell"><p className="eyebrow">LOADING ADMIN CONSOLE…</p></main>;
  if (!session) return <main className="shell localAccessDenied"><Crosshair size={32} /><p className="eyebrow">ADMIN ACCESS REQUIRED</p><h1>NO ACTIVE ADMIN SESSION.</h1><p className="lede">Sign in using the local admin demo button to open this workspace.</p><Link className="primaryButton" href="/login">GO TO DEMO LOGIN</Link></main>;

  const pending = payments.filter((item) => item.status === 'PENDING');
  const visible = filter === 'ALL' ? payments : payments.filter((item) => item.status === filter);
  return (
    <main className="shell adminShell">
      <header className="topbar"><Link href="/" className="brand adminBrand"><Crosshair size={22} /><span>APEX<span className="ember">NOVA</span></span></Link><span className="status"><i className="pulse" /> LOCAL ADMIN / DEMO MODE</span><button className="secondaryButton adminSignOut" onClick={signOut}><LogOut size={14} /> SIGN OUT</button></header>
      <section className="adminWelcome"><div><p className="eyebrow">ADMINISTRATION / PAYMENT REVIEW</p><h1>COMMAND <span className="ember">CENTER.</span></h1><p className="lede">Signed in as {session.email}. Review simulated UPI payment requests and approve or reject them. No money moves and no bank/payment provider is contacted.</p></div><div className="adminSeal"><ShieldCheck size={40} /><span>SUPER ADMIN</span><small>LOCAL SESSION</small></div></section>
      <div className="adminStats">
        <article><span><CircleDollarSign size={15} /> PAYMENT REQUESTS</span><strong>{payments.length}</strong><small>All local demo requests</small></article>
        <article><span><Activity size={15} /> PENDING REVIEW</span><strong>{pending.length}</strong><small>Awaiting admin decision</small></article>
        <article><span><Check size={15} /> APPROVED DEMO</span><strong>{payments.filter((item) => item.status === 'APPROVED').length}</strong><small>Simulated only</small></article>
      </div>
      <section className="adminWorkspace">
        <div className="sectionIntro"><div><p>PAYMENTS / MANUAL VERIFICATION</p><h2>UPI requests</h2><span>Player-entered UPI reference numbers are not proof of payment. This is a portfolio workflow preview only.</span></div><div className="adminFilters">{['PENDING','APPROVED','REJECTED','ALL'].map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value}</button>)}</div></div>
        <div className="adminPaymentList">{visible.map((item) => <article className="panel adminPaymentCard" key={item.id}><div className="adminPaymentTop"><div className="paymentSymbol"><Wallet size={20} /></div><div className="paymentIdentity"><strong>{money(item.amount)} · {item.method}</strong><span>{item.playerEmail}</span><small>REQUEST {item.id} · {new Date(item.createdAt).toLocaleString()}</small></div><span className={'statusTag status-' + item.status.toLowerCase()}>{item.status}</span></div><div className="paymentMeta"><div><small>UPI REFERENCE</small><strong>{item.reference || 'Not provided'}</strong></div><div><small>PLAYER NOTE</small><strong>{item.note || '—'}</strong></div></div>{item.status === 'PENDING' ? <div className="paymentActions"><button className="approveButton" onClick={() => updatePayment(item.id, 'APPROVED')}><Check size={15} /> APPROVE DEMO</button><button className="rejectButton" onClick={() => updatePayment(item.id, 'REJECTED')}><X size={15} /> REJECT</button></div> : <p className="fieldNote">Reviewed {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : 'in local demo'} · {item.reviewedBy || 'Admin'}</p>}</article>)}{!visible.length && <div className="emptyPanel"><Wallet size={25} /><strong>No requests in this filter</strong><span>Submit a sample request from the player workspace to test manual review.</span><Link href="/player">OPEN PLAYER WORKSPACE</Link></div>}</div>
      </section>
      <section className="adminInfo"><ShieldCheck size={18} /><div><strong>Important demo boundary</strong><p>Approval changes only a browser-local status. It does not verify UPI transfers, credit a real wallet, issue a real payout, or provide secure authorization. A production version needs server-side roles, a database, provider signature/webhook verification, and an audit trail.</p></div></section>
      <footer><span>APEXNOVA / ADMIN CONSOLE</span><span><Users size={14} /> {session.displayName || 'Administrator'} · LOCAL STORAGE</span></footer>
    </main>
  );
}
