'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowDownToLine, ArrowRight, CircleDollarSign, Crosshair, LogOut, Plus, ShieldCheck, Wallet } from 'lucide-react';

const SESSION_KEY = 'apexnova-local-session-v1';
const PAYMENTS_KEY = 'apexnova-local-payments-v1';
const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN');

export default function PlayerPage() {
  const [session, setSession] = useState(null);
  const [payments, setPayments] = useState([]);
  const [amount, setAmount] = useState('500');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const current = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (current?.role === 'PLAYER') setSession(current);
      setPayments(JSON.parse(localStorage.getItem(PAYMENTS_KEY) || '[]'));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments)); }, [payments, ready]);

  function submit(event) {
    event.preventDefault(); setError(''); setMessage('');
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1 || value > 100000) return setError('Enter an amount between ₹1 and ₹1,00,000.');
    const request = { id: 'PAY-' + Math.random().toString(36).slice(2, 8).toUpperCase(), amount: value, method: 'UPI MANUAL', reference: reference.trim(), note: note.trim(), playerEmail: session.email, status: 'PENDING', createdAt: new Date().toISOString() };
    const next = [request, ...payments];
    setPayments(next);
    setReference(''); setNote('');
    setMessage('Demo request created and marked PENDING. An admin can review it in this same browser.');
  }
  function signOut() { localStorage.removeItem(SESSION_KEY); window.location.href = '/ApexNova/login'; }

  if (!ready) return <main className="shell"><p className="eyebrow">LOADING PLAYER WORKSPACE…</p></main>;
  if (!session) return <main className="shell localAccessDenied"><Crosshair size={32} /><p className="eyebrow">PLAYER SESSION REQUIRED</p><h1>SIGN IN TO CONTINUE.</h1><p className="lede">Use the player quick-fill button on the local demo login page.</p><Link className="primaryButton" href="/login">GO TO DEMO LOGIN</Link></main>;

  const mine = payments.filter((item) => item.playerEmail === session.email);
  const approved = mine.filter((item) => item.status === 'APPROVED').reduce((sum, item) => sum + item.amount, 0);
  return (
    <main className="shell playerShell">
      <header className="topbar"><Link href="/" className="brand adminBrand"><Crosshair size={22} /><span>APEX<span className="ember">NOVA</span></span></Link><span className="status"><i className="pulse" /> PLAYER / LOCAL DEMO</span><button className="secondaryButton adminSignOut" onClick={signOut}><LogOut size={14} /> SIGN OUT</button></header>
      <section className="adminWelcome"><div><p className="eyebrow">PLAYER NETWORK / WALLET</p><h1>PLAYER <span className="ember">HUB.</span></h1><p className="lede">Welcome, {session.displayName || 'Player'}. Submit a simulated UPI top-up request and watch it move through manual admin review.</p></div><div className="adminSeal"><Wallet size={40} /><span>PLAYER</span><small>LOCAL SESSION</small></div></section>
      <div className="adminStats playerStats"><article><span><CircleDollarSign size={15} /> REQUESTS</span><strong>{mine.length}</strong><small>Submitted by this demo player</small></article><article><span><Activity size={15} /> PENDING</span><strong>{mine.filter((item) => item.status === 'PENDING').length}</strong><small>Waiting for review</small></article><article><span><ShieldCheck size={15} /> APPROVED DEMO</span><strong>{money(approved)}</strong><small>Not real wallet funds</small></article></div>
      <div className="playerGrid">
        <form className="panel playerPaymentForm" onSubmit={submit}><p className="eyebrow">WALLET / MANUAL TOP-UP</p><h2>REQUEST A UPI TOP-UP</h2><p className="formHint">In a real version, this would show a verified merchant UPI QR and wait for admin proof review. This demo does not initiate or verify payments.</p><label>AMOUNT (₹)<input type="number" min="1" max="100000" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label><label>DEMO UPI REFERENCE<input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={80} placeholder="Optional sample reference (not verified)" /></label><label>NOTE FOR ADMIN<input value={note} onChange={(event) => setNote(event.target.value)} maxLength={160} placeholder="Optional note" /></label>{error && <p className="authMessage errorMessage" role="alert">{error}</p>}{message && <p className="authMessage successMessage" role="status">{message}</p>}<button className="primaryButton" type="submit"><Plus size={16} /> SUBMIT DEMO REQUEST</button><p className="fieldNote warning">Do not send money or enter real bank credentials. An entered reference is not proof of payment.</p></form>
        <section className="playerHistory"><div className="sectionHeading"><div><p className="eyebrow">WALLET LEDGER</p><h2>MY PAYMENT REQUESTS</h2></div><span className="mono">{mine.length} RECORDS</span></div>{mine.map((item) => <article className="panel playerRequest" key={item.id}><div className="playerRequestTop"><div><strong>{money(item.amount)}</strong><small>{item.id} · {new Date(item.createdAt).toLocaleString()}</small></div><span className={'statusTag status-' + item.status.toLowerCase()}>{item.status}</span></div><p>Method: {item.method}</p><small>Reference: {item.reference || 'Not provided'}</small>{item.reviewedAt && <p className="fieldNote">Reviewed {new Date(item.reviewedAt).toLocaleString()}.</p>}</article>)}{!mine.length && <div className="emptyPanel"><Wallet size={25} /><strong>No payment requests yet</strong><span>Submit a demo request to test the admin approval workflow.</span></div>}</section>
      </div>
      <div className="adminInfo"><ShieldCheck size={18} /><div><strong>Local-only payment simulation</strong><p>The request is stored in this browser's localStorage. Open the admin panel in the same browser to approve or reject it. No Razorpay integration, QR payment, UPI verification, or real wallet credit is active.</p><Link href="/admin">OPEN ADMIN REVIEW <ArrowRight size={14} /></Link></div></div>
      <footer><span>APEXNOVA / PLAYER WORKSPACE</span><span><Activity size={14} /> LOCAL STORAGE ONLY</span></footer>
    </main>
  );
}
