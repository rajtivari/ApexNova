'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowRight, Crosshair, Eye, EyeOff, ShieldCheck, Trophy, UserRound, Zap } from 'lucide-react';

const DEMO_ACCOUNTS = {
  admin: { email: 'tivariraj424@gmail.com', password: 'Admin@12345', displayName: 'ApexNova Admin', role: 'SUPER_ADMIN' },
  player: { email: 'player@apexnova.demo', password: 'Player@12345', displayName: 'Demo Player', role: 'PLAYER' },
};
const USERS_KEY = 'apexnova-local-users-v1';
const SESSION_KEY = 'apexnova-local-session-v1';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function fillDemo(type) {
    const account = DEMO_ACCOUNTS[type];
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  }

  function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const seeded = Object.values(DEMO_ACCOUNTS);
      let users = [];
      try { users = JSON.parse(window.localStorage.getItem(USERS_KEY) || '[]'); } catch {}
      const allUsers = [...seeded, ...users.filter((user) => !seeded.some((seed) => seed.email.toLowerCase() === user.email.toLowerCase()))];
      const user = allUsers.find((item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password);
      if (!user) {
        setError('Those demo credentials do not match. Use one of the quick-fill buttons below.');
        return;
      }
      const session = { email: user.email, displayName: user.displayName, role: user.role, signedInAt: new Date().toISOString() };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      router.push(user.role === 'SUPER_ADMIN' ? '/admin' : '/player');
    } catch {
      setError('Local browser storage is unavailable. Please enable it and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell authShell">
      <header className="topbar">
        <div className="brand"><Crosshair size={22} /><span>APEX<span className="ember">NOVA</span></span></div>
        <span className="status"><i className="pulse" /> LOCAL DEMO / NO API</span>
        <button className="iconButton" onClick={() => router.push('/')} aria-label="Back to public board">×</button>
      </header>
      <section className="authLayout">
        <div className="authIntro">
          <p className="eyebrow">APEXNOVA / LOCAL TEST ENVIRONMENT</p>
          <h1>ENTER THE<br /><span className="ember">ARENA.</span></h1>
          <p className="lede">Try both sides of the tournament platform. These demo accounts run entirely in this browser and do not call the API.</p>
          <div className="authSignals">
            <div><ShieldCheck size={17} /> ROLE-BASED DEMO ROUTING</div>
            <div><Trophy size={17} /> TOURNAMENT WORKSPACE</div>
            <div><Zap size={17} /> LOCAL STORAGE ONLY</div>
          </div>
        </div>
        <section className="authCard">
          <div className="authStatus">● LOCAL AUTHENTICATION · NO SERVER REQUESTS</div>
          <h2>ACCESS CONSOLE</h2>
          <p className="formHint">Choose a demo account to fill the credentials, then press sign in.</p>
          <div className="demoLoginButtons">
            <button type="button" className="demoRoleButton" onClick={() => fillDemo('admin')}><ShieldCheck size={18} /><span><strong>ADMIN LOGIN</strong><small>Fill administrator credentials</small></span><ArrowRight size={15} /></button>
            <button type="button" className="demoRoleButton" onClick={() => fillDemo('player')}><UserRound size={18} /><span><strong>PLAYER LOGIN</strong><small>Fill player credentials</small></span><ArrowRight size={15} /></button>
          </div>
          <form onSubmit={submit}>
            <label>EMAIL ADDRESS<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Choose admin or player above" required /></label>
            <label>PASSWORD<span className="passwordField"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} placeholder="Demo password" required /><button type="button" className="passwordToggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
            {error && <p className="authMessage errorMessage" role="alert">{error}</p>}
            <button className="primaryButton" type="submit" disabled={busy}>{busy ? 'OPENING WORKSPACE…' : 'SIGN IN TO DEMO'} <ArrowRight size={16} /></button>
          </form>
          <div className="demoCredentials">
            <p>ADMIN · <strong>tivariraj424@gmail.com</strong> / <code>Admin@12345</code></p>
            <p>PLAYER · <strong>player@apexnova.demo</strong> / <code>Player@12345</code></p>
          </div>
          <p className="fieldNote warning">Demo only: credentials and role checks are stored in browser code, not secure authentication. Do not use real passwords or real payment details. Payments here are simulations only.</p>
        </section>
      </section>
      <footer><span>APEXNOVA / LOCAL ACCOUNT GATE</span><span><Activity size={14} /> API DISCONNECTED BY DESIGN</span></footer>
    </main>
  );
}
