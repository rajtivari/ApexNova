'use client';

import { useEffect, useState } from 'react';
import { Activity, Bell, ChevronRight, Crosshair, LogOut, RefreshCw, Shield, Users, WalletCards, Trophy } from 'lucide-react';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '')).replace(/\/+$/, '');

async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) throw new Error('API URL is not configured. Set NEXT_PUBLIC_API_URL when building the web app.');
  const response = await fetch(API_BASE_URL + path, {
    method: options.method || 'GET',
    headers: Object.assign({}, options.body ? { 'content-type': 'application/json' } : {}, options.token ? { authorization: 'Bearer ' + options.token } : {}),
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || ('Request failed (' + response.status + ')'));
  return data;
}

function formatDate(value) {
  if (!value) return 'Schedule pending';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Schedule pending' : date.toLocaleString();
}

export default function Home() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [memberEmails, setMemberEmails] = useState({});
  const [tournamentDraft, setTournamentDraft] = useState({ name: '', game: 'FREE_FIRE', format: 'BATTLE_ROYALE', entryFee: '0', prizePool: '0', startsAt: '', registrationClosesAt: '' });
  const [matchDraft, setMatchDraft] = useState({ tournamentId: '', round: '1', scheduledAt: '', roomId: '', roomPassword: '' });
  const [resultMatchId, setResultMatchId] = useState('');
  const [resultDraft, setResultDraft] = useState({ teamId: '', kills: '0', placement: '1', proofUrl: '' });
  const [roomDetails, setRoomDetails] = useState({});
  const [notice, setNotice] = useState('');
  const [noticeKind, setNoticeKind] = useState('info');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function refreshWorkspace(sessionToken) {
    const activeToken = sessionToken || token;
    if (!activeToken) return;
    setRefreshing(true);
    const results = await Promise.allSettled([
      apiRequest('/api/tournaments', { token: activeToken }),
      apiRequest('/api/matches', { token: activeToken }),
      apiRequest('/api/teams', { token: activeToken }),
      apiRequest('/api/notifications', { token: activeToken }),
    ]);
    if (results[0].status === 'fulfilled') setTournaments(results[0].value);
    if (results[1].status === 'fulfilled') setMatches(results[1].value);
    if (results[2].status === 'fulfilled') setTeams(results[2].value);
    if (results[3].status === 'fulfilled') setNotifications(results[3].value);
    const failed = results.find((item) => item.status === 'rejected');
    if (failed) {
      setNotice(failed.reason.message || 'Some data could not be loaded.');
      setNoticeKind('error');
    } else {
      setNotice('');
    }
    setRefreshing(false);
  }

  useEffect(() => {
    const storedToken = sessionStorage.getItem('apexnova-access-token');
    if (!storedToken) return;
    apiRequest('/api/auth/me', { token: storedToken })
      .then((response) => {
        setToken(storedToken);
        setUser(response.user);
        return refreshWorkspace(storedToken);
      })
      .catch(() => {
        sessionStorage.removeItem('apexnova-access-token');
        sessionStorage.removeItem('apexnova-user');
      });
  }, []);

  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const path = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = mode === 'register' ? { email, password, displayName } : { email, password };
      const response = await apiRequest(path, { method: 'POST', body });
      sessionStorage.setItem('apexnova-access-token', response.accessToken);
      sessionStorage.setItem('apexnova-user', JSON.stringify(response.user));
      setToken(response.accessToken);
      setUser(response.user);
      setPassword('');
      setNotice(mode === 'register' ? 'Account created. Welcome to ApexNova.' : 'Signed in successfully.');
      setNoticeKind('success');
      await refreshWorkspace(response.accessToken);
    } catch (error) {
      setNotice(error.message || 'Authentication failed.');
      setNoticeKind('error');
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    sessionStorage.removeItem('apexnova-access-token');
    sessionStorage.removeItem('apexnova-user');
    setToken('');
    setUser(null);
    setTournaments([]);
    setMatches([]);
    setTeams([]);
    setNotifications([]);
    setActiveTab('overview');
    setNotice('Signed out.');
    setNoticeKind('info');
  }

  async function createTeam(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiRequest('/api/teams', { token, method: 'POST', body: { name: teamName } });
      setTeamName('');
      setNotice('Team created.');
      setNoticeKind('success');
      await refreshWorkspace();
    } catch (error) {
      setNotice(error.message);
      setNoticeKind('error');
    } finally {
      setBusy(false);
    }
  }


  async function addMember(event, teamId) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiRequest('/api/teams/' + teamId + '/members', { token, method: 'POST', body: { email: memberEmails[teamId] || '' } });
      setMemberEmails((current) => ({ ...current, [teamId]: '' }));
      setNotice('Player added to roster.');
      setNoticeKind('success');
      await refreshWorkspace();
    } catch (error) {
      setNotice(error.message);
      setNoticeKind('error');
    } finally {
      setBusy(false);
    }
  }

  async function createTournament(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiRequest('/api/tournaments', {
        token,
        method: 'POST',
        body: {
          ...tournamentDraft,
          entryFee: Number(tournamentDraft.entryFee),
          prizePool: Number(tournamentDraft.prizePool),
          startsAt: new Date(tournamentDraft.startsAt).toISOString(),
          registrationClosesAt: new Date(tournamentDraft.registrationClosesAt).toISOString(),
        },
      });
      setTournamentDraft({ name: '', game: 'FREE_FIRE', format: 'BATTLE_ROYALE', entryFee: '0', prizePool: '0', startsAt: '', registrationClosesAt: '' });
      setNotice('Tournament created in draft status.');
      setNoticeKind('success');
      await refreshWorkspace();
    } catch (error) {
      setNotice(error.message);
      setNoticeKind('error');
    } finally {
      setBusy(false);
    }
  }

  async function changeTournamentStatus(tournament) {
    const nextStatus = {
      DRAFT: 'PUBLISHED',
      PUBLISHED: 'REGISTRATION_OPEN',
      REGISTRATION_OPEN: 'REGISTRATION_CLOSED',
      REGISTRATION_CLOSED: 'LIVE',
      LIVE: 'COMPLETED',
    }[tournament.status];
    if (!nextStatus) return;
    setBusy(true);
    try {
      await apiRequest('/api/tournaments/' + tournament.id + '/status', { token, method: 'PATCH', body: { status: nextStatus } });
      setNotice('Tournament moved to ' + nextStatus.replaceAll('_', ' ') + '.');
      setNoticeKind('success');
      await refreshWorkspace();
    } catch (error) {
      setNotice(error.message);
      setNoticeKind('error');
    } finally {
      setBusy(false);
    }
  }

  async function registerTeam(tournamentId) {
    const team = teams.find((item) => item.captainId === user.id);
    if (!team) {
      setNotice('Create a team first. Only the captain can register it.');
      setNoticeKind('error');
      return;
    }
    setBusy(true);
    try {
      await apiRequest('/api/tournaments/' + tournamentId + '/register', { token, method: 'POST', body: { teamId: team.id } });
      setNotice('Registration submitted for staff approval.');
      setNoticeKind('success');
      await refreshWorkspace();
    } catch (error) {
      setNotice(error.message);
      setNoticeKind('error');
    } finally {
      setBusy(false);
    }
  }

  async function createMatch(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiRequest('/api/matches', {
        token,
        method: 'POST',
        body: {
          tournamentId: matchDraft.tournamentId,
          round: matchDraft.round,
          scheduledAt: new Date(matchDraft.scheduledAt).toISOString(),
          roomId: matchDraft.roomId || undefined,
          roomPassword: matchDraft.roomPassword || undefined,
        },
      });
      setMatchDraft({ tournamentId: '', round: '1', scheduledAt: '', roomId: '', roomPassword: '' });
      setNotice('Match created.');
      setNoticeKind('success');
      await refreshWorkspace();
    } catch (error) {
      setNotice(error.message);
      setNoticeKind('error');
    } finally {
      setBusy(false);
    }
  }

  async function submitResult(event, matchId) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiRequest('/api/matches/' + matchId + '/results', {
        token,
        method: 'POST',
        body: { teamId: resultDraft.teamId, kills: Number(resultDraft.kills), placement: Number(resultDraft.placement), proofUrl: resultDraft.proofUrl },
      });
      setResultMatchId('');
      setResultDraft({ teamId: '', kills: '0', placement: '1', proofUrl: '' });
      setNotice('Result submitted for staff review.');
      setNoticeKind('success');
      await refreshWorkspace();
    } catch (error) {
      setNotice(error.message);
      setNoticeKind('error');
    } finally {
      setBusy(false);
    }
  }

  async function loadRoom(matchId) {
    try {
      const room = await apiRequest('/api/matches/' + matchId + '/room', { token });
      setRoomDetails((current) => ({ ...current, [matchId]: room }));
      setNotice('Room details loaded. Do not share them outside your registered squad.');
      setNoticeKind('success');
    } catch (error) {
      setNotice(error.message);
      setNoticeKind('error');
    }
  }

  async function markRead(id) {
    try {
      await apiRequest('/api/notifications/' + id + '/read', { token, method: 'PATCH' });
      await refreshWorkspace();
    } catch (error) {
      setNotice(error.message);
      setNoticeKind('error');
    }
  }

  const isStaff = user && ['SUPER_ADMIN', 'WORKER'].includes(user.role);
  const title = user && user.role === 'SUPER_ADMIN' ? 'Command center'
    : user && user.role === 'WORKER' ? 'Operations desk'
      : user && user.role === 'CAPTAIN' ? 'Team command' : 'Player dashboard';

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><Crosshair size={20} /><span>APEX<span className="ember">NOVA</span></span></div>
        <div className="status"><span className={API_BASE_URL ? 'pulse' : 'pulse offline'} />{API_BASE_URL ? 'API CONFIGURED' : 'API URL REQUIRED'}<span className="divider" />{user ? user.role.replace('_', ' ') : 'SECURE ACCESS'}</div>
        {user && <button className="iconButton" onClick={signOut} aria-label="Sign out"><LogOut size={18} /></button>}
      </header>

      {!user ? (
        <section className="authLayout">
          <div className="authIntro">
            <p className="eyebrow">APEXFLOW / OPERATIONS CONSOLE</p>
            <h1>ENTER<br />THE ARENA.</h1>
            <p className="lede">One command center for tournament operations, team rosters, match results, and decisions.</p>
            <div className="authSignals"><div><Shield size={18} /><span>Role-based access</span></div><div><Activity size={18} /><span>Live API data</span></div><div><Trophy size={18} /><span>Free Fire + BGMI</span></div></div>
          </div>
          <form className="authCard" onSubmit={submitAuth}>
            <p className="eyebrow">{mode === 'register' ? 'NEW PLAYER PROFILE' : 'IDENTITY VERIFICATION'}</p>
            <h2>{mode === 'register' ? 'Create account' : 'Welcome back'}</h2>
            <p className="formHint">{mode === 'register' ? 'Create a player account. Staff permissions are assigned separately.' : 'Sign in with your registered email and password.'}</p>
            {mode === 'register' && <label>DISPLAY NAME<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} minLength={2} maxLength={40} required autoComplete="name" /></label>}
            <label>EMAIL ADDRESS<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
            <label>PASSWORD<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={mode === 'register' ? 12 : 1} maxLength={128} required autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /></label>
            {mode === 'register' && <p className="fieldNote">Use at least 12 characters. New accounts start with player permissions.</p>}
            <button className="primaryButton" type="submit" disabled={busy || !API_BASE_URL}>{busy ? 'PLEASE WAIT…' : mode === 'register' ? 'CREATE PLAYER ACCOUNT' : 'SIGN IN'} <ChevronRight size={17} /></button>
            {!API_BASE_URL && <p className="fieldNote warning">Configure NEXT_PUBLIC_API_URL when building the web app to enable sign-in.</p>}
            <p className="switchAuth">{mode === 'register' ? 'Already registered?' : 'New to ApexNova?'} <button type="button" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setNotice(''); }}>{mode === 'register' ? 'Sign in' : 'Create an account'}</button></p>
          </form>
        </section>
      ) : (
        <>
          <section className="hero"><div><p className="eyebrow">APEXFLOW / OPERATIONS CONSOLE</p><h1>{title}</h1><p className="lede">Welcome, {user.profile?.displayName || user.email}. Your dashboard is connected to account-backed data.</p></div><div className="heroMark"><Shield size={42} /><span>{user.role.replace('_', ' ')}</span></div></section>
          <nav className="roleTabs" aria-label="Dashboard sections">
            {['overview', 'tournaments', 'teams', 'matches', 'notifications'].map((tab) => <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab.toUpperCase()}{tab === 'notifications' && notifications.filter((item) => !item.readAt).length ? ' (' + notifications.filter((item) => !item.readAt).length + ')' : ''}</button>)}
            <button className="refreshButton" onClick={() => refreshWorkspace()} disabled={refreshing}><RefreshCw size={15} /> REFRESH</button>
          </nav>
          <section className="stats">
            <div className="stat"><span>TOURNAMENTS</span><strong>{String(tournaments.length).padStart(2, '0')}</strong><small>DATABASE RECORDS</small></div>
            <div className="stat"><span>MATCHES</span><strong>{String(matches.length).padStart(2, '0')}</strong><small>SCHEDULED + COMPLETED</small></div>
            <div className="stat"><span>MY TEAMS</span><strong>{String(teams.filter((team) => team.captainId === user.id || team.members?.some((member) => member.userId === user.id)).length).padStart(2, '0')}</strong><small>ACCOUNT ACCESS</small></div>
          </section>
          {notice && <div className={'notice ' + noticeKind} role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}

          {activeTab === 'overview' && <section className="workspace">
            <div className="sectionHeading"><div><p className="eyebrow">LIVE MODULES</p><h2>Operational overview</h2></div><span className="mono">{refreshing ? 'SYNCING…' : 'CONNECTED DATA'}</span></div>
            <div className="moduleGrid">
              <button className="module moduleButton" onClick={() => setActiveTab('tournaments')}><div className="moduleIcon"><Trophy /></div><div><p className="moduleIndex">01 // TOURNAMENTS</p><h3>Competition board</h3><p>Browse schedules, entry rules, and registration status.</p></div><ChevronRight className="arrow" size={18} /></button>
              <button className="module moduleButton" onClick={() => setActiveTab('teams')}><div className="moduleIcon"><Users /></div><div><p className="moduleIndex">02 // ROSTERS</p><h3>Team command</h3><p>Create a team and manage squad membership.</p></div><ChevronRight className="arrow" size={18} /></button>
              <button className="module moduleButton" onClick={() => setActiveTab('matches')}><div className="moduleIcon"><Activity /></div><div><p className="moduleIndex">03 // MATCHES</p><h3>Match control</h3><p>View fixtures and submitted results.</p></div><ChevronRight className="arrow" size={18} /></button>
            </div>
            <div className="sectionHeading listHeading"><div><p className="eyebrow">NEXT UP</p><h2>Upcoming tournaments</h2></div><button className="textButton" onClick={() => setActiveTab('tournaments')}>VIEW ALL <ChevronRight size={14} /></button></div>
            <div className="dataList">{tournaments.slice(0, 4).map((item) => <article className="dataRow" key={item.id}><div><strong>{item.name}</strong><span>{item.game.replace('_', ' ')} · {item.format.replaceAll('_', ' ')}</span></div><div className="rowMeta"><span className="statusTag">{item.status.replaceAll('_', ' ')}</span><span>{formatDate(item.startsAt)}</span></div></article>)}{!tournaments.length && <p className="emptyState">No tournaments are available yet.</p>}</div>
          </section>}

          {activeTab === 'tournaments' && <section className="workspace">
            <div className="sectionHeading"><div><p className="eyebrow">COMPETITION BOARD</p><h2>Tournaments</h2></div><span className="mono">{tournaments.length} RECORDS</span></div>
            <div className="dataList">{tournaments.map((item) => <article className="dataCard" key={item.id}><div className="dataCardHead"><div><p className="moduleIndex">{item.game.replace('_', ' ')} / {item.format.replaceAll('_', ' ')}</p><h3>{item.name}</h3></div><span className="statusTag">{item.status.replaceAll('_', ' ')}</span></div><div className="dataFacts"><span>{formatDate(item.startsAt)}</span><span>{item._count?.registrations || 0} registrations</span><span>Entry fee: {Number(item.entryFee) > 0 ? '₹' + Number(item.entryFee) : 'Free'}</span><span>Prize pool: ₹{Number(item.prizePool || 0)}</span></div></article>)}{!tournaments.length && <p className="emptyState">No tournaments found.</p>}</div>
          </section>}

          {activeTab === 'teams' && <section className="workspace">
            <div className="sectionHeading"><div><p className="eyebrow">SQUAD OPERATIONS</p><h2>My teams</h2></div><span className="mono">{teams.length} VISIBLE</span></div>
            {!isStaff && teams.length === 0 && <form className="inlineForm compactForm" onSubmit={createTeam}><h3>Create your squad</h3><p className="formHint">You will become captain. Squads support one captain and up to three players.</p><label>TEAM NAME<input value={teamName} onChange={(e) => setTeamName(e.target.value)} minLength={2} maxLength={40} required /></label><button className="primaryButton" type="submit" disabled={busy}>CREATE TEAM <ChevronRight size={16} /></button></form>}
            <div className="teamGrid">{teams.map((team) => <article className="dataCard" key={team.id}><div className="dataCardHead"><div><p className="moduleIndex">TEAM / {team.id.slice(0, 8)}</p><h3>{team.name}</h3></div><span className="statusTag">{team.captainId === user.id ? 'CAPTAIN' : 'MEMBER'}</span></div><p className="teamCaptain">Captain: {team.captain?.profile?.displayName || team.captain?.email}</p><div className="memberList">{team.members?.map((member) => <div key={member.id}><Users size={14} /><span>{member.user?.profile?.displayName || member.user?.email}</span></div>)}</div></article>)}{!teams.length && isStaff && <p className="emptyState">Staff accounts do not need a player roster.</p>}</div>
          </section>}

          {activeTab === 'matches' && <section className="workspace">
            <div className="sectionHeading"><div><p className="eyebrow">MATCH OPERATIONS</p><h2>Fixtures & results</h2></div><span className="mono">{matches.length} MATCHES</span></div>
            <div className="dataList">{matches.map((match) => <article className="dataCard" key={match.id}><div className="dataCardHead"><div><p className="moduleIndex">ROUND {match.round}</p><h3>Match {match.id.slice(0, 8)}</h3></div><span className="rowDate">{formatDate(match.scheduledAt)}</span></div><div className="resultList">{match.results?.map((result) => <div className="resultRow" key={result.id}><span>Team {result.teamId.slice(0, 8)}</span><span>{result.kills} kills</span><span>{result.totalPoints} pts</span><span className="statusTag">{result.status}</span></div>)}</div></article>)}{!matches.length && <p className="emptyState">No matches are scheduled yet.</p>}</div>
          </section>}

          {activeTab === 'notifications' && <section className="workspace">
            <div className="sectionHeading"><div><p className="eyebrow">ACCOUNT ACTIVITY</p><h2>Notifications</h2></div><span className="mono">{notifications.length} ALERTS</span></div>
            <div className="dataList">{notifications.map((item) => <article className={'dataRow notificationRow ' + (item.readAt ? 'read' : 'unread')} key={item.id}><div className="notificationIcon"><Bell size={17} /><div><strong>{item.title}</strong><span>{item.body}</span><small>{formatDate(item.createdAt)}</small></div></div>{!item.readAt && <button className="textButton" onClick={() => markRead(item.id)}>MARK READ</button>}</article>)}{!notifications.length && <p className="emptyState">You are all caught up.</p>}</div>
          </section>}
        </>
      )}

      {notice && !user && <div className={'notice ' + noticeKind} role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
      <footer><span>APEXNOVA / FREE FIRE + BGMI</span><span><WalletCards size={14} /> PAYMENTS ARE MOCKED — NO REAL MONEY MOVES</span></footer>
    </main>
  );
}
