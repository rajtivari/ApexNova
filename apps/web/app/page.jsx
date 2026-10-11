'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, ChevronRight, Crosshair, RefreshCw, Trophy } from 'lucide-react';

const API_BASE_URL = 'https://apexnova-api.onrender.com';

async function publicRequest(path) {
  const response = await fetch(API_BASE_URL + path, { headers: { accept: 'application/json' } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to load public tournament data.');
  return data;
}

function formatDate(value) {
  if (!value) return 'Schedule pending';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Schedule pending' : date.toLocaleString();
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadPublicData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [tournamentData, matchData] = await Promise.all([
        publicRequest('/api/tournaments'),
        publicRequest('/api/matches'),
      ]);
      setTournaments(Array.isArray(tournamentData) ? tournamentData : []);
      setMatches(Array.isArray(matchData) ? matchData : []);
    } catch (err) {
      setError(err.message || 'Could not load tournament data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  const tabs = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'tournaments', label: 'TOURNAMENTS' },
    { id: 'matches', label: 'MATCHES & RESULTS' },
  ];

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><Crosshair size={20} /><span>APEX<span className="ember">NOVA</span></span></div>
        <div className="status"><span className={error ? 'pulse offline' : 'pulse'} />PUBLIC TOURNAMENT BOARD<span className="divider" />READ ONLY</div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">APEXNOVA / COMPETITION BOARD</p>
          <h1>ENTER<br />THE ARENA.</h1>
          <p className="lede">Follow Free Fire and BGMI tournaments, fixtures, and published match results. No account required.</p>
        </div>
        <div className="heroMark"><Trophy size={42} /><span>OPEN ACCESS</span></div>
      </section>

      <nav className="roleTabs" aria-label="Public sections">
        {tabs.map((tab) => (
          <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
        <button className="refreshButton" onClick={() => loadPublicData(true)} disabled={refreshing || loading}><RefreshCw size={15} /> {refreshing ? 'REFRESHING…' : 'REFRESH'}</button>
      </nav>

      <section className="stats">
        <div className="stat"><span>TOURNAMENTS</span><strong>{String(tournaments.length).padStart(2, '0')}</strong><small>PUBLIC RECORDS</small></div>
        <div className="stat"><span>MATCHES</span><strong>{String(matches.length).padStart(2, '0')}</strong><small>FIXTURES + RESULTS</small></div>
        <div className="stat"><span>ACCESS</span><strong>OPEN</strong><small>NO SIGN IN REQUIRED</small></div>
      </section>

      {error && <div className="notice error" role="alert"><span>{error}</span><button onClick={() => loadPublicData(true)} aria-label="Retry loading">RETRY</button></div>}
      {loading && <section className="workspace"><p className="emptyState">Loading public tournament data…</p></section>}

      {!loading && activeTab === 'overview' && (
        <section className="workspace">
          <div className="sectionHeading"><div><p className="eyebrow">LIVE MODULES</p><h2>Competition overview</h2></div><span className="mono">{refreshing ? 'SYNCING…' : 'PUBLIC DATA'}</span></div>
          <div className="moduleGrid">
            <button className="module moduleButton" onClick={() => setActiveTab('tournaments')}><div className="moduleIcon"><Trophy /></div><div><p className="moduleIndex">01 // TOURNAMENTS</p><h3>Competition board</h3><p>Browse schedules, game formats, entry fees, and prize pools.</p></div><ChevronRight className="arrow" size={18} /></button>
            <button className="module moduleButton" onClick={() => setActiveTab('matches')}><div className="moduleIcon"><Activity /></div><div><p className="moduleIndex">02 // MATCHES</p><h3>Fixtures & results</h3><p>Review match schedules, scores, and published standings.</p></div><ChevronRight className="arrow" size={18} /></button>
          </div>
          <div className="sectionHeading listHeading"><div><p className="eyebrow">NEXT UP</p><h2>Upcoming tournaments</h2></div><button className="textButton" onClick={() => setActiveTab('tournaments')}>VIEW ALL <ChevronRight size={14} /></button></div>
          <div className="dataList">
            {tournaments.slice(0, 4).map((item) => <article className="dataRow" key={item.id}><div><strong>{item.name}</strong><span>{item.game.replaceAll('_', ' ')} · {item.format.replaceAll('_', ' ')}</span></div><div className="rowMeta"><span className="statusTag">{item.status.replaceAll('_', ' ')}</span><span>{formatDate(item.startsAt)}</span></div></article>)}
            {!tournaments.length && <p className="emptyState">No tournaments are published yet.</p>}
          </div>
        </section>
      )}

      {!loading && activeTab === 'tournaments' && (
        <section className="workspace">
          <div className="sectionHeading"><div><p className="eyebrow">COMPETITION BOARD</p><h2>Tournaments</h2></div><span className="mono">{tournaments.length} RECORDS</span></div>
          <div className="dataList">
            {tournaments.map((item) => <article className="dataCard" key={item.id}>
              <div className="dataCardHead"><div><p className="moduleIndex">{item.game.replaceAll('_', ' ')} / {item.format.replaceAll('_', ' ')}</p><h3>{item.name}</h3></div><span className="statusTag">{item.status.replaceAll('_', ' ')}</span></div>
              <div className="dataFacts"><span>{formatDate(item.startsAt)}</span><span>{item._count?.registrations || 0} registrations</span><span>Entry fee: {Number(item.entryFee) > 0 ? '₹' + Number(item.entryFee) : 'Free'}</span><span>Prize pool: ₹{Number(item.prizePool || 0)}</span></div>
            </article>)}
            {!tournaments.length && <p className="emptyState">No tournaments found.</p>}
          </div>
        </section>
      )}

      {!loading && activeTab === 'matches' && (
        <section className="workspace">
          <div className="sectionHeading"><div><p className="eyebrow">MATCH OPERATIONS</p><h2>Fixtures & results</h2></div><span className="mono">{matches.length} MATCHES</span></div>
          <div className="dataList">
            {matches.map((match) => <article className="dataCard" key={match.id}>
              <div className="dataCardHead"><div><p className="moduleIndex">ROUND {match.round}</p><h3>Match {match.id.slice(0, 8)}</h3></div><span className="rowDate">{formatDate(match.scheduledAt)}</span></div>
              <div className="resultList">
                {(match.results || []).filter((result) => result.status === 'APPROVED').map((result) => <div className="resultRow" key={result.id}><span>Team {result.teamId.slice(0, 8)}</span><span>{result.kills} kills</span><span>{result.totalPoints} pts</span><span className="statusTag">PUBLISHED</span></div>)}
                {!(match.results || []).some((result) => result.status === 'APPROVED') && <p className="emptyState">No results published yet.</p>}
              </div>
            </article>)}
            {!matches.length && <p className="emptyState">No matches are scheduled yet.</p>}
          </div>
        </section>
      )}

      <footer><span>APEXNOVA / FREE FIRE + BGMI</span><span><Trophy size={14} /> PUBLIC READ-ONLY MODE · NO ACCOUNT ACTIONS</span></footer>
    </main>
  );
}
