'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, CalendarDays, CheckCircle2, Crosshair, LogOut, Plus, RefreshCw, ShieldCheck, Swords, Trophy, Users } from 'lucide-react';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://apexnova-api.onrender.com').replace(/\/$/, '');
const SESSION_KEY = 'apexnova-local-session-v1';

async function api(path, token, options = {}) {
  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: 'Bearer ' + token,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
}
const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN');
const nextStatus = { DRAFT: 'PUBLISHED', PUBLISHED: 'REGISTRATION_OPEN', REGISTRATION_OPEN: 'REGISTRATION_CLOSED', REGISTRATION_CLOSED: 'LIVE', LIVE: 'COMPLETED' };
const statusTone = (status) => status === 'LIVE' || status === 'REGISTRATION_OPEN' ? 'adminStatusLive' : status === 'COMPLETED' ? 'adminStatusDone' : status === 'CANCELLED' ? 'adminStatusDanger' : '';

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [staffForm, setStaffForm] = useState({ displayName: '', email: '', password: '', role: 'WORKER' });
  const [matchForm, setMatchForm] = useState({ tournamentId: '', round: 'Round 1', scheduledAt: '', roomId: '', roomPassword: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', game: 'FREE_FIRE', format: 'BATTLE_ROYALE', entryFee: '0', prizePool: '5000', startsAt: '', registrationClosesAt: '' });

  const load = useCallback(async (current) => {
    if (!current?.accessToken || current.role !== 'SUPER_ADMIN') { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [events, roster, games] = await Promise.all([
        api('/api/tournaments', current.accessToken),
        api('/api/teams', current.accessToken),
        api('/api/matches', current.accessToken),
      ]);
      setTournaments(Array.isArray(events) ? events : []);
      setTeams(Array.isArray(roster) ? roster : []);
      setMatches(Array.isArray(games) ? games : []);
      const registrationGroups = await Promise.all((Array.isArray(events) ? events : []).map(async (event) => {
        try {
          const rows = await api('/api/tournaments/' + event.id + '/registrations', current.accessToken);
          return (Array.isArray(rows) ? rows : []).map((row) => ({ ...row, tournamentName: event.name, tournamentId: event.id }));
        } catch { return []; }
      }));
      setRegistrations(registrationGroups.flat());
    } catch (err) { setError(err.message || 'Unable to load admin data.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    try {
      const current = JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null');
      if (current?.accessToken && current.role === 'SUPER_ADMIN') { setSession(current); load(current); }
      else setLoading(false);
    } catch { setLoading(false); }
  }, [load]);

  async function createTournament(event) {
    event.preventDefault(); setError(''); setMessage('');
    if (!form.name.trim() || !form.startsAt || !form.registrationClosesAt) return setError('Complete the name, start time, and registration deadline.');
    const startsAt = new Date(form.startsAt);
    const registrationClosesAt = new Date(form.registrationClosesAt);
    if (registrationClosesAt >= startsAt) return setError('Registration must close before the tournament starts.');
    if (startsAt <= new Date()) return setError('Choose a future tournament start time.');
    setBusy(true);
    try {
      const created = await api('/api/tournaments', session.accessToken, { method: 'POST', body: JSON.stringify({ name: form.name.trim(), game: form.game, format: form.format, entryFee: Number(form.entryFee), prizePool: Number(form.prizePool), startsAt: startsAt.toISOString(), registrationClosesAt: registrationClosesAt.toISOString() }) });
      setMessage('Tournament created as DRAFT. Publish it, then open registration when ready.');
      setForm({ name: '', game: 'FREE_FIRE', format: 'BATTLE_ROYALE', entryFee: '0', prizePool: '5000', startsAt: '', registrationClosesAt: '' });
      await load(session);
    } catch (err) { setError(err.message || 'Could not create tournament.'); }
    finally { setBusy(false); }
  }

  async function advanceStatus(event) {
    const target = nextStatus[event.status];
    if (!target) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await api('/api/tournaments/' + event.id + '/status', session.accessToken, { method: 'PATCH', body: JSON.stringify({ status: target }) });
      setMessage(event.name + ' moved to ' + target.replaceAll('_', ' ') + '.');
      await load(session);
    } catch (err) { setError(err.message || 'Status update failed.'); }
    finally { setBusy(false); }
  }

  async function createMatch(event) {
    event.preventDefault(); setError(''); setMessage('');
    if (!matchForm.tournamentId || !matchForm.scheduledAt || !matchForm.round.trim()) return setError('Choose a tournament, round, and schedule time.');
    setBusy(true);
    try {
      await api('/api/matches', session.accessToken, { method: 'POST', body: JSON.stringify({
        tournamentId: matchForm.tournamentId, round: matchForm.round.trim(),
        scheduledAt: new Date(matchForm.scheduledAt).toISOString(),
        ...(matchForm.roomId.trim() ? { roomId: matchForm.roomId.trim() } : {}),
        ...(matchForm.roomPassword ? { roomPassword: matchForm.roomPassword } : {}),
      }) });
      setMessage('Match scheduled. Room details remain protected until the tournament is live.');
      setMatchForm({ tournamentId: '', round: 'Round 1', scheduledAt: '', roomId: '', roomPassword: '' });
      await load(session);
    } catch (err) { setError(err.message || 'Could not schedule match.'); }
    finally { setBusy(false); }
  }

  async function reviewRegistration(row, status) {
    setBusy(true); setError(''); setMessage('');
    try {
      await api('/api/tournaments/' + row.tournamentId + '/registrations/' + row.id, session.accessToken, { method: 'PATCH', body: JSON.stringify({ status }) });
      setMessage('Registration ' + status.toLowerCase() + ' for ' + row.team?.name + '.');
      await load(session);
    } catch (err) { setError(err.message || 'Could not review registration.'); }
    finally { setBusy(false); }
  }

  async function reviewResult(result, status) {
    setBusy(true); setError(''); setMessage('');
    try {
      await api('/api/matches/results/' + result.id, session.accessToken, { method: 'PATCH', body: JSON.stringify({ status }) });
      setMessage('Match result ' + status.toLowerCase() + '. Standings were recalculated by the server.');
      await load(session);
    } catch (err) { setError(err.message || 'Could not review result.'); }
    finally { setBusy(false); }
  }

  async function createStaff(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await api('/api/auth/staff', session.accessToken, { method: 'POST', body: JSON.stringify({
        displayName: staffForm.displayName.trim(), email: staffForm.email.trim().toLowerCase(),
        password: staffForm.password, role: staffForm.role,
      }) });
      setMessage('Staff account created. Share credentials securely with the assigned person.');
      setStaffForm({ displayName: '', email: '', password: '', role: 'WORKER' });
    } catch (err) { setError(err.message || 'Could not create staff account.'); }
    finally { setBusy(false); }
  }

  function signOut() {
    window.localStorage.removeItem(SESSION_KEY);
    window.location.replace('/ApexNova/login/');
  }

  if (loading && !session) return <main className="shell"><p className="eyebrow">VERIFYING ADMIN ACCESS…</p></main>;
  if (!session || session.role !== 'SUPER_ADMIN') return <main className="shell localAccessDenied"><Crosshair size={32}/><p className="eyebrow">RESTRICTED OPERATIONS</p><h1>ADMIN ACCESS REQUIRED.</h1><p className="lede">This workspace requires a server-issued super-admin session. Sign in with an authorized account.</p><Link className="primaryButton" href="/login">GO TO SIGN IN <ArrowRight size={15}/></Link></main>;

  const live = tournaments.filter((item) => item.status === 'LIVE').length;
  const open = tournaments.filter((item) => item.status === 'REGISTRATION_OPEN').length;
  const upcoming = tournaments.filter((item) => !['COMPLETED', 'CANCELLED'].includes(item.status)).length;

  return (
    <main className="shell playerDashboard adminDashboard">
      <header className="topbar"><Link href="/" className="brand"><Crosshair size={24}/><span>APEX<span className="ember">NOVA</span></span></Link><span className="status"><i className="pulse"/> RESTRICTED OPERATIONS</span><button className="secondaryButton" onClick={signOut}><LogOut size={15}/> SIGN OUT</button></header>
      <section className="playerWelcome"><div><p className="eyebrow">APEX NOVA / ADMIN CONTROL</p><h1>RUN THE <span className="ember">ARENA.</span></h1><p className="lede">Manage published tournaments and monitor operational data. Sensitive actions remain enforced by the API.</p></div><button className="secondaryButton" onClick={() => load(session)} disabled={busy || loading}><RefreshCw size={15}/> REFRESH</button></section>
      {error && <div className="playerNotice playerNoticeError" role="alert">{error}</div>}
      {message && <div className="playerNotice playerNoticeSuccess" role="status"><CheckCircle2 size={17}/>{message}</div>}
      <section className="playerMetricGrid">
        <article className="playerMetric"><span><Trophy size={18}/></span><small>TOTAL TOURNAMENTS</small><strong>{tournaments.length.toString().padStart(2, '0')}</strong><p>Stored in the API database</p></article>
        <article className="playerMetric"><span><Activity size={18}/></span><small>LIVE MATCH EVENTS</small><strong>{live.toString().padStart(2, '0')}</strong><p>Currently marked live</p></article>
        <article className="playerMetric"><span><CalendarDays size={18}/></span><small>OPEN REGISTRATION</small><strong>{open.toString().padStart(2, '0')}</strong><p>Accepting team registration</p></article>
        <article className="playerMetric"><span><Users size={18}/></span><small>SQUADS</small><strong>{teams.length.toString().padStart(2, '0')}</strong><p>{matches.length} match records · {upcoming} active events</p></article>
      </section>

      <section className="playerPanel">
        <div className="playerPanelHeading"><div><p className="eyebrow">TOURNAMENT OPERATIONS</p><h2>CREATE <span className="ember">EVENT.</span></h2></div><Plus size={22}/></div>
        <form className="adminTournamentForm" onSubmit={createTournament}>
          <label className="adminField adminFieldWide">TOURNAMENT NAME<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} minLength={2} maxLength={100} placeholder="e.g. NOVA NIGHT CLASH" required/></label>
          <label className="adminField">GAME<select value={form.game} onChange={(e) => setForm({ ...form, game: e.target.value })}><option value="FREE_FIRE">FREE FIRE</option><option value="BGMI">BGMI</option></select></label>
          <label className="adminField">FORMAT<select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}><option value="BATTLE_ROYALE">BATTLE ROYALE</option><option value="ROUND_ROBIN">ROUND ROBIN</option><option value="SINGLE_ELIMINATION">SINGLE ELIMINATION</option></select></label>
          <label className="adminField">ENTRY FEE (₹)<input type="number" min="0" max="1000000" step="1" value={form.entryFee} onChange={(e) => setForm({ ...form, entryFee: e.target.value })} required/></label>
          <label className="adminField">PRIZE POOL (₹)<input type="number" min="0" max="100000000" step="1" value={form.prizePool} onChange={(e) => setForm({ ...form, prizePool: e.target.value })} required/></label>
          <label className="adminField">MATCH START<input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} required/></label>
          <label className="adminField">REGISTRATION CLOSES<input type="datetime-local" value={form.registrationClosesAt} onChange={(e) => setForm({ ...form, registrationClosesAt: e.target.value })} required/></label>
          <div className="adminFormNote"><ShieldCheck size={16}/> New events are saved as DRAFT. Paid entry is not activated by this form.</div>
          <button className="primaryButton adminFormSubmit" type="submit" disabled={busy}>{busy ? 'SAVING EVENT…' : 'CREATE DRAFT TOURNAMENT'} <ArrowRight size={16}/></button>
        </form>
      </section>

      <section className="playerPanel">
        <div className="playerPanelHeading"><div><p className="eyebrow">DATABASE RECORDS</p><h2>TOURNAMENT <span className="ember">CONTROL.</span></h2></div><Swords size={22}/></div>
        {loading ? <div className="playerEmpty">LOADING DATABASE RECORDS…</div> : tournaments.length === 0 ? <div className="playerEmpty">NO TOURNAMENTS YET. CREATE YOUR FIRST DRAFT ABOVE.</div> : <div className="adminTournamentList">{tournaments.map((event) => {
          const next = nextStatus[event.status];
          return <article className="adminTournamentRow" key={event.id}>
            <div className="adminTournamentIdentity"><span className="adminTournamentGlyph"><Trophy size={20}/></span><div><div className="playerEventMeta"><span>{event.game === 'FREE_FIRE' ? 'FREE FIRE' : event.game}</span><span>{String(event.format).replaceAll('_', ' ')}</span></div><h3>{event.name}</h3><p>{new Date(event.startsAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · Entry {money(event.entryFee)} · Prize pool {money(event.prizePool)}</p><small className="adminId">ID {event.id}</small></div></div>
            <div className="adminTournamentActions"><span className={'adminStatusPill ' + statusTone(event.status)}>{String(event.status).replaceAll('_', ' ')}</span>{next && <button className="secondaryButton" onClick={() => advanceStatus(event)} disabled={busy}>{next.replaceAll('_', ' ')} <ArrowRight size={13}/></button>}</div>
          </article>;
        })}</div>}
        <p className="playerPanelFoot"><ShieldCheck size={15}/> Every status transition is checked by the server and written to the audit log.</p>
      </section>

      <section className="playerPanel">
        <div className="playerPanelHeading"><div><p className="eyebrow">SQUAD APPROVAL QUEUE</p><h2>TEAM <span className="ember">REGISTRATIONS.</span></h2></div><Users size={22}/></div>
        {registrations.filter((row) => row.status === 'PENDING').length === 0 ? <div className="playerEmpty">NO PENDING REGISTRATIONS.</div> : <div className="adminTournamentList">{registrations.filter((row) => row.status === 'PENDING').map((row) => <article className="adminTournamentRow" key={row.id}><div className="adminTournamentIdentity"><span className="adminTournamentGlyph"><Users size={20}/></span><div><h3>{row.team?.name || 'Unknown squad'}</h3><p>{row.tournamentName} · Captain: {row.team?.captain?.profile?.displayName || row.team?.captain?.email || 'Unknown'}</p><small className="adminId">Registration {row.id}</small></div></div><div className="adminTournamentActions"><button className="secondaryButton" disabled={busy} onClick={() => reviewRegistration(row, 'APPROVED')}>APPROVE</button><button className="secondaryButton" disabled={busy} onClick={() => reviewRegistration(row, 'REJECTED')}>REJECT</button></div></article>)}</div>}
      </section>

      <section className="playerPanel">
        <div className="playerPanelHeading"><div><p className="eyebrow">MATCH OPERATIONS</p><h2>SCHEDULE <span className="ember">MATCH.</span></h2></div><CalendarDays size={22}/></div>
        <form className="adminTournamentForm" onSubmit={createMatch}>
          <label className="adminField adminFieldWide">TOURNAMENT<select value={matchForm.tournamentId} onChange={(e) => setMatchForm({ ...matchForm, tournamentId: e.target.value })} required><option value="">Choose tournament</option>{tournaments.filter((event) => !['COMPLETED', 'CANCELLED'].includes(event.status)).map((event) => <option key={event.id} value={event.id}>{event.name} · {event.status}</option>)}</select></label>
          <label className="adminField">ROUND / MATCH<input value={matchForm.round} onChange={(e) => setMatchForm({ ...matchForm, round: e.target.value })} maxLength={80} required /></label>
          <label className="adminField">SCHEDULED AT<input type="datetime-local" value={matchForm.scheduledAt} onChange={(e) => setMatchForm({ ...matchForm, scheduledAt: e.target.value })} required /></label>
          <label className="adminField">ROOM ID (OPTIONAL)<input value={matchForm.roomId} onChange={(e) => setMatchForm({ ...matchForm, roomId: e.target.value })} maxLength={120} /></label>
          <label className="adminField">ROOM PASSWORD (OPTIONAL)<input value={matchForm.roomPassword} onChange={(e) => setMatchForm({ ...matchForm, roomPassword: e.target.value })} maxLength={120} /></label>
          <div className="adminFormNote"><ShieldCheck size={16}/> Room credentials are returned only to approved teams while the tournament is live.</div>
          <button className="primaryButton adminFormSubmit" type="submit" disabled={busy || !tournaments.length}>{busy ? 'SCHEDULING…' : 'SCHEDULE MATCH'} <ArrowRight size={16}/></button>
        </form>
        <div className="adminTournamentList">{matches.map((match) => <article className="adminTournamentRow" key={match.id}><div className="adminTournamentIdentity"><span className="adminTournamentGlyph"><Swords size={20}/></span><div><h3>{match.round}</h3><p>{tournaments.find((event) => event.id === match.tournamentId)?.name || 'Tournament'} · {new Date(match.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>{(match.results || []).map((result) => <small key={result.id} className="adminId">Result: {result.status} · Placement {result.placement} · Kills {result.kills} · Points {result.totalPoints}</small>)}</div></div></article>)}</div>
      </section>

      <section className="playerPanel">
        <div className="playerPanelHeading"><div><p className="eyebrow">RESULT MODERATION</p><h2>VERIFY <span className="ember">RESULTS.</span></h2></div><ShieldCheck size={22}/></div>
        {matches.flatMap((match) => (match.results || []).filter((result) => result.status === 'PENDING').map((result) => ({ ...result, round: match.round }))).length === 0 ? <div className="playerEmpty">NO RESULTS WAITING FOR REVIEW.</div> : <div className="adminTournamentList">{matches.flatMap((match) => (match.results || []).filter((result) => result.status === 'PENDING').map((result) => ({ ...result, round: match.round }))).map((result) => <article className="adminTournamentRow" key={result.id}><div className="adminTournamentIdentity"><span className="adminTournamentGlyph"><Trophy size={20}/></span><div><h3>{result.round} · {result.placement}{result.placement === 1 ? 'st' : result.placement === 2 ? 'nd' : result.placement === 3 ? 'rd' : 'th'} place</h3><p>{result.kills} kills · {result.totalPoints} total points</p><small className="adminId">Result {result.id}</small></div></div><div className="adminTournamentActions"><button className="secondaryButton" disabled={busy} onClick={() => reviewResult(result, 'APPROVED')}>VERIFY</button><button className="secondaryButton" disabled={busy} onClick={() => reviewResult(result, 'REJECTED')}>REJECT</button></div></article>)}</div>}
      </section>

      <section className="playerPanel">
        <div className="playerPanelHeading"><div><p className="eyebrow">STAFF ACCESS</p><h2>CREATE <span className="ember">STAFF ACCOUNT.</span></h2></div><ShieldCheck size={22}/></div>
        <form className="adminTournamentForm" onSubmit={createStaff}>
          <label className="adminField">DISPLAY NAME<input value={staffForm.displayName} onChange={(e) => setStaffForm({ ...staffForm, displayName: e.target.value })} minLength={2} maxLength={40} required /></label>
          <label className="adminField">EMAIL<input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} maxLength={254} required /></label>
          <label className="adminField">TEMPORARY PASSWORD<input type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} minLength={12} maxLength={128} autoComplete="new-password" required /></label>
          <label className="adminField">ROLE<select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}><option value="WORKER">TOURNAMENT WORKER</option><option value="CAPTAIN">CAPTAIN</option></select></label>
          <div className="adminFormNote"><ShieldCheck size={16}/> Only the authenticated super-admin can create staff accounts. This does not grant super-admin privileges.</div>
          <button className="primaryButton adminFormSubmit" type="submit" disabled={busy}>{busy ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT'} <ArrowRight size={16}/></button>
        </form>
      </section>
      <footer className="playerFooter">APEX NOVA / ADMIN <span>{session.email} · Financial operations are intentionally disabled until verified payment and payout providers are configured.</span></footer>
    </main>
  );
}
