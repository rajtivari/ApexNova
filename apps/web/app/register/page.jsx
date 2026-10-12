'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Crosshair, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://apexnova-api.onrender.com').replace(/\/$/, '');

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fairPlay, setFairPlay] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (password.length < 12) return setError('Use a password with at least 12 characters.');
    if (password !== confirmPassword) return setError('Your passwords do not match.');
    if (!fairPlay) return setError('Accept the fair-play pledge to create your account.');

    setBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim(), email: email.trim().toLowerCase(), password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not create your account.');
      router.replace('/login?registered=1');
    } catch (err) {
      setError(err instanceof TypeError
        ? 'Cannot reach the account service. Please try again when the service is available.'
        : (err.message || 'Registration failed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell authShell">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => router.push('/')} aria-label="APEX NOVA home"><Crosshair size={24} /><span>APEX<span className="ember">NOVA</span></span></button>
        <span className="status"><i className="pulse" /> PLAYER REGISTRATION</span>
        <button className="iconButton" onClick={() => router.push('/login')} aria-label="Back to sign in">×</button>
      </header>
      <section className="authLayout">
        <div className="authIntro">
          <p className="eyebrow">YOUR RUN STARTS HERE</p>
          <h1>CLAIM YOUR<br /><span className="ember">PLACE.</span></h1>
          <p className="lede">Create your player account and get ready to compete. Keep your account credentials private.</p>
          <div className="authSignals">
            <div><ShieldCheck size={17} /> PLAYER ACCOUNT BY DEFAULT</div>
            <div><Crosshair size={17} /> COMPETITIVE PROFILE</div>
          </div>
        </div>
        <section className="authCard">
          <div className="authStatus">● NEW PLAYER ACCOUNT</div>
          <h2>JOIN THE ARENA</h2>
          <p className="formHint">All fields are required unless marked optional.</p>
          <form onSubmit={submit}>
            <label>PLAYER NAME
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={40} autoComplete="name" placeholder="Your display name" required />
            </label>
            <label>EMAIL ADDRESS
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" placeholder="you@example.com" required />
            </label>
            <label>PASSWORD <small>(12+ CHARACTERS)</small>
              <span className="passwordField">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={128} autoComplete="new-password" placeholder="Create a strong password" required />
                <button type="button" className="passwordToggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </span>
            </label>
            <label>CONFIRM PASSWORD
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={12} maxLength={128} autoComplete="new-password" placeholder="Enter password again" required />
            </label>
            <label className="fairPlayCheck">
              <input type="checkbox" checked={fairPlay} onChange={(event) => setFairPlay(event.target.checked)} />
              <span>I agree to play fairly, follow tournament rules, and not exploit or manipulate matches.</span>
            </label>
            {error && <div className="authError" role="alert">{error}</div>}
            <button type="submit" className="primaryButton authSubmit" disabled={busy}>{busy ? 'CREATING ACCOUNT…' : 'CREATE PLAYER ACCOUNT'} <ArrowRight size={17} /></button>
          </form>
          <p className="authFooter"><button type="button" onClick={() => router.push('/login')}><ArrowLeft size={14} /> Back to sign in</button></p>
          <p className="authLegal">18+ · Eligibility and competition terms apply. No real-money features are enabled by this registration flow.</p>
        </section>
      </section>
    </main>
  );
}
