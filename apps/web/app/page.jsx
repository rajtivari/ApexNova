'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity, Award, Bell, BookOpen, Check, ChevronRight, CircleDollarSign,
  ClipboardList, Crosshair, FileCheck2, Flag, Gamepad2, Gift, HandCoins,
  LayoutDashboard, LifeBuoy, Plus, RefreshCw, ShieldCheck, Swords, Trophy,
  Users, Wallet, X
} from 'lucide-react';

const API_BASE_URL = 'https://apexnova-api.onrender.com';
const STORAGE_KEY = 'apexnova-workspace-v1';

const seed = {
  tournaments: [
    { id: 'tn-1001', name: 'EMBER CLASH // OPEN #04', game: 'FREE FIRE', format: 'BATTLE ROYALE', status: 'REGISTRATION OPEN', entryFee: 0, prizePool: 5000, startsAt: '2026-10-18T18:30:00', registrationClosesAt: '2026-10-18T17:30:00', teams: 12 },
    { id: 'tn-1002', name: 'BATTLEGROUNDS: NIGHT OPS', game: 'BGMI', format: 'SQUAD POINTS', status: 'PUBLISHED', entryFee: 0, prizePool: 3000, startsAt: '2026-10-20T19:00:00', registrationClosesAt: '2026-10-20T18:00:00', teams: 8 },
    { id: 'tn-1003', name: 'APEX NOVA WEEKLY #01', game: 'FREE FIRE', format: 'SINGLE ELIMINATION', status: 'COMPLETED', entryFee: 0, prizePool: 1500, startsAt: '2026-10-05T18:00:00', registrationClosesAt: '2026-10-05T17:00:00', teams: 16 }
  ],
  matches: [
    { id: 'mx-2101', tournament: 'EMBER CLASH // OPEN #04', round: 'Round 1', scheduledAt: '2026-10-18T18:30:00', status: 'SCHEDULED', results: [] },
    { id: 'mx-2102', tournament: 'BATTLEGROUNDS: NIGHT OPS', round: 'Round 1', scheduledAt: '2026-10-20T19:00:00', status: 'SCHEDULED', results: [] },
    { id: 'mx-2103', tournament: 'APEX NOVA WEEKLY #01', round: 'Final', scheduledAt: '2026-10-05T19:30:00', status: 'COMPLETED', results: [{ id: 'rs-1', team: 'VOID SQUAD', kills: 18, placement: 1, points: 28, status: 'APPROVED', prize: 1000 }] }
  ],
  teams: [
    { id: 'tm-01', name: 'VOID SQUAD', game: 'FREE FIRE', captain: 'Demo Captain', members: ['Demo Captain', 'NOVAxRex', 'Kairo', 'Zen'], status: 'ACTIVE' },
    { id: 'tm-02', name: 'NIGHT RAID', game: 'BGMI', captain: 'Demo Player', members: ['Demo Player', 'Rogue', 'Maverick', 'Ash'], status: 'ACTIVE' }
  ],
  wallet: { deposited: 250, rewards: 1000, pendingWithdrawal: 0, transactions: [
    { id: 'tx-1', label: 'Demo top-up', type: 'TOP-UP', amount: 250, status: 'DEMO', date: '2026-10-08' },
    { id: 'tx-2', label: 'Approved tournament reward', type: 'PRIZE REWARD', amount: 1000, status: 'APPROVED', date: '2026-10-05' }
  ] },
  certificates: [{ id: 'APX-CERT-0001', title: 'APEX NOVA WEEKLY #01', recipient: 'VOID SQUAD', placement: '1st Place', issuedAt: '2026-10-05', status: 'ISSUED' }],
  kyc: { status: 'NOT SUBMITTED', maskedId: '', note: '' },
  disputes: [{ id: 'dp-01', title: 'Score review request', match: 'APEX NOVA WEEKLY #01 · Final', reason: 'Please recheck the placement screenshot.', status: 'RESOLVED', resolution: 'Demo review completed.' }],
  notifications: [
    { id: 'nt-1', title: 'Certificate issued', body: 'Your demo certificate APX-CERT-0001 is available.', date: '2026-10-05', read: false },
    { id: 'nt-2', title: 'Tournament published', body: 'BATTLEGROUNDS: NIGHT OPS is open to view.', date: '2026-10-04', read: false }
  ],
  referralCode: 'NOVA-DEMO24'
};

const nav = [
  ['overview', 'Command Center', LayoutDashboard],
  ['tournaments', 'Tournaments', Trophy],
  ['matches', 'Matches & Results', Swords],
  ['teams', 'Teams & Squads', Users],
  ['wallet', 'Wallet & Rewards', Wallet],
  ['certificates', 'Certificates', Award],
  ['kyc', 'Identity Check', ShieldCheck],
  ['disputes', 'Disputes', LifeBuoy],
  ['referrals', 'Referrals', Gift],
  ['notifications', 'Notifications', Bell]
];

function money(value) { return '₹' + Number(value || 0).toLocaleString('en-IN'); }
function dateLabel(value) {
  if (!value) return 'Schedule pending';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Schedule pending' : date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function newId(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 8).toUpperCase(); }

export default function Home() {
  const [data, setData] = useState(seed);
  const [active, setActive] = useState('overview');
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [apiState, setApiState] = useState('checking');
  const [showTournamentForm, setShowTournamentForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [tournamentForm, setTournamentForm] = useState({ name: '', game: 'FREE FIRE', format: 'BATTLE ROYALE', startsAt: '', prizePool: '1000' });
  const [teamForm, setTeamForm] = useState({ name: '', game: 'FREE FIRE', captain: 'Demo Player' });
  const [matchForm, setMatchForm] = useState({ tournament: '', round: 'Round 1', scheduledAt: '' });
  const [topupAmount, setTopupAmount] = useState('500');
  const [withdrawAmount, setWithdrawAmount] = useState('500');
  const [kycId, setKycId] = useState('');
  const [disputeForm, setDisputeForm] = useState({ title: '', match: '', reason: '' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setData({ ...seed, ...JSON.parse(saved) });
    } catch {}
    fetch(API_BASE_URL + '/api/health', { headers: { accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('API unavailable')))
      .then((health) => setApiState(health.status === 'ok' && health.database === 'connected' ? 'online' : 'degraded'))
      .catch(() => setApiState('offline'));
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, [data]);

  function flash(text, type = 'success') {
    setNotice({ text, type });
  }
  function changeData(updater) {
    setData((current) => typeof updater === 'function' ? updater(current) : { ...current, ...updater });
  }

  const filteredTournaments = useMemo(() => data.tournaments.filter((item) => (item.name + ' ' + item.game + ' ' + item.status).toLowerCase().includes(search.toLowerCase())), [data.tournaments, search]);
  const unreadCount = data.notifications.filter((item) => !item.read).length;
  const approvedResults = data.matches.flatMap((match) => (match.results || []).filter((result) => result.status === 'APPROVED').map((result) => ({ ...result, matchName: match.tournament, matchId: match.id })));
  const totalPrizes = approvedResults.reduce((sum, result) => sum + Number(result.prize || 0), 0);

  function addTournament(event) {
    event.preventDefault();
    if (!tournamentForm.name.trim() || !tournamentForm.startsAt) return flash('Add a tournament name and start date.', 'error');
    const item = { id: newId('TN'), ...tournamentForm, name: tournamentForm.name.trim(), status: 'PUBLISHED', entryFee: 0, prizePool: Number(tournamentForm.prizePool) || 0, startsAt: new Date(tournamentForm.startsAt).toISOString(), registrationClosesAt: new Date(new Date(tournamentForm.startsAt).getTime() - 3600000).toISOString(), teams: 0 };
    changeData((current) => ({ ...current, tournaments: [item, ...current.tournaments], notifications: [{ id: newId('NT'), title: 'Tournament published', body: item.name + ' has been added in this local demo.', date: new Date().toISOString(), read: false }, ...current.notifications] }));
    setTournamentForm({ name: '', game: 'FREE FIRE', format: 'BATTLE ROYALE', startsAt: '', prizePool: '1000' });
    setShowTournamentForm(false);
    flash('Tournament added to this demo workspace.');
  }

  function addTeam(event) {
    event.preventDefault();
    if (!teamForm.name.trim()) return flash('Enter a squad name.', 'error');
    changeData((current) => ({ ...current, teams: [{ id: newId('TM'), name: teamForm.name.trim(), game: teamForm.game, captain: teamForm.captain, members: [teamForm.captain], status: 'ACTIVE' }, ...current.teams] }));
    setTeamForm({ name: '', game: 'FREE FIRE', captain: 'Demo Player' });
    setShowTeamForm(false);
    flash('Squad created locally. Invite/member management will be connected with accounts later.');
  }

  function addMatch(event) {
    event.preventDefault();
    if (!matchForm.tournament || !matchForm.scheduledAt) return flash('Choose a tournament and match time.', 'error');
    changeData((current) => ({ ...current, matches: [{ id: newId('MX'), tournament: matchForm.tournament, round: matchForm.round, scheduledAt: new Date(matchForm.scheduledAt).toISOString(), status: 'SCHEDULED', results: [] }, ...current.matches] }));
    setMatchForm({ tournament: '', round: 'Round 1', scheduledAt: '' });
    setShowMatchForm(false);
    flash('Fixture added to this local demo.');
  }

  function submitDemoResult(matchId) {
    const team = data.teams[0];
    if (!team) return flash('Create a squad first.', 'error');
    changeData((current) => ({ ...current, matches: current.matches.map((match) => match.id !== matchId ? match : { ...match, status: 'RESULT SUBMITTED', results: [...(match.results || []), { id: newId('RS'), team: team.name, kills: 8, placement: 2, points: 16, status: 'PENDING', prize: 0 }] }) }));
    flash('Demo result submitted for review. It is not public until approved.');
  }

  function approveDemoResult(matchId, resultId) {
    let issued;
    changeData((current) => {
      const matches = current.matches.map((match) => {
        if (match.id !== matchId) return match;
        return { ...match, status: 'COMPLETED', results: match.results.map((result) => {
          if (result.id !== resultId) return result;
          const prize = result.placement === 1 ? 1000 : result.placement === 2 ? 500 : 0;
          issued = prize ? { id: newId('APX-CERT'), title: match.tournament, recipient: result.team, placement: result.placement === 1 ? '1st Place' : '2nd Place', issuedAt: new Date().toISOString(), status: 'ISSUED' } : null;
          return { ...result, status: 'APPROVED', prize };
        }) };
      });
      const result = matches.find((match) => match.id === matchId)?.results.find((entry) => entry.id === resultId);
      const prize = Number(result?.prize || 0);
      const transactions = prize ? [{ id: newId('TX'), label: 'Approved tournament prize · ' + result.team, type: 'PRIZE REWARD', amount: prize, status: 'APPROVED', date: new Date().toISOString() }, ...current.wallet.transactions] : current.wallet.transactions;
      return { ...current, matches, wallet: { ...current.wallet, rewards: current.wallet.rewards + prize, transactions }, certificates: issued ? [issued, ...current.certificates] : current.certificates, notifications: [{ id: newId('NT'), title: 'Result approved', body: 'A demo match result was approved.' + (prize ? ' Prize reward credited and certificate issued.' : ''), date: new Date().toISOString(), read: false }, ...current.notifications] };
    });
    flash('Demo result approved.' + (issued ? ' Reward and certificate added.' : ''));
  }

  function topup(event) {
    event.preventDefault();
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 100000) return flash('Enter a demo top-up between ₹1 and ₹1,00,000.', 'error');
    changeData((current) => ({ ...current, wallet: { ...current.wallet, deposited: current.wallet.deposited + amount, transactions: [{ id: newId('TX'), label: 'Simulated demo top-up', type: 'TOP-UP', amount, status: 'DEMO ONLY', date: new Date().toISOString() }, ...current.wallet.transactions] } }));
    flash('Demo balance topped up locally. No payment was processed.');
  }

  function withdraw(event) {
    event.preventDefault();
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) return flash('Enter a valid withdrawal amount.', 'error');
    if (amount > data.wallet.rewards) return flash('Withdrawals are limited to approved tournament rewards. Your available reward balance is ' + money(data.wallet.rewards) + '.', 'error');
    changeData((current) => ({ ...current, wallet: { ...current.wallet, rewards: current.wallet.rewards - amount, pendingWithdrawal: current.wallet.pendingWithdrawal + amount, transactions: [{ id: newId('TX'), label: 'Reward withdrawal request (demo)', type: 'WITHDRAWAL REQUEST', amount: -amount, status: 'PENDING APPROVAL', date: new Date().toISOString() }, ...current.wallet.transactions] }, notifications: [{ id: newId('NT'), title: 'Withdrawal requested', body: money(amount) + ' reward withdrawal is pending admin approval in this demo.', date: new Date().toISOString(), read: false }, ...current.notifications] }));
    flash('Withdrawal request queued for approval in this demo. No money has moved.');
  }

  function submitKyc(event) {
    event.preventDefault();
    const digits = kycId.replace(/\D/g, '');
    if (digits.length !== 12) return flash('For this mock KYC demo, enter exactly 12 digits.', 'error');
    changeData((current) => ({ ...current, kyc: { status: 'PENDING REVIEW', maskedId: '•••• •••• ' + digits.slice(-4), note: 'Mock review only. No government verification is performed.' } }));
    setKycId('');
    flash('Mock KYC submitted. Only the final four digits are shown.');
  }

  function submitDispute(event) {
    event.preventDefault();
    if (!disputeForm.title.trim() || !disputeForm.reason.trim()) return flash('Add a dispute title and reason.', 'error');
    changeData((current) => ({ ...current, disputes: [{ id: newId('DP'), ...disputeForm, status: 'OPEN', resolution: '' }, ...current.disputes], notifications: [{ id: newId('NT'), title: 'Dispute opened', body: disputeForm.title, date: new Date().toISOString(), read: false }, ...current.notifications] }));
    setDisputeForm({ title: '', match: '', reason: '' });
    flash('Dispute recorded in the local demo.');
  }

  function markRead(id) {
    changeData((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === id ? { ...item, read: true } : item) }));
  }

  function downloadCertificate(cert) {
    const content = '<!doctype html><html><head><meta charset="utf-8"><title>' + cert.id + '</title><style>body{font-family:Georgia,serif;background:#0b0e0c;color:#e8e6de;display:grid;place-items:center;min-height:100vh;margin:0}.cert{border:6px double #ff5a1f;padding:56px;text-align:center;max-width:780px;margin:24px}h1{font-size:42px;letter-spacing:4px}small{color:#29f0c6;letter-spacing:3px}p{font-size:20px;line-height:1.8}.id{font:12px monospace;color:#a2ab92}</style></head><body><main class="cert"><small>APEXNOVA · DEMO CERTIFICATE</small><h1>CERTIFICATE OF ACHIEVEMENT</h1><p>This certificate is presented to<br><strong>' + cert.recipient + '</strong><br>for achieving <strong>' + cert.placement + '</strong><br>in <strong>' + cert.title + '</strong>.</p><p class="id">' + cert.id + ' · Issued ' + dateLabel(cert.issuedAt) + '</p><small>PORTFOLIO DEMO · NOT AN OFFICIAL AWARD</small></main><script>window.print()</script></body></html>';
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = cert.id + '.html';
    link.click();
    URL.revokeObjectURL(url);
  }

  const section = nav.find(([id]) => id === active);

  return (
    <main className="appShell">
      <aside className="sideRail">
        <button className="brand brandButton" onClick={() => setActive('overview')}><Crosshair size={22} /><span>APEX<span className="ember">NOVA</span><small>COMPETITIVE NETWORK</small></span></button>
        <div className="railLabel">OPERATIONS</div>
        <nav className="sideNav" aria-label="Main navigation">
          {nav.map(([id, label, Icon]) => <button key={id} className={active === id ? 'selected' : ''} onClick={() => setActive(id)}><Icon size={17} /><span>{label}</span>{id === 'notifications' && unreadCount > 0 && <i>{unreadCount}</i>}</button>)}
        </nav>
        <div className="railFoot"><span className="pulse" /> DEMO WORKSPACE <small>AUTH + ROLE PANELS COMING LATER</small></div>
      </aside>

      <div className="appMain">
        <header className="appTopbar">
          <div><p className="eyebrow">APEXNOVA / OPERATIONS CONSOLE</p><h1>{section?.[1] || 'Command Center'}</h1></div>
          <div className="topActions"><span className={'apiPill ' + apiState}><i />{apiState === 'online' ? 'API ONLINE' : apiState === 'checking' ? 'CHECKING API' : apiState === 'degraded' ? 'API DEGRADED' : 'DEMO DATA MODE'}</span><button className="squareButton" title="Open notifications" onClick={() => setActive('notifications')}><Bell size={18} />{unreadCount > 0 && <i>{unreadCount}</i>}</button></div>
        </header>

        {notice.text && <div className={'notice ' + notice.type} role="status"><span>{notice.text}</span><button aria-label="Dismiss notification" onClick={() => setNotice({ text: '', type: '' })}><X size={16} /></button></div>}
        {apiState === 'offline' && <div className="demoBanner"><Activity size={16} /><span>API is not reachable from this browser. Showing seeded demo records. Changes save only in this browser and do not affect the server.</span></div>}
        {apiState === 'online' && <div className="demoBanner"><ShieldCheck size={16} /><span>API health is online. This feature workspace still uses local demo records until each workflow is connected and authenticated.</span></div>}

        {active === 'overview' && <section className="contentArea">
          <div className="welcomeBand"><div><p className="eyebrow">MISSION CONTROL / 01</p><h2>MAKE YOUR<br /><span>OWN LEGACY.</span></h2><p>One console for tournaments, squads, results, rewards, and player services.</p><div className="welcomeActions"><button className="primaryButton" onClick={() => setActive('tournaments')}><Trophy size={16} /> EXPLORE TOURNAMENTS</button><button className="secondaryButton" onClick={() => setActive('wallet')}><Wallet size={16} /> WALLET & REWARDS</button></div></div><div className="welcomeSigil"><Crosshair size={88} strokeWidth={0.8} /><span>APX / 001</span></div></div>
          <div className="metricGrid"><Metric icon={Trophy} label="TOURNAMENTS" value={data.tournaments.length} note="DEMO RECORDS" /><Metric icon={Swords} label="MATCH FIXTURES" value={data.matches.length} note="SCHEDULED + FINISHED" /><Metric icon={Users} label="SQUADS" value={data.teams.length} note="LOCAL DEMO TEAMS" /><Metric icon={CircleDollarSign} label="APPROVED REWARDS" value={money(data.wallet.rewards)} note="REWARD BALANCE ONLY" /></div>
          <div className="contentGrid"><section className="panel"><PanelTitle eyebrow="COMPETITION FEED" title="Upcoming tournaments" action="VIEW ALL" onAction={() => setActive('tournaments')} /><div className="compactList">{data.tournaments.filter((t) => t.status !== 'COMPLETED').slice(0, 4).map((item) => <div className="compactRow" key={item.id}><div className="gameBadge">{item.game === 'BGMI' ? 'BG' : 'FF'}</div><div className="compactMain"><strong>{item.name}</strong><small>{item.game} · {item.format}</small></div><div className="compactRight"><strong>{money(item.prizePool)}</strong><small>{item.status}</small></div></div>)}</div></section>
          <section className="panel"><PanelTitle eyebrow="PLAYER SERVICES" title="Quick launch" /><div className="quickGrid"><Quick icon={Users} label="Create squad" onClick={() => { setActive('teams'); setShowTeamForm(true); }} /><Quick icon={ClipboardList} label="Open dispute" onClick={() => setActive('disputes')} /><Quick icon={Award} label="Certificates" onClick={() => setActive('certificates')} /><Quick icon={Bell} label="Notifications" onClick={() => setActive('notifications')} /></div><div className="panelFoot"><span>REWARDS AWARDED</span><strong>{money(totalPrizes)}</strong><small>Based on approved demo results</small></div></section></div>
          <section className="panel"><PanelTitle eyebrow="RECENT ACTIVITY" title="Latest notifications" action="OPEN INBOX" onAction={() => setActive('notifications')} /><div className="compactList">{data.notifications.slice(0, 3).map((item) => <div className="compactRow" key={item.id}><div className="miniIcon"><Bell size={16} /></div><div className="compactMain"><strong>{item.title}</strong><small>{item.body}</small></div><small>{item.read ? 'READ' : 'NEW'}</small></div>)}</div></section>
        </section>}

        {active === 'tournaments' && <section className="contentArea">
          <div className="sectionIntro"><div><p>FREE FIRE / BGMI</p><h2>Competition board</h2><span>Browse, publish and track demo tournaments. Paid entry is disabled in this build.</span></div><button className="primaryButton" onClick={() => setShowTournamentForm(!showTournamentForm)}><Plus size={16} /> NEW TOURNAMENT</button></div>
          {showTournamentForm && <form className="panel formGrid" onSubmit={addTournament}><h3>CREATE TOURNAMENT <button type="button" className="closeButton" onClick={() => setShowTournamentForm(false)}><X size={16} /></button></h3><label>TOURNAMENT NAME<input value={tournamentForm.name} onChange={(e) => setTournamentForm({ ...tournamentForm, name: e.target.value })} placeholder="e.g. EMBER CLASH #05" required /></label><label>GAME<select value={tournamentForm.game} onChange={(e) => setTournamentForm({ ...tournamentForm, game: e.target.value })}><option>FREE FIRE</option><option>BGMI</option></select></label><label>FORMAT<select value={tournamentForm.format} onChange={(e) => setTournamentForm({ ...tournamentForm, format: e.target.value })}><option>BATTLE ROYALE</option><option>SINGLE ELIMINATION</option><option>DOUBLE ELIMINATION</option><option>ROUND ROBIN</option><option>SQUAD POINTS</option></select></label><label>START TIME<input type="datetime-local" value={tournamentForm.startsAt} onChange={(e) => setTournamentForm({ ...tournamentForm, startsAt: e.target.value })} required /></label><label>PRIZE POOL (DEMO ₹)<input type="number" min="0" max="10000000" value={tournamentForm.prizePool} onChange={(e) => setTournamentForm({ ...tournamentForm, prizePool: e.target.value })} /></label><button className="primaryButton" type="submit"><Check size={16} /> SAVE TO DEMO WORKSPACE</button></form>}
          <div className="filterBar"><div className="searchBox"><Activity size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tournaments, game, status..." /></div><span>{filteredTournaments.length} RECORDS</span></div>
          <div className="tournamentGrid">{filteredTournaments.map((item) => <article className="tournamentCard" key={item.id}><div className="cardTop"><span className="gameTag">{item.game}</span><span className={'statusTag ' + item.status.toLowerCase().replaceAll(' ', '-')}>{item.status}</span></div><p className="moduleIndex">{item.format} / {item.id}</p><h3>{item.name}</h3><div className="prizeBand"><div><small>PRIZE POOL</small><strong>{money(item.prizePool)}</strong></div><div><small>ENTRY</small><strong>FREE</strong></div></div><div className="cardFacts"><span><Users size={14} /> {item.teams || 0} squads</span><span><Activity size={14} /> {dateLabel(item.startsAt)}</span></div><div className="cardActions"><button className="secondaryButton" onClick={() => { setMatchForm({ ...matchForm, tournament: item.name }); setActive('matches'); setShowMatchForm(true); }}>SCHEDULE MATCH</button><button className="iconAction" title="Mark completed in demo" onClick={() => { changeData((current) => ({ ...current, tournaments: current.tournaments.map((t) => t.id === item.id ? { ...t, status: t.status === 'COMPLETED' ? 'PUBLISHED' : 'COMPLETED' } : t) })); flash('Tournament status changed in local demo.'); }}><Flag size={15} /></button></div></article>)}{!filteredTournaments.length && <Empty title="No matching tournaments" text="Change the search or create a demo tournament." />}</div>
        </section>}

        {active === 'matches' && <section className="contentArea"><div className="sectionIntro"><div><p>FIXTURES / SCORING / APPROVALS</p><h2>Matches & results</h2><span>Submit sample results, then approve them to demonstrate reward and certificate issuance.</span></div><button className="primaryButton" onClick={() => setShowMatchForm(!showMatchForm)}><Plus size={16} /> ADD FIXTURE</button></div>
          {showMatchForm && <form className="panel formGrid" onSubmit={addMatch}><h3>SCHEDULE A MATCH <button type="button" className="closeButton" onClick={() => setShowMatchForm(false)}><X size={16} /></button></h3><label>TOURNAMENT<select required value={matchForm.tournament} onChange={(e) => setMatchForm({ ...matchForm, tournament: e.target.value })}><option value="">Select tournament</option>{data.tournaments.map((t) => <option key={t.id}>{t.name}</option>)}</select></label><label>ROUND<input value={matchForm.round} onChange={(e) => setMatchForm({ ...matchForm, round: e.target.value })} required /></label><label>SCHEDULED AT<input type="datetime-local" value={matchForm.scheduledAt} onChange={(e) => setMatchForm({ ...matchForm, scheduledAt: e.target.value })} required /></label><button className="primaryButton" type="submit"><Check size={16} /> SAVE FIXTURE</button></form>}
          <div className="matchList">{data.matches.map((match) => <article className="panel matchCard" key={match.id}><div className="matchHeader"><div><span className="moduleIndex">{match.round} / {match.id}</span><h3>{match.tournament}</h3><small>{dateLabel(match.scheduledAt)}</small></div><span className="statusTag">{match.status}</span></div><div className="matchResults">{(match.results || []).map((result) => <div className="matchResult" key={result.id}><div><strong>{result.team}</strong><small>{result.kills} kills · placement #{result.placement} · {result.points} points</small></div><span className={'statusTag ' + result.status.toLowerCase()}>{result.status}</span>{result.status === 'PENDING' && <button className="primaryButton smallButton" onClick={() => approveDemoResult(match.id, result.id)}>APPROVE DEMO RESULT</button>}{result.status === 'APPROVED' && <span className="rewardText">PRIZE {money(result.prize || 0)}</span>}</div>)}{!(match.results || []).length && <p className="emptyInline">No results submitted yet.</p>}</div><div className="actionRow"><button className="secondaryButton" onClick={() => submitDemoResult(match.id)}><ClipboardList size={14} /> SUBMIT SAMPLE RESULT</button><span className="fieldNote">Demo action · approval issues prize/certificate if eligible</span></div></article>)}{!data.matches.length && <Empty title="No fixtures yet" text="Add a fixture to start a local demo match workflow." />}</div>
        </section>}

        {active === 'teams' && <section className="contentArea"><div className="sectionIntro"><div><p>SQUAD MANAGEMENT</p><h2>Teams & squads</h2><span>Create local demo squads. Account membership and invitations are part of the later authentication phase.</span></div><button className="primaryButton" onClick={() => setShowTeamForm(!showTeamForm)}><Plus size={16} /> CREATE SQUAD</button></div>
          {showTeamForm && <form className="panel formGrid" onSubmit={addTeam}><h3>NEW SQUAD <button type="button" className="closeButton" onClick={() => setShowTeamForm(false)}><X size={16} /></button></h3><label>SQUAD NAME<input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="Your squad name" required /></label><label>GAME<select value={teamForm.game} onChange={(e) => setTeamForm({ ...teamForm, game: e.target.value })}><option>FREE FIRE</option><option>BGMI</option></select></label><label>CAPTAIN DISPLAY NAME<input value={teamForm.captain} onChange={(e) => setTeamForm({ ...teamForm, captain: e.target.value })} required /></label><button className="primaryButton" type="submit"><Check size={16} /> CREATE DEMO SQUAD</button></form>}
          <div className="teamGrid">{data.teams.map((team) => <article className="panel teamCard" key={team.id}><div className="teamEmblem"><Users size={26} /></div><div className="teamIdentity"><span className="gameTag">{team.game}</span><h3>{team.name}</h3><small>CAPTAIN / {team.captain}</small></div><span className="statusTag">{team.status}</span><div className="memberList">{team.members.map((member, index) => <div key={member}><span className="memberNumber">{String(index + 1).padStart(2, '0')}</span>{member}{index === 0 && <small>CAPTAIN</small>}</div>)}</div><div className="panelFoot"><span>SQUAD ID</span><strong>{team.id}</strong></div></article>)}</div>
        </section>}

        {active === 'wallet' && <section className="contentArea"><div className="sectionIntro"><div><p>LEDGER / PRIZE ACCOUNTING</p><h2>Wallet & rewards</h2><span>Simulation only. Top-ups are not payments. Only approved tournament reward balance can be requested for withdrawal.</span></div><span className="demoChip">DEMO LEDGER</span></div>
          <div className="walletGrid"><div className="walletHero"><span><Wallet size={18} /> TOTAL DEMO BALANCE</span><strong>{money(data.wallet.deposited + data.wallet.rewards)}</strong><div className="walletSplit"><div><small>TOP-UP BALANCE</small><strong>{money(data.wallet.deposited)}</strong><em>NOT WITHDRAWABLE</em></div><div><small>APPROVED REWARDS</small><strong>{money(data.wallet.rewards)}</strong><em>ELIGIBLE FOR REQUEST</em></div></div></div><div className="walletStat"><span>PENDING WITHDRAWAL</span><strong>{money(data.wallet.pendingWithdrawal)}</strong><small>AWAITING DEMO APPROVAL</small><div className="walletIcon"><HandCoins size={30} /></div></div></div>
          <div className="walletForms"><form className="panel moneyForm" onSubmit={topup}><h3><Plus size={18} /> DEMO TOP-UP</h3><p>Increase the simulated deposit balance. This does not charge a card or process a real payment.</p><label>AMOUNT (₹)<input type="number" min="1" max="100000" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} required /></label><button className="primaryButton" type="submit">ADD DEMO FUNDS</button></form><form className="panel moneyForm" onSubmit={withdraw}><h3><HandCoins size={18} /> REWARD WITHDRAWAL</h3><p>Only the approved prize-reward balance is eligible. Top-ups are excluded.</p><label>AMOUNT (₹)<input type="number" min="1" max="1000000" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} required /></label><button className="primaryButton" type="submit">REQUEST APPROVAL</button><small className="fieldNote">Available reward balance: {money(data.wallet.rewards)}</small></form></div>
          <section className="panel"><PanelTitle eyebrow="TRANSACTION HISTORY" title="Ledger entries" /><div className="ledger">{data.wallet.transactions.map((tx) => <div className="ledgerRow" key={tx.id}><div className="ledgerIcon"><CircleDollarSign size={17} /></div><div className="ledgerMain"><strong>{tx.label}</strong><small>{tx.type} · {tx.date}</small></div><strong className={tx.amount < 0 ? 'negativeAmount' : 'positiveAmount'}>{tx.amount < 0 ? '−' : '+'}{money(Math.abs(tx.amount))}</strong><span className="statusTag">{tx.status}</span></div>)}</div></section>
        </section>}

        {active === 'certificates' && <section className="contentArea"><div className="sectionIntro"><div><p>ACHIEVEMENTS / VERIFICATION</p><h2>Certificates</h2><span>Certificates appear after an eligible demo result is approved. Download a printable HTML certificate for the portfolio demo.</span></div><span className="demoChip"><Award size={14} /> {data.certificates.length} ISSUED</span></div><div className="certificateGrid">{data.certificates.map((cert) => <article className="certificateCard" key={cert.id}><div className="certificateArt"><Award size={42} /><span>APEXNOVA</span><strong>ACHIEVEMENT<br />CERTIFICATE</strong><small>{cert.placement}</small></div><div className="certificateInfo"><span className="statusTag">{cert.status}</span><h3>{cert.title}</h3><p>Issued to <strong>{cert.recipient}</strong></p><small>{cert.id} · {dateLabel(cert.issuedAt)}</small><button className="primaryButton" onClick={() => downloadCertificate(cert)}><FileCheck2 size={16} /> DOWNLOAD CERTIFICATE</button></div></article>)}{!data.certificates.length && <Empty title="No certificates issued" text="Approve an eligible demo match result to generate one." />}</div></section>}

        {active === 'kyc' && <section className="contentArea"><div className="sectionIntro"><div><p>PLAYER IDENTITY / MOCK REVIEW</p><h2>Identity check</h2><span>This is a mock portfolio flow only. Do not enter real Aadhaar or other sensitive identity data.</span></div><span className="demoChip">SIMULATED KYC</span></div><div className="kycLayout"><section className="panel kycPanel"><div className="kycIcon"><ShieldCheck size={36} /></div><h3>Identity review status</h3><span className="statusTag">{data.kyc.status}</span><p>{data.kyc.maskedId || 'No mock identity submitted.'}</p><small>{data.kyc.note || 'No real identity documents are collected in this demo.'}</small><div className="securityList"><span><Check size={15} /> Masked identifier display</span><span><Check size={15} /> Review state demonstration</span><span><X size={15} /> No government verification</span></div></section><form className="panel moneyForm" onSubmit={submitKyc}><h3>SUBMIT MOCK ID</h3><p>Use a made-up 12-digit number only. No document uploads are enabled in this public demo.</p><label>MOCK 12-DIGIT NUMBER<input inputMode="numeric" value={kycId} onChange={(e) => setKycId(e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="000000000000" maxLength={12} required /></label><button className="primaryButton" type="submit">SUBMIT FOR DEMO REVIEW</button><small className="fieldNote warning">Never enter your actual Aadhaar number here.</small></form></div></section>}

        {active === 'disputes' && <section className="contentArea"><div className="sectionIntro"><div><p>RESULT REVIEW / EVIDENCE</p><h2>Dispute center</h2><span>Record a sample dispute and track its local demo status.</span></div><span className="demoChip">{data.disputes.filter((item) => item.status === 'OPEN').length} OPEN</span></div><div className="contentGrid"><form className="panel moneyForm" onSubmit={submitDispute}><h3><LifeBuoy size={18} /> OPEN A DISPUTE</h3><label>SUBJECT<input value={disputeForm.title} onChange={(e) => setDisputeForm({ ...disputeForm, title: e.target.value })} placeholder="Score or placement review" required /></label><label>RELATED MATCH<select value={disputeForm.match} onChange={(e) => setDisputeForm({ ...disputeForm, match: e.target.value })}><option value="">Choose a match (optional)</option>{data.matches.map((match) => <option key={match.id}>{match.tournament} · {match.round}</option>)}</select></label><label>REASON<textarea rows={4} value={disputeForm.reason} onChange={(e) => setDisputeForm({ ...disputeForm, reason: e.target.value })} placeholder="Explain what should be reviewed..." required /></label><button className="primaryButton" type="submit">SUBMIT DEMO DISPUTE</button></form><section className="panel"><PanelTitle eyebrow="CASE REGISTER" title="Recent disputes" /><div className="compactList">{data.disputes.map((item) => <div className="disputeRow" key={item.id}><div><strong>{item.title}</strong><small>{item.match || 'Match not specified'} · {item.reason}</small>{item.resolution && <p>{item.resolution}</p>}</div><span className={'statusTag ' + item.status.toLowerCase()}>{item.status}</span></div>)}{!data.disputes.length && <Empty title="No disputes" text="New cases will appear here." />}</div></section></div></section>}

        {active === 'referrals' && <section className="contentArea"><div className="sectionIntro"><div><p>COMMUNITY / INVITE PROGRAM</p><h2>Referral network</h2><span>Referral rewards are placeholders in this demo. No bonus is credited until the trigger and anti-abuse rules are implemented server-side.</span></div><span className="demoChip"><Gift size={14} /> INVITE SYSTEM</span></div><div className="referralHero panel"><div className="referralSymbol"><Gift size={36} /></div><p className="eyebrow">YOUR DEMO REFERRAL CODE</p><strong>{data.referralCode}</strong><p>Share this sample code with friends when account registration is introduced.</p><button className="primaryButton" onClick={() => { navigator.clipboard?.writeText(data.referralCode).then(() => flash('Demo referral code copied.')).catch(() => flash('Referral code: ' + data.referralCode)); }}><ClipboardList size={16} /> COPY REFERRAL CODE</button></div><div className="metricGrid referralMetrics"><Metric icon={Users} label="INVITES" value="00" note="DEMO ONLY" /><Metric icon={Gift} label="BONUS EARNED" value="₹0" note="NOT CREDITED" /><Metric icon={ShieldCheck} label="PROGRAM STATUS" value="PREVIEW" note="SERVER RULES PENDING" /></div></section>}

        {active === 'notifications' && <section className="contentArea"><div className="sectionIntro"><div><p>INBOX / SYSTEM EVENTS</p><h2>Notifications</h2><span>Local demo notifications for tournament, wallet, and certificate activity.</span></div><button className="secondaryButton" onClick={() => changeData((current) => ({ ...current, notifications: current.notifications.map((item) => ({ ...item, read: true })) }))}><Check size={15} /> MARK ALL READ</button></div><div className="notificationList">{data.notifications.map((item) => <article className={'panel notificationCard ' + (item.read ? 'read' : 'unread')} key={item.id}><div className="notificationSymbol"><Bell size={19} /></div><div><h3>{item.title}</h3><p>{item.body}</p><small>{dateLabel(item.date)}</small></div>{!item.read && <button className="secondaryButton" onClick={() => markRead(item.id)}>MARK READ</button>}</article>)}{!data.notifications.length && <Empty title="Inbox clear" text="No notifications yet." />}</div></section>}

        <footer className="appFooter"><span>APEXNOVA / FREE FIRE + BGMI</span><span><Gamepad2 size={14} /> INTERACTIVE DEMO · LOCAL BROWSER STORAGE</span><button onClick={() => { if (window.confirm('Reset all demo data in this browser to the original sample?')) { setData(seed); setNotice({ text: 'Demo workspace reset.', type: 'success' }); } }}>RESET DEMO DATA</button></footer>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value, note }) {
  return <div className="metric"><div className="metricTop"><Icon size={16} /><span>{label}</span></div><strong>{value}</strong><small>{note}</small></div>;
}
function PanelTitle({ eyebrow, title, action, onAction }) {
  return <div className="panelTitle"><div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div>{action && <button className="textButton" onClick={onAction}>{action} <ChevronRight size={14} /></button>}</div>;
}
function Quick({ icon: Icon, label, onClick }) {
  return <button className="quickAction" onClick={onClick}><Icon size={19} /><span>{label}</span><ChevronRight size={14} /></button>;
}
function Empty({ title, text }) {
  return <div className="emptyPanel"><BookOpen size={24} /><strong>{title}</strong><span>{text}</span></div>;
}
