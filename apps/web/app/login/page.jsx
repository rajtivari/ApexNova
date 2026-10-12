'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowRight, Crosshair, Eye, EyeOff, ShieldCheck, Trophy, UserRound, X } from 'lucide-react';

const API_BASE_URL = 'https://apexnova-api.onrender.com';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [account, setAccount] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch(API_BASE_URL + (mode === 'login' ? '/api/auth/login' : '/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(mode === 'login' ? { email, password } : { email, password, displayName }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not connect to ApexNova. Please try again.');
      if (!result.accessToken || !result.user) throw new Error('The API response was incomplete. Please try again.');
      window.localStorage.setItem('apexnova-access-token', result.accessToken);
      window.localStorage.setItem('apexnova-user', JSON.stringify(result.user));
      setAccount(result.user);
      setSuccess(mode === 'login' ? 'Signed in successfully.' : 'Player account created successfully.');
    } catch (err) {
      setError(err.message || 'Request failed. Check your connection and try again.');
    } finally { setBusy(false); }
  }

  function signOut() {
    window.localStorage.removeItem('apexnova-access-token');
    window.localStorage.removeItem('apexnova-user');
    setAccount(null); setPassword(''); setSuccess('Signed out.');
  }

  return (
    <main className="shell authShell">
      <header className="topbar">
        <div className="brand"><Crosshair size={22} /><span>APEX<span className="ember">NOVA</span></span></div>
        <span className="status"><i className="pulse" /> ACCOUNT ACCESS / API AUTH</span>
        <button className="iconButton" onClick={() => router.push('/')} aria-label="Back to public board"><X size={18} /></button>
      </header>

      <section className="authLayout">
        <div className="authIntro">
          <p className="eyebrow">APEXNOVA / PLAYER NETWORK</p>
          <h1>YOUR NEXT<br /><span className="ember">VICTORY</span><br />STARTS HERE.</h1>
          <p className="lede">Sign in to your account or create a player account to begin. Admin and staff privileges are assigned securely, never through public registration.</p>
          <div className="authSignals">
            <div><ShieldCheck size={17} /> ROLE-BASED API ACCESS</div>
            <div><Trophy size={17} /> TOURNAMENT NETWORK</div>
            <div><Activity size={17} /> SECURE SESSION TOKEN</div>
          </div>
        </div>

        <section className="authCard">
          {!account ? <>
            <div className="authStatus">● API AUTHENTICATION · {mode === 'login' ? 'SIGN IN' : 'PLAYER REGISTRATION'}</div>
            <h2>{mode === 'login' ? 'ACCESS CONSOLE' : 'JOIN THE NETWORK'}</h2>
            <p className="formHint">{mode === 'login' ? 'Enter your account credentials to continue.' : 'Public registration always creates a PLAYER account. Staff roles cannot be self-selected.'}</p>
            <div className="authModeSwitch">
              <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>SIGN IN</button>
              <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>CREATE PLAYER</button>
            </div>
            <form onSubmit={submit}>
              {mode === 'register' && <label>DISPLAY NAME<input autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} minLength={2} maxLength={40} placeholder="Your gamer name" required /></label>}
              <label>EMAIL ADDRESS<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} placeholder="player@example.com" required /></label>
              <label>PASSWORD<span className="passwordField"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} minLength={mode === 'register' ? 12 : 1} maxLength={128} placeholder={mode === 'register' ? 'At least 12 characters' : 'Enter password'} required /><button type="button" className="passwordToggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
              {error && <p className="authMessage errorMessage" role="alert">{error}</p>}
              {success && <p className="authMessage successMessage" role="status">{success}</p>}
              <button className="primaryButton" type="submit" disabled={busy}>{busy ? 'PLEASE WAIT…' : mode === 'login' ? 'SIGN IN SECURELY' : 'CREATE PLAYER ACCOUNT'} <ArrowRight size={16} /></button>
            </form>
            <p className="fieldNote">Demo environment: do not reuse an important password. Payment and withdrawal actions are not enabled by this login page.</p>
          </> : <>
            <div className="authStatus">● AUTHENTICATED ACCOUNT</div>
            <div className="signedInIcon"><UserRound size={28} /></div>
            <h2>ACCESS GRANTED</h2>
            <p className="formHint">The API accepted your credentials. This is your verified account identity.</p>
            <div className="accountDetails"><span>DISPLAY NAME</span><strong>{account.profile?.displayName || 'ApexNova user'}</strong><span>EMAIL</span><strong>{account.email}</strong><span>SERVER ROLE</span><strong className="roleValue">{account.role}</strong><span>ACCOUNT ID</span><small>{account.id}</small></div>
            <p className="fieldNote warning">The dashboard and role-specific workflows are still being connected. Your server role is shown for verification; no admin permissions are granted by this screen.</p>
            <button className="primaryButton" onClick={() => router.push('/')}>OPEN PUBLIC BOARD <ArrowRight size={16} /></button>
            <button className="secondaryButton fullButton" onClick={signOut}>SIGN OUT</button>
          </>}
        </section>
      </section>
      <footer><span>APEXNOVA / ACCOUNT GATE</span><span><UserRound size={14} /> PUBLIC SIGN-UP = PLAYER ONLY</span></footer>
    </main>
  );
}
