'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Gamepad2, Menu, Search, ShieldCheck, Trophy, Users, Wallet, X, Zap } from 'lucide-react';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://apexnova-api.onrender.com').replace(/\/$/, '');
const LOGIN_URL = '/ApexNova/login/';
const money = (value) => '₹' + Number(value || 0).toLocaleString('en-IN');

function normalizeTournament(item) {
  const start = new Date(item.startsAt);
  return {
    id: item.id,
    name: item.name,
    game: item.game === 'FREE_FIRE' ? 'FREE FIRE' : item.game,
    format: String(item.format || 'TOURNAMENT').replaceAll('_', ' '),
    status: String(item.status || 'SCHEDULED').replaceAll('_', ' '),
    fee: Number(item.entryFee || 0),
    prize: Number(item.prizePool || 0),
    date: Number.isNaN(start.getTime()) ? 'Schedule to be announced' : start.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
  };
}

export default function Home() {
  const [tournaments, setTournaments] = useState([]);
  const [feedState, setFeedState] = useState('loading');
  const [game, setGame] = useState('ALL');
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(API_BASE_URL + '/api/tournaments', { headers: { Accept: 'application/json' } })
      .then((response) => { if (!response.ok) throw new Error('Tournament service unavailable'); return response.json(); })
      .then((items) => {
        if (!active) return;
        setTournaments(Array.isArray(items) ? items.map(normalizeTournament) : []);
        setFeedState('online');
      })
      .catch(() => { if (active) setFeedState('offline'); });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => tournaments.filter((item) => {
    const gameMatches = game === 'ALL' || item.game === game;
    const textMatches = (item.name + ' ' + item.game + ' ' + item.format).toLowerCase().includes(query.toLowerCase());
    return gameMatches && textMatches;
  }), [tournaments, game, query]);

  const nextEvent = tournaments.find((item) => ['REGISTRATION_OPEN', 'PUBLISHED', 'LIVE'].includes(item.status));

  return (
    <main className="arena-site">
      <div className="arena-topline">
        <span><i className={'arena-status-dot ' + (feedState === 'online' ? 'is-live' : '')}/>{feedState === 'online' ? 'ARENA CONNECTED' : feedState === 'loading' ? 'CONNECTING TO ARENA' : 'MATCH FEED OFFLINE'}</span>
        <span>FREE FIRE <b>·</b> BGMI <b>·</b> INDIA</span>
      </div>

      <header className="arena-nav">
        <a className="arena-brand" href="/ApexNova/" aria-label="ApexNova home"><span className="arena-brand-mark"><Zap size={21} fill="currentColor"/></span><span>APEX<span>NOVA</span><small>COMPETITIVE GAMING</small></span></a>
        <button className="arena-menu-toggle" aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button>
        <nav className={menuOpen ? 'arena-nav-links is-open' : 'arena-nav-links'}>
          <a href="#matches" onClick={() => setMenuOpen(false)}>Matches</a>
          <a href="#how-to-play" onClick={() => setMenuOpen(false)}>How it works</a>
          <a href="#rewards" onClick={() => setMenuOpen(false)}>Rewards</a>
        </nav>
        <div className="arena-nav-actions"><a className="arena-login-link" href={LOGIN_URL}>Sign in</a><a className="arena-cta-button" href={LOGIN_URL}>Create player ID <ArrowRight size={16}/></a></div>
      </header>

      <section className="arena-hero">
        <div className="arena-hero-copy">
          <p className="arena-eyebrow"><span>APEXNOVA / 01</span> YOUR NEXT MATCH STARTS HERE</p>
          <h1>PLAY FOR<br/><em>THE MOMENT.</em></h1>
          <p className="arena-hero-lede">Find your squad. Enter the lobby. Make every game count in India’s competitive Free Fire and BGMI arena.</p>
          <div className="arena-hero-actions"><a className="arena-cta-button arena-cta-large" href="#matches">Explore tournaments <ArrowRight size={18}/></a><a className="arena-text-button" href={LOGIN_URL}>Open player hub <span>↗</span></a></div>
          <div className="arena-trust-row"><span><ShieldCheck size={16}/> Reviewed results</span><span><Users size={16}/> Squad ready</span><span><Wallet size={16}/> Prize history</span></div>
        </div>
        <div className="arena-hero-visual" aria-label="ApexNova mobile esports photography">
          <figure className="arena-photo-frame arena-photo-main">
            <img src="https://images.unsplash.com/photo-1759701547448-f3f336e478cd?auto=format&fit=crop&w=1400&q=82" alt="A player focused on a mobile esports match" width="1200" height="1500" fetchPriority="high" decoding="async" />
            <div className="arena-photo-overlay"><span className="arena-photo-kicker"><i/> INDIA / MOBILE ESPORTS</span><strong>PLAY WITH<br/>PURPOSE.</strong><span className="arena-photo-games">FREE FIRE <b>·</b> BGMI</span></div>
            <a className="arena-photo-credit" href="https://unsplash.com/photos/young-man-focused-on-playing-a-mobile-game-f-v7T77L-14" target="_blank" rel="noreferrer">Photo: Alef Morais / Unsplash</a>
          </figure>
          <div className="arena-photo-rail">
            <figure className="arena-photo-frame arena-photo-secondary">
              <img src="https://images.unsplash.com/photo-1548003693-b55d51032288?auto=format&fit=crop&w=1000&q=80" alt="Two players competing at gaming stations" width="1000" height="760" loading="lazy" decoding="async" />
              <div className="arena-photo-secondary-label">SQUADS / SKILL / SHOW UP</div>
              <a className="arena-photo-credit" href="https://unsplash.com/photos/selective-focus-photography-of-two-persons-playing-game-in-front-of-monitors-lfQyS-TnqEg" target="_blank" rel="noreferrer">Photo: Alex Haney / Unsplash</a>
            </figure>
            <div className="arena-live-card">
              <div className="arena-live-card-head"><span><i className={'arena-status-dot ' + (feedState === 'online' ? 'is-live' : '')}/>{feedState === 'online' ? 'TOURNAMENT FEED' : feedState === 'loading' ? 'CONNECTING' : 'FEED OFFLINE'}</span><Gamepad2 size={17}/></div>
              {nextEvent ? <><strong>{nextEvent.name}</strong><small>{nextEvent.game} · {nextEvent.format}</small></> : <><strong>{feedState === 'offline' ? 'Matches are temporarily unavailable.' : feedState === 'loading' ? 'Checking published matches…' : 'No upcoming events listed.'}</strong><small>Only events published by the tournament desk appear here.</small></>}
              <a href="#matches">Browse matches <ArrowRight size={15}/></a>
            </div>
          </div>
        </div>
      </section>

      <section className="arena-proof-strip" aria-label="Platform highlights">
        <div><span className="arena-proof-icon"><Gamepad2 size={19}/></span><p><b>COMPETE YOUR WAY</b><small>Solo, duo, and squad formats</small></p></div>
        <div><span className="arena-proof-icon"><ShieldCheck size={19}/></span><p><b>FAIR MATCHES</b><small>Rules and results stay visible</small></p></div>
        <div><span className="arena-proof-icon"><Wallet size={19}/></span><p><b>ONE PLAYER HUB</b><small>Track matches and prize history</small></p></div>
      </section>

      <section className="arena-matches-section" id="matches">
        <div className="arena-section-heading"><div><p className="arena-eyebrow"><span>02 / FIND A LOBBY</span></p><h2>UPCOMING <em>MATCHES</em></h2><p>Choose your game and find an event that fits your squad.</p></div><a className="arena-text-button" href={LOGIN_URL}>Go to player hub <span>↗</span></a></div>
        <div className="arena-match-tools"><div className="arena-game-filters"><button className={game === 'ALL' ? 'is-selected' : ''} onClick={() => setGame('ALL')}>All games</button><button className={game === 'FREE FIRE' ? 'is-selected' : ''} onClick={() => setGame('FREE FIRE')}>Free Fire</button><button className={game === 'BGMI' ? 'is-selected' : ''} onClick={() => setGame('BGMI')}>BGMI</button></div><label className="arena-search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tournaments" aria-label="Search tournaments"/></label></div>
        {feedState === 'offline' ? <div className="arena-empty-state"><span className="arena-empty-icon"><Zap size={22}/></span><div><b>Match feed is taking a break.</b><p>We couldn’t reach the tournament service. Check back when the arena is online.</p></div><a href={LOGIN_URL}>Player sign in <ArrowRight size={15}/></a></div> :
          feedState === 'loading' ? <div className="arena-empty-state" role="status"><span className="arena-empty-icon"><Gamepad2 size={22}/></span><div><b>Checking published matches…</b><p>Match cards will appear when the tournament desk publishes an event.</p></div></div> :
          visible.length ? <div className="arena-event-grid">{visible.map((event) => <article className="arena-event-card" key={event.id}><img className="arena-event-photo" src={event.game === 'FREE FIRE' ? 'https://images.unsplash.com/photo-1759701547448-f3f336e478cd?auto=format&fit=crop&w=1000&q=76' : 'https://images.unsplash.com/photo-1548003693-b55d51032288?auto=format&fit=crop&w=1000&q=76'} alt={event.game === 'FREE FIRE' ? 'Player focused on a mobile esports match' : 'Players competing at gaming stations'} width="1000" height="560" loading="lazy" decoding="async"/><div className="arena-event-card-head"><span className="arena-event-game">{event.game}</span><span className="arena-event-status">{event.status}</span></div><h3>{event.name}</h3><p className="arena-event-format">{event.format}</p><div className="arena-event-details"><div><small>PRIZE POOL</small><b>{money(event.prize)}</b></div><div><small>ENTRY</small><b className={event.fee === 0 ? 'is-free' : ''}>{event.fee === 0 ? 'Free' : money(event.fee)}</b></div></div><p className="arena-event-date"><CalendarDays size={15}/>{event.date}</p><a href={LOGIN_URL}>View event <ArrowRight size={15}/></a></article>)}</div> :
          <div className="arena-empty-state"><span className="arena-empty-icon"><Gamepad2 size={22}/></span><div><b>No matches are listed right now.</b><p>New events will appear here as soon as the tournament desk publishes them.</p></div><a href={LOGIN_URL}>Join ApexNova <ArrowRight size={15}/></a></div>}
      </section>

      <section className="arena-steps-section" id="how-to-play">
        <div className="arena-section-heading"><div><p className="arena-eyebrow"><span>03 / HOW TO PLAY</span></p><h2>FROM SIGN-UP<br/>TO <em>SHOWDOWN.</em></h2></div><p>Everything you need to go from player ID to match day.</p></div>
        <div className="arena-steps-grid"><article><span>01</span><Gamepad2 size={24}/><h3>Create your player ID</h3><p>Set up your profile and add your squad.</p></article><article><span>02</span><ShieldCheck size={24}/><h3>Read the match rules</h3><p>Review the details and enter your game UID.</p></article><article><span>03</span><Trophy size={24}/><h3>Play and climb</h3><p>Submit results, track standings, and keep your achievements.</p></article></div>
      </section>

      <section className="arena-rewards-section" id="rewards"><div><p className="arena-eyebrow"><span>04 / PLAYER HUB</span></p><h2>EVERY MATCH<br/>LEAVES A <em>MARK.</em></h2><p>Follow your squad, get match updates, and keep tournament rewards in one place.</p></div><a className="arena-cta-button arena-cta-large" href={LOGIN_URL}>Enter the player hub <ArrowRight size={18}/></a><div className="arena-rewards-mark"><Trophy size={38}/><span>PLAY / PROVE / PROGRESS</span></div></section>
      <footer className="arena-footer"><a className="arena-brand" href="/ApexNova/"><span className="arena-brand-mark"><Zap size={20} fill="currentColor"/></span><span>APEX<span>NOVA</span><small>COMPETITIVE GAMING</small></span></a><span>Built for players who show up.</span><nav><a href="#matches">Matches</a><a href="#how-to-play">How it works</a><a href={LOGIN_URL}>Player sign in</a></nav><small>© 2026 ApexNova</small></footer>
    </main>
  );
}
