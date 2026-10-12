'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Crosshair, Eye, EyeOff, ShieldCheck, Trophy, Zap } from 'lucide-react';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://apexnova-api.onrender.com').replace(/\/$/, '');
const SESSION_KEY = 'apexnova-local-session-v1';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [serviceState, setServiceState] = useState('checking');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('registered') === '1') setNotice('Account created successfully. Sign in with your new email and password.');
    let active = true;
    fetch(`${API_BASE_URL}/api/health`, { headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Service unavailable')))
      .then((data) => { if (active) setServiceState(data.status === 'ok' ? 'online' : 'degraded'); })
      .catch(() => { if (active) setServiceState('offline'); });
    return () => { active = false; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || (response.status >= 500
          ? 'Sign-in service is unavailable. Please try again shortly.'
          : 'Email or password is incorrect.'));
      }
      if (!payload.accessToken || !payload.user?.role) {
        throw new Error('The sign-in service returned an incomplete session. Please contact support.');
      }
      const session = {
        email: payload.user.email,
        displayName: payload.user.profile?.displayName || payload.user.email,
        role: payload.user.role,
        accessToken: payload.accessToken,
        userId: payload.user.id,
        signedInAt: new Date().toISOString(),
      };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      // Use the full GitHub Pages base path explicitly so static hosting cannot drop it.
      window.location.assign(session.role === 'SUPER_ADMIN' ? '/ApexNova/admin/' : '/ApexNova/player/');
    } catch (err) {
      setError(err instanceof TypeError
        ? 'Cannot reach the sign-in service. Check your connection or try again later.'
        : (err.message || 'Unable to sign in right now.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell authShell">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => window.location.assign('/ApexNova/')} aria-label="APEX NOVA home">
          <Crosshair size={24} /><span>APEX<span className="ember">NOVA</span></span>
        </button>
        <span className="status"><i className="pulse" /> ARENA ACCESS</span>
        <button className="iconButton" onClick={() => router.push('/')} aria-label="Back to home">×</button>
      </header>

      <section className="authLayout">
        <div className="authIntro">
          <p className="eyebrow">APEX NOVA / PLAYER NETWORK</p>
          <h1>ENTER THE<br /><span className="ember">ARENA.</span></h1>
          <p className="lede">One account. Every match. Your path to the top starts here.</p>
          <div className="authSignals">
            <div><ShieldCheck size={17} /> SERVER-VERIFIED ACCESS</div>
            <div><Trophy size={17} /> COMPETITIVE TOURNAMENTS</div>
            <div><Zap size={17} /> LIVE ARENA UPDATES</div>
          </div>
        </div>

        <section className="authCard">
          <div className="authStatus"><span className={'authServiceDot ' + serviceState} /> {serviceState === 'checking' ? 'CHECKING SIGN-IN SERVICE…' : serviceState === 'online' ? 'SIGN-IN SERVICE ONLINE' : serviceState === 'degraded' ? 'SIGN-IN SERVICE DEGRADED' : 'SIGN-IN SERVICE UNREACHABLE'}</div>
          <h2>WELCOME BACK</h2>
          <p className="formHint">Sign in to continue to APEX NOVA.</p>
          {notice && <div className="authSuccess" role="status">{notice}</div>}
          {serviceState === 'offline' && <div className="authError" role="status">The API could not be reached. The sign-in form is available, but login cannot complete until the backend is online.</div>}

          <form onSubmit={submit}>
            <label>EMAIL ADDRESS
              <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" maxLength={254} required />
            </label>
            <label>PASSWORD
              <span className="passwordField">
                <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} maxLength={128} placeholder="Enter your password" required />
                <button type="button" className="passwordToggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            {error && <div className="authError" role="alert">{error}</div>}
            <button type="submit" className="primaryButton authSubmit" disabled={busy}>
              {busy ? 'VERIFYING ACCESS…' : 'SIGN IN'} <ArrowRight size={17} />
            </button>
          </form>

          <p className="authFooter">New to the arena? <button type="button" onClick={() => window.location.assign('/ApexNova/register/')}>Create account</button></p>
          <p className="authLegal">18+ · Skill-based competition · Terms and eligibility apply</p>
        </section>
      </section>
    </main>
  );
}
