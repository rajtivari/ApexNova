'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, Bell, CalendarDays, CheckCircle2, CircleDollarSign, Crosshair, Gamepad2, LogOut, RefreshCw, ShieldCheck, Swords, Users, Wallet } from 'lucide-react';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://apexnova-api.onrender.com').replace(/\/$/, '');
const SESSION_KEY = 'apexnova-local-session-v1';
const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN');

async function api(path, token, options = {}) {
  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed. Please try again.');
  return payload;
}

export default function PlayerPage() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [matches, setMatches] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async (currentSession) => {
    if (!currentSession?.accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [me, events, roster, alerts, matchRows] = await Promise.all([
        api('/api/auth/me', currentSession.accessToken),
        api('/api/tournaments'),
        api('/api/teams', currentSession.accessToken),
        api('/api/notifications', currentSession.accessToken),
        api('/api/matches'),
      ]);
      setProfile(me.user);
      setTournaments(Array.isArray(events) ? events : []);
      setTeams(Array.isArray(roster) ? roster : []);
      setNotifications(Array.isArray(alerts) ? alerts : []);
      setMatches(Array.isArray(matchRows) ? matchRows : []);
    } catch (err) {
      setError(err.message || 'Could not load your player workspace.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const current = JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null');
      if (current?.accessToken && current?.role && current.role !== 'SUPER_ADMIN') {
        setSession(current);
        load(current);
      } else if (current?.accessToken && current.role === 'SUPER_ADMIN') {
        window.location.replace('/ApexNova/admin/');
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, [load]);

  async function createTeam(event) {
    event.preventDefault();
    if (!teamName.trim() || !session?.accessToken) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await api('/api/teams', session.accessToken, { method: 'POST', body: JSON.stringify({ name: teamName.trim() }) });
      setTeamName('');
      setMessage('Squad created. Invite your teammates by their registered email from your team workspace.');
      await load(session);
    } catch (err) {
      setError(err.message || 'Could not create squad.');
    } finally {
      setBusy(false);
    }
  }

  async function joinTournament(tournament) {
    if (!session?.accessToken) return;
    const team = teams.find((item) => item.captain?.id === profile?.id);
    if (!team) {
      setError('Create a squad first. Tournament registration is captain-led.');
      return;
    }
    setBusy(true); setError(''); setMessage('');
    try {
      await api('/api/tournaments/' + tournament.id + '/register', session.accessToken, {
        method: 'POST',
        body: JSON.stringify({ teamId: team.id }),
      });
      setMessage('Registration submitted. Check the tournament status for staff approval.');
      await load(session);
    } catch (err) {
      setError(err.message || 'Could not register this squad.');
    } finally {
      setBusy(false);
    }
  }

  async function addMember(event) {
    event.preventDefault();
    if (!myTeam || myTeam.captain?.id !== profile?.id || !memberEmail.trim()) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await api('/api/teams/' + myTeam.id + '/members', session.accessToken, { method: 'POST', body: JSON.stringify({ email: memberEmail.trim().toLowerCase() }) });
      setMemberEmail('');
      setMessage('Player added to your squad.');
      await load(session);
    } catch (err) { setError(err.message || 'Could not add player.'); }
    finally { setBusy(false); }
  }

  async function removeMember(userId) {
    if (!myTeam || !confirm('Remove this player from your squad?')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await api('/api/teams/' + myTeam.id + '/members/' + userId, session.accessToken, { method: 'DELETE' });
      setMessage('Player removed from your squad.');
      await load(session);
    } catch (err) { setError(err.message || 'Could not remove player.'); }
    finally { setBusy(false); }
  }

  async function markRead(item) {
    if (item.readAt) return;
    try {
      await api('/api/notifications/' + item.id + '/read', session.accessToken, { method: 'PATCH' });
      setNotifications((current) => current.map((row) => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row));
    } catch (err) { setError(err.message || 'Could not mark notification as read.'); }
  }

  function signOut() {
    window.localStorage.removeItem(SESSION_KEY);
    window.location.replace('/ApexNova/login/');
  }

  if (loading && !session) return <main className="shell"><p className="eyebrow">CONNECTING TO PLAYER NETWORK…</p></main>;
  if (!session) return <main className="shell localAccessDenied"><Crosshair size={32} /><p className="eyebrow">PLAYER ACCESS</p><h1>SIGN IN TO CONTINUE.</h1><p className="lede">Your player workspace uses the ApexNova API. Sign in to load your account, teams, and tournaments.</p><Link className="primaryButton" href="/login">SIGN IN <ArrowRight size={16}/></Link></main>;

  const myTeam = teams.find((item) => item.captain?.id === profile?.id || item.members?.some((member) => member.userId === profile?.id));
  const openEvents = tournaments.filter((item) => item.status === 'REGISTRATION_OPEN');
  const upcoming = tournaments.filter((item) => !['COMPLETED', 'CANCELLED'].includes(item.status));

  return (
    <main className="shell playerDashboard">
      <header className="topbar">
        <Link href="/" className="brand"><Crosshair size={24}/><span>APEX<span className="ember">NOVA</span></span></Link>
        <span className="status"><i className="pulse"/> PLAYER NETWORK / LIVE DATA</span>
        <button className="secondaryButton" onClick={signOut}><LogOut size={15}/> SIGN OUT</button>
      </header>

      <section className="playerWelcome">
        <div><p className="eyebrow">PLAYER HUB / {profile?.role || session.role}</p><h1>WELCOME TO THE <span className="ember">ARENA.</span></h1><p className="lede">Your account and tournament data are loaded from the ApexNova API.</p></div>
        <button className="secondaryButton" onClick={() => load(session)} disabled={busy || loading}><RefreshCw size={15}/> REFRESH DATA</button>
      </section>

      {error && <div className="playerNotice playerNoticeError" role="alert">{error}</div>}
      {message && <div className="playerNotice playerNoticeSuccess" role="status"><CheckCircle2 size={17}/>{message}</div>}

      <section className="playerMetricGrid">
        <article className="playerMetric"><span><ShieldCheck size={18}/></span><small>ACCOUNT</small><strong>{profile?.role || session.role}</strong><p>{profile?.email || session.email}</p></article>
        <article className="playerMetric"><span><Swords size={18}/></span><small>OPEN REGISTRATIONS</small><strong>{openEvents.length.toString().padStart(2, '0')}</strong><p>Events accepting squads</p></article>
        <article className="playerMetric"><span><Gamepad2 size={18}/></span><small>AVAILABLE EVENTS</small><strong>{upcoming.length.toString().padStart(2, '0')}</strong><p>Not completed or cancelled</p></article>
        <article className="playerMetric"><span><Bell size={18}/></span><small>NOTIFICATIONS</small><strong>{notifications.filter((item) => !item.readAt).length.toString().padStart(2, '0')}</strong><p>Unread updates</p></article>
      </section>

      <div className="playerColumns">
        <section className="playerPanel">
          <div className="playerPanelHeading"><div><p className="eyebrow">SQUAD OPERATIONS</p><h2>YOUR <span className="ember">SQUAD.</span></h2></div><Users size={22}/></div>
          {myTeam ? <><div className="playerTeamCard"><span className="playerTeamMark"><Users size={26}/></span><div><strong>{myTeam.name}</strong><p>{myTeam.captain?.profile?.displayName || myTeam.captain?.email || 'Squad captain'}</p><small>{(myTeam.members?.length || 0) + 1} / 4 PLAYERS · {myTeam.captain?.id === profile?.id ? 'YOU ARE CAPTAIN' : 'SQUAD MEMBER'}</small></div><span className="playerLiveTag">ACTIVE</span></div>{myTeam.captain?.id === profile?.id && <><form className="playerTeamForm" onSubmit={addMember}><label>ADD PLAYER BY REGISTERED EMAIL</label><input type="email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} placeholder="teammate@example.com" required/><button className="primaryButton" type="submit" disabled={busy || (myTeam.members?.length || 0) >= 3}>{busy ? 'UPDATING…' : 'ADD TEAMMATE'} <ArrowRight size={15}/></button></form>{(myTeam.members || []).map((member) => <div className="playerProfileLine" key={member.userId}><span>{member.user?.profile?.displayName || member.user?.email || 'TEAMMATE'}</span><strong>{member.user?.email}<button className="secondaryButton" type="button" onClick={() => removeMember(member.userId)} disabled={busy}>REMOVE</button></strong></div>)}</>}</> : <form className="playerTeamForm" onSubmit={createTeam}><label htmlFor="teamName">CREATE YOUR SQUAD</label><p>Build a team before registering for captain-led tournaments.</p><input id="teamName" value={teamName} onChange={(event) => setTeamName(event.target.value)} minLength={2} maxLength={40} placeholder="Squad name" required/><button className="primaryButton" type="submit" disabled={busy}>{busy ? 'CREATING…' : 'CREATE SQUAD'} <ArrowRight size={15}/></button></form>}
          <div className="playerPanelFoot"><ShieldCheck size={15}/> Server-side account and squad permissions apply.</div>
        </section>

        <section className="playerPanel">
          <div className="playerPanelHeading"><div><p className="eyebrow">ACCOUNT STATUS</p><h2>YOUR <span className="ember">PROFILE.</span></h2></div><Activity size={22}/></div>
          <div className="playerProfileLine"><span>PLAYER NAME</span><strong>{profile?.profile?.displayName || session.displayName || 'Player'}</strong></div>
          <div className="playerProfileLine"><span>EMAIL</span><strong>{profile?.email || session.email}</strong></div>
          <div className="playerProfileLine"><span>ACCESS ROLE</span><strong>{profile?.role || session.role}</strong></div>
          <div className="playerProfileLine"><span>ACCOUNT ID</span><code>{profile?.id || session.userId || '—'}</code></div>
          <div className="playerPanelFoot"><Wallet size={15}/> Real-money deposits and payouts are not enabled in this workspace.</div>
        </section>
      </div>

      <section className="playerPanel playerEventsPanel">
        <div className="playerPanelHeading"><div><p className="eyebrow">LIVE API FEED</p><h2>TOURNAMENT <span className="ember">LINEUP.</span></h2></div><span className="playerLiveTag"><i className="pulse"/> API CONNECTED</span></div>
        {loading ? <div className="playerEmpty">SYNCING TOURNAMENTS…</div> : tournaments.length === 0 ? <div className="playerEmpty">NO TOURNAMENTS PUBLISHED YET. CHECK BACK SOON.</div> : <div className="playerEventList">{tournaments.map((event) => {
          const start = new Date(event.startsAt);
          const canJoin = event.status === 'REGISTRATION_OPEN' && Number(event.entryFee || 0) === 0;
          return <article className="playerEventRow" key={event.id}>
            <div className="playerEventIcon"><Gamepad2 size={20}/></div>
            <div className="playerEventMain"><div className="playerEventMeta"><span>{event.game === 'FREE_FIRE' ? 'FREE FIRE' : event.game}</span><span>{String(event.status).replaceAll('_', ' ')}</span></div><h3>{event.name}</h3><p><CalendarDays size={14}/>{Number.isNaN(start.getTime()) ? 'Time to be announced' : start.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} <b>·</b> {String(event.format).replaceAll('_', ' ')}</p></div>
            <div className="playerEventPrize"><small>PRIZE POOL</small><strong>{money(event.prizePool)}</strong><small>ENTRY {Number(event.entryFee || 0) === 0 ? 'FREE' : money(event.entryFee)}</small></div>
            {canJoin ? <button className="secondaryButton playerJoinButton" onClick={() => joinTournament(event)} disabled={busy || !myTeam || myTeam.captain?.id !== profile?.id}>{myTeam?.captain?.id === profile?.id ? 'REGISTER SQUAD' : 'CAPTAIN ONLY'} <ArrowRight size={14}/></button> : <span className="playerEventStatus">{Number(event.entryFee || 0) > 0 ? 'PAID ENTRY DISABLED' : String(event.status).replaceAll('_', ' ')}</span>}
          </article>;
        })}</div>}
        <p className="playerPanelFoot"><CircleDollarSign size={15}/> Paid registration is deliberately blocked until a verified payment flow is deployed. No wallet balance is simulated here.</p>
      </section>

      <section className="playerPanel playerEventsPanel">
        <div className="playerPanelHeading"><div><p className="eyebrow">MATCH CENTER</p><h2>UPCOMING <span className="ember">MATCHES.</span></h2></div><Swords size={22}/></div>
        {matches.length === 0 ? <div className="playerEmpty">NO MATCHES SCHEDULED YET.</div> : <div className="playerEventList">{matches.filter((match) => new Date(match.scheduledAt) >= new Date()).map((match) => <article className="playerEventRow" key={match.id}><div className="playerEventIcon"><CalendarDays size={20}/></div><div className="playerEventMain"><div className="playerEventMeta"><span>{tournaments.find((event) => event.id === match.tournamentId)?.name || 'APEX NOVA'}</span><span>SCHEDULED</span></div><h3>{match.round}</h3><p>{new Date(match.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p></div><span className="playerEventStatus">ROOM DETAILS RELEASED IN LIVE MATCH</span></article>)}</div>}
      </section>

      <section className="playerPanel">
        <div className="playerPanelHeading"><div><p className="eyebrow">PLAYER INBOX</p><h2>RECENT <span className="ember">UPDATES.</span></h2></div><Bell size={22}/></div>
        {notifications.length === 0 ? <div className="playerEmpty">NO NOTIFICATIONS YET.</div> : notifications.slice(0, 5).map((item) => <article className="playerNotification" key={item.id}><span className={item.readAt ? 'notificationDot read' : 'notificationDot'}/><div><strong>{item.title}</strong><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString('en-IN')}</small></div>{!item.readAt && <button className="secondaryButton" onClick={() => markRead(item)}>MARK READ</button>}</article>)}
      </section>
      <footer className="playerFooter">APEX NOVA · RISE. DOMINATE. CONQUER. <span>Account and tournament data are API-backed. Payments remain disabled.</span></footer>
    </main>
  );
}
