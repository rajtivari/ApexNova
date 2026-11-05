'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, Bell, CalendarDays, CheckCircle2, CircleDollarSign, Gamepad2, Gamepad2, LogOut, RefreshCw, ShieldCheck, Swords, Users, Wallet } from 'lucide-react';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://apexnova-api.onrender.com').replace(/\/$/, '');
const SESSION_KEY = 'apexnova-local-session-v1';
const UPI_QR_URL = process.env.NEXT_PUBLIC_UPI_QR_URL || '';
const KYC_UPLOADS_ENABLED = process.env.NEXT_PUBLIC_KYC_UPLOADS_ENABLED === 'true';
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
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [kyc, setKyc] = useState({ status: 'NOT_SUBMITTED' });
  const [kycForm, setKycForm] = useState({ selfie: null, aadhaarImage: null, consent: false });
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', method: 'UPI', upiVpa: '', accountName: '', accountNumber: '', ifsc: '' });
  const [teamName, setTeamName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [joinForm, setJoinForm] = useState({ gameUid: '', inGameName: '', rulesAccepted: false, paymentReference: '' });
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
      const [me, events, roster, alerts, matchRows, walletData, kycData] = await Promise.all([
        api('/api/auth/me', currentSession.accessToken),
        api('/api/tournaments'),
        api('/api/teams', currentSession.accessToken),
        api('/api/notifications', currentSession.accessToken),
        api('/api/matches'),
        api('/api/wallet/me', currentSession.accessToken),
        api('/api/kyc/me', currentSession.accessToken),
      ]);
      setProfile(me.user);
      setTournaments(Array.isArray(events) ? events : []);
      setTeams(Array.isArray(roster) ? roster : []);
      setNotifications(Array.isArray(alerts) ? alerts : []);
      setMatches(Array.isArray(matchRows) ? matchRows : []);
      setWallet(walletData || { balance: 0, transactions: [] });
      setKyc(kycData || { status: 'NOT_SUBMITTED' });
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
    if (!joinForm.gameUid.trim() || !joinForm.inGameName.trim() || !joinForm.rulesAccepted || (Number(tournament.entryFee || 0) > 0 && !joinForm.paymentReference.trim())) {
      setError('Enter your game UID and in-game name, accept the rules, and add the UPI reference for a paid entry.');
      return;
    }
    setBusy(true); setError(''); setMessage('');
    try {
      await api('/api/tournaments/' + tournament.id + '/register', session.accessToken, {
        method: 'POST',
        body: JSON.stringify({
          teamId: team.id,
          gameUid: joinForm.gameUid.trim(),
          inGameName: joinForm.inGameName.trim(),
          rulesAccepted: joinForm.rulesAccepted,
          ...(Number(tournament.entryFee || 0) > 0 ? { paymentReference: joinForm.paymentReference.trim() } : {}),
        }),
      });
      setMessage(Number(tournament.entryFee || 0) > 0 ? 'UPI reference submitted. Staff will verify payment before approving your registration.' : 'Registration submitted. Your game ID and rules acceptance were recorded. Check the tournament status for staff approval.');
      setSelectedTournament(null);
      setJoinForm({ gameUid: '', inGameName: '', rulesAccepted: false, paymentReference: '' });
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

  async function readImage(file) {
    if (!file) return null;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('Use a JPEG or PNG image no larger than 2 MB.');
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: String(reader.result), mimeType: file.type });
      reader.onerror = () => reject(new Error('Could not read the selected image.'));
      reader.readAsDataURL(file);
    });
  }

  async function setKycImage(field, file) {
    setError('');
    try { const image = await readImage(file); setKycForm((current) => ({ ...current, [field]: image })); }
    catch (err) { setError(err.message); }
  }

  async function submitKyc(event) {
    event.preventDefault(); const formElement = event.currentTarget; setBusy(true); setError(''); setMessage('');
    try {
      await api('/api/kyc/me', session.accessToken, { method: 'POST', body: JSON.stringify(kycForm) });
      setKycForm({ selfie: null, aadhaarImage: null, consent: false });
      formElement.reset();
      setMessage('Identity and age documents sent for private staff review.');
      await load(session);
    } catch (err) { setError(err.message || 'Could not submit identity verification.'); }
    finally { setBusy(false); }
  }

  async function requestWithdrawal(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const result = await api('/api/wallet/withdraw', session.accessToken, { method: 'POST', body: JSON.stringify({ amount: Number(withdrawForm.amount), method: withdrawForm.method, ...(withdrawForm.method === 'UPI' ? { upiVpa: withdrawForm.upiVpa.trim() } : { accountName: withdrawForm.accountName.trim(), accountNumber: withdrawForm.accountNumber.trim(), ifsc: withdrawForm.ifsc.trim().toUpperCase() }) }) });
      setWithdrawForm({ amount: '', method: 'UPI', upiVpa: '', accountName: '', accountNumber: '', ifsc: '' });
      setMessage('Withdrawal request submitted. ' + money(result.balance) + ' remains in your prize wallet.');
      await load(session);
    } catch (err) { setError(err.message || 'Could not submit withdrawal request.'); }
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
  if (!session) return <main className="shell localAccessDenied"><Gamepad2 size={32} /><p className="eyebrow">PLAYER ACCESS</p><h1>SIGN IN TO CONTINUE.</h1><p className="lede">Your player workspace uses the ApexNova API. Sign in to load your account, teams, and tournaments.</p><Link className="primaryButton" href="/login">SIGN IN <ArrowRight size={16}/></Link></main>;

  const myTeam = teams.find((item) => item.captain?.id === profile?.id || item.members?.some((member) => member.userId === profile?.id));
  const openEvents = tournaments.filter((item) => item.status === 'REGISTRATION_OPEN');
  const upcoming = tournaments.filter((item) => !['COMPLETED', 'CANCELLED'].includes(item.status));

  return (
    <main className="shell playerDashboard">
      <header className="topbar">
        <Link href="/" className="brand"><Gamepad2 size={24}/><span>APEX<span className="ember">NOVA</span></span></Link>
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
          const canJoin = event.status === 'REGISTRATION_OPEN' && (Number(event.entryFee || 0) === 0 || Boolean(UPI_QR_URL));
          return <article className="playerEventRow" key={event.id}>
            <div className="playerEventIcon"><Gamepad2 size={20}/></div>
            <div className="playerEventMain"><div className="playerEventMeta"><span>{event.game === 'FREE_FIRE' ? 'FREE FIRE' : event.game}</span><span>{String(event.status).replaceAll('_', ' ')}</span></div><h3>{event.name}</h3><p><CalendarDays size={14}/>{Number.isNaN(start.getTime()) ? 'Time to be announced' : start.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} <b>·</b> {String(event.format).replaceAll('_', ' ')}</p></div>
            <div className="playerEventPrize"><small>PRIZE POOL</small><strong>{money(event.prizePool)}</strong><small>ENTRY {Number(event.entryFee || 0) === 0 ? 'FREE' : money(event.entryFee)}</small></div>
            {canJoin ? <button className="secondaryButton playerJoinButton" onClick={() => { setSelectedTournament(event); setJoinForm({ gameUid: '', inGameName: '', rulesAccepted: false, paymentReference: '' }); setError(''); setMessage(''); }} disabled={busy || !myTeam || myTeam.captain?.id !== profile?.id}>{myTeam?.captain?.id === profile?.id ? 'REGISTER SQUAD' : 'CAPTAIN ONLY'} <ArrowRight size={14}/></button> : <span className="playerEventStatus">{Number(event.entryFee || 0) > 0 ? 'PAID ENTRY NOT CONFIGURED' : String(event.status).replaceAll('_', ' ')}</span>}
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
      {selectedTournament && <div className="playerJoinBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setSelectedTournament(null); }}>
        <form className="playerJoinModal" onSubmit={(event) => { event.preventDefault(); joinTournament(selectedTournament); }} role="dialog" aria-modal="true" aria-labelledby="joinTournamentTitle">
          <div className="playerJoinHeading"><div><p className="eyebrow">REGISTRATION / {selectedTournament.game === 'FREE_FIRE' ? 'FREE FIRE' : selectedTournament.game}</p><h2 id="joinTournamentTitle">JOIN <span className="ember">{selectedTournament.name}</span></h2></div><button type="button" className="closeButton" aria-label="Close" onClick={() => setSelectedTournament(null)}>×</button></div>
          <div className="playerRulesBox"><strong>TOURNAMENT RULES</strong><p>{selectedTournament.rules}</p></div>
          <label className="playerJoinField">IN-GAME UID<input value={joinForm.gameUid} onChange={(event) => setJoinForm({ ...joinForm, gameUid: event.target.value })} minLength={3} maxLength={40} pattern="[A-Za-z0-9._-]+" placeholder="Your exact game UID" required /></label>
          <label className="playerJoinField">IN-GAME NAME<input value={joinForm.inGameName} onChange={(event) => setJoinForm({ ...joinForm, inGameName: event.target.value })} minLength={2} maxLength={40} placeholder="Name shown in the game" required /></label>
          {Number(selectedTournament.entryFee || 0) > 0 && <div className="playerPaymentBox"><strong>PAY ENTRY BY UPI · {money(selectedTournament.entryFee)}</strong>{UPI_QR_URL ? <img src={UPI_QR_URL} alt="ApexNova UPI payment QR" /> : <p>UPI QR is not configured for this site yet.</p>}<label className="playerJoinField">UPI TRANSACTION REFERENCE<input value={joinForm.paymentReference} onChange={(event) => setJoinForm({ ...joinForm, paymentReference: event.target.value })} minLength={8} maxLength={40} pattern="[A-Za-z0-9]+" placeholder="Enter the UTR / transaction ID after payment" required /></label><small>Staff verify the reference against the payment before approving the squad.</small></div>}

          <label className="playerRulesAccept"><input type="checkbox" checked={joinForm.rulesAccepted} onChange={(event) => setJoinForm({ ...joinForm, rulesAccepted: event.target.checked })} required /><span>I have read and agree to the tournament rules. My UID and in-game name are correct.</span></label>
          <p className="playerJoinNote">Entry: {money(selectedTournament.entryFee)} · Registration will be sent for staff approval.</p>
          {error && <div className="playerNotice playerNoticeError" role="alert">{error}</div>}
          <div className="playerJoinActions"><button type="button" className="secondaryButton" onClick={() => setSelectedTournament(null)} disabled={busy}>CANCEL</button><button className="primaryButton" type="submit" disabled={busy}>{busy ? 'SUBMITTING…' : 'AGREE & REGISTER'} <ArrowRight size={15}/></button></div>
        </form>
      </div>}
      <section className="playerPanel">
        <div className="playerPanelHeading"><div><p className="eyebrow">PLAYER IDENTITY / AGE 18+</p><h2>IDENTITY <span className="ember">CHECK.</span></h2></div><ShieldCheck size={22}/></div>
        <div className="playerIdentityStatus"><span className={'adminStatusPill ' + (kyc.status === 'APPROVED' ? 'adminStatusLive' : '')}>{String(kyc.status || 'NOT_SUBMITTED').replaceAll('_', ' ')}</span><span>{kyc.ageVerified ? 'Age verified by staff.' : 'Age will be checked by staff from your Aadhaar image.'}</span>{kyc.reviewNote && <small>{kyc.reviewNote}</small>}</div>
        {kyc.status !== 'APPROVED' && <form className="playerIdentityForm" onSubmit={submitKyc}>
          <label>SELFIE PHOTO<input type="file" accept="image/jpeg,image/png" onChange={(event) => setKycImage('selfie', event.target.files?.[0])} required /></label>
          <label>MASKED AADHAAR CARD PHOTO<input type="file" accept="image/jpeg,image/png" onChange={(event) => setKycImage('aadhaarImage', event.target.files?.[0])} required /><small>Hide the first 8 digits before uploading. JPEG/PNG, up to 2 MB.</small></label>
          <label className="playerKycConsent"><input type="checkbox" checked={kycForm.consent} onChange={(event) => setKycForm({ ...kycForm, consent: event.target.checked })} required /><span>I consent to ApexNova using these images only for identity and age verification. They are encrypted, visible only to authorized reviewers, and deleted after review.</span></label>
          <button className="primaryButton" type="submit" disabled={busy || !KYC_UPLOADS_ENABLED}>{busy ? 'SUBMITTING…' : 'SEND FOR ADMIN REVIEW'} <ArrowRight size={15}/></button>
          {!KYC_UPLOADS_ENABLED && <small className="fieldNote warning">Secure identity storage is not configured on this deployment yet.</small>}
        </form>}
      </section>

      <section className="playerPanel">
        <div className="playerPanelHeading"><div><p className="eyebrow">APPROVED PRIZE BALANCE</p><h2>YOUR <span className="ember">WALLET.</span></h2></div><Wallet size={22}/></div>
        <div className="playerWalletSummary"><div><small>AVAILABLE TO WITHDRAW</small><strong>{money(wallet.balance)}</strong><p>Only staff-approved tournament prizes are credited. Entry payments are made per tournament by UPI QR.</p></div><span className="playerLiveTag">PRIZE LEDGER</span></div>
        {kyc.status === 'APPROVED' ? <form className="playerWithdrawalForm" onSubmit={requestWithdrawal}><label>WITHDRAWAL AMOUNT (₹)<input type="number" min="1" max="1000000" step="1" value={withdrawForm.amount} onChange={(event) => setWithdrawForm({ ...withdrawForm, amount: event.target.value })} required /></label><label>PAYOUT METHOD<select value={withdrawForm.method} onChange={(event) => setWithdrawForm({ ...withdrawForm, method: event.target.value })}><option value="UPI">UPI</option><option value="BANK">BANK ACCOUNT</option></select></label>{withdrawForm.method === 'UPI' ? <label>YOUR UPI ID<input value={withdrawForm.upiVpa} onChange={(event) => setWithdrawForm({ ...withdrawForm, upiVpa: event.target.value })} placeholder="name@bank" minLength={5} maxLength={100} required /></label> : <><label>ACCOUNT HOLDER NAME<input value={withdrawForm.accountName} onChange={(event) => setWithdrawForm({ ...withdrawForm, accountName: event.target.value })} minLength={2} maxLength={100} required /></label><label>BANK ACCOUNT NUMBER<input inputMode="numeric" value={withdrawForm.accountNumber} onChange={(event) => setWithdrawForm({ ...withdrawForm, accountNumber: event.target.value })} minLength={6} maxLength={34} pattern="[0-9]+" required /></label><label>IFSC CODE<input value={withdrawForm.ifsc} onChange={(event) => setWithdrawForm({ ...withdrawForm, ifsc: event.target.value.toUpperCase() })} minLength={11} maxLength={11} pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}" required /></label></>}<button className="primaryButton" type="submit" disabled={busy || Number(wallet.balance) <= 0}>{busy ? 'SENDING…' : 'REQUEST PAYOUT'} <ArrowRight size={15}/></button></form> : <p className="playerPanelFoot"><ShieldCheck size={15}/> Approved identity and age verification is required before prize withdrawals.</p>}
        <div className="playerWalletLedger">{(wallet.transactions || []).map((tx) => <div className="ledgerRow" key={tx.id}><div className="ledgerIcon"><CircleDollarSign size={17}/></div><div className="ledgerMain"><strong>{String(tx.type).replaceAll('_', ' ')}</strong><small>{tx.status} · {new Date(tx.createdAt).toLocaleString('en-IN')}</small></div><strong className={tx.type === 'WITHDRAWAL' ? 'negativeAmount' : 'positiveAmount'}>{tx.type === 'WITHDRAWAL' ? '−' : '+'}{money(tx.amount)}</strong></div>)}{!(wallet.transactions || []).length && <div className="playerEmpty">NO PRIZE OR PAYOUT TRANSACTIONS YET.</div>}</div>
      </section>
      <footer className="playerFooter">APEX NOVA · RISE. DOMINATE. CONQUER. <span>Account and tournament data are API-backed. Payments remain disabled.</span></footer>
    </main>
  );
}
