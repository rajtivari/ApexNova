'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowRight, Bell, CalendarDays, ChevronDown, CircleDollarSign,
  Flame, Gamepad2, Gift, Menu, Search, ShieldCheck, Swords, Trophy, Users, X,
  Zap, Crosshair, Crown, Medal
} from 'lucide-react';

const tournaments = [
  { id:'NOVA-041', title:'EMBER CLASH', game:'FREE FIRE', mode:'SQUAD · BATTLE ROYALE', entry:0, prize:5000, slots:48, filled:31, date:'18 OCT', time:'06:30 PM', status:'REGISTRATION OPEN', color:'ember', tag:'FREE ENTRY' },
  { id:'NOVA-042', title:'NIGHT OPS: BGMI', game:'BGMI', mode:'SQUAD · CLASSIC', entry:29, prize:8000, slots:64, filled:42, date:'19 OCT', time:'07:00 PM', status:'REGISTRATION OPEN', color:'cyan', tag:'MOST POPULAR' },
  { id:'NOVA-043', title:'RUSH HOUR #08', game:'FREE FIRE', mode:'SOLO · CLASH SQUAD', entry:10, prize:2500, slots:48, filled:44, date:'20 OCT', time:'05:00 PM', status:'FEW SLOTS LEFT', color:'olive', tag:'LAST 4 SLOTS' },
  { id:'NOVA-044', title:'SUNDAY SHOWDOWN', game:'BGMI', mode:'DUO · ERANGEL', entry:0, prize:4000, slots:50, filled:18, date:'22 OCT', time:'08:00 PM', status:'REGISTRATION OPEN', color:'ember', tag:'FREE ENTRY' },
];

const leaderboard = [
  { rank:'01', name:'VOIDxRUSH', points:2840, wins:18, medal:'gold' },
  { rank:'02', name:'NOVA•REX', points:2615, wins:15, medal:'silver' },
  { rank:'03', name:'KAIRO.exe', points:2390, wins:12, medal:'bronze' },
  { rank:'04', name:'NIGHT RAID', points:2180, wins:11, medal:'' },
];

function money(value) { return '₹' + Number(value).toLocaleString('en-IN'); }

export default function Home() {
  const [game, setGame] = useState('ALL');
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const visible = useMemo(() => tournaments.filter(t => (game === 'ALL' || t.game === game) && (t.title + t.game + t.mode).toLowerCase().includes(query.toLowerCase())), [game, query]);

  return (
    <main className="nova-site">
      <div className="nova-topline"><span><i className="live-dot" /> PLATFORM STATUS: ONLINE</span><span>INDIA SERVER <b>IN · 01</b></span><span className="topline-right">PLAY FAIR. PLAY HARD. <span className="topline-mark">↗</span></span></div>
      <header className="nova-nav">
        <a className="nova-brand" href="/ApexNova/" aria-label="ApexNova home"><span className="brand-symbol"><Crosshair size={22}/><i /></span><span>APEX<span className="brand-orange">NOVA</span><small>COMPETITIVE ARENA</small></span></a>
        <nav className={menuOpen ? 'nav-links nav-open' : 'nav-links'}>
          <a className="nav-active" href="#tournaments" onClick={() => setMenuOpen(false)}>TOURNAMENTS</a>
          <a href="#leaderboard" onClick={() => setMenuOpen(false)}>LEADERBOARD</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>HOW TO PLAY</a>
          <a href="#rewards" onClick={() => setMenuOpen(false)}>REWARDS</a>
        </nav>
        <div className="nav-actions"><a className="nav-signin" href="/ApexNova/login/">LOG IN</a><a className="nav-join" href="/ApexNova/login/">JOIN THE ARENA <ArrowRight size={15}/></a></div>
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X/> : <Menu/>}</button>
      </header>

      <section className="nova-hero">
        <div className="hero-gridlines" />
        <div className="hero-copy">
          <div className="section-kicker"><span>01</span> INDIA'S COMPETITIVE PLAYGROUND <span className="kicker-line" /></div>
          <h1>YOUR GAME.<br/><span>YOUR GLORY.</span></h1>
          <p className="hero-sub">Queue up. Squad up. Take the win.</p>
          <p className="hero-description">Compete in Free Fire and BGMI tournaments, climb the rankings, and turn every match into a moment that counts.</p>
          <div className="hero-cta"><a className="button-primary" href="#tournaments">FIND YOUR TOURNAMENT <ArrowRight size={17}/></a><a className="button-quiet" href="#how-it-works"><span className="play-triangle">▶</span> HOW IT WORKS</a></div>
          <div className="hero-proof"><span><ShieldCheck size={15}/> FAIR PLAY SYSTEM</span><span><Zap size={15}/> FAST REGISTRATION</span><span><Trophy size={15}/> VERIFIED RESULTS</span></div>
        </div>
        <div className="hero-art" aria-label="ApexNova competitive gaming artwork">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-cross cross-a">+</div><div className="art-cross cross-b">+</div>
          <div className="art-panel panel-top"><span>LIVE COMPETITION</span><b><i className="live-dot"/> OPEN</b></div>
          <div className="hero-emblem"><div className="emblem-outer"><div className="emblem-inner"><Crosshair size={102} strokeWidth={1.1}/><span>N</span></div></div><div className="emblem-ring">A P E X N O V A · A R E N A · A P E X N O V A ·</div></div>
          <div className="art-panel panel-bottom"><div><small>NEXT EVENT</small><strong>EMBER CLASH <span>#04</span></strong></div><div className="panel-time"><CalendarDays size={15}/> 18 OCT <b>·</b> 18:30</div></div>
          <div className="art-vertical">COMPETE // IMPROVE // REPEAT</div>
          <div className="art-coordinate">12°58' N<br/>77°35' E</div>
        </div>
        <div className="hero-bottomline"><span>SCROLL TO EXPLORE <ArrowDownRight size={15}/></span><span>BUILT FOR THE GRIND <b>/// 2026</b></span></div>
      </section>

      <section className="nova-stats" aria-label="Platform highlights">
        <div className="stat-intro"><span className="section-kicker"><span>02</span> THE ARENA</span><strong>EVERY MATCH<br/>HAS A <em>STORY.</em></strong></div>
        <div className="nova-stat"><span className="stat-icon"><Users size={18}/></span><strong>01<span>K+</span></strong><small>PLAYERS READY</small></div>
        <div className="nova-stat"><span className="stat-icon"><Swords size={18}/></span><strong>02</strong><small>GAMES. ONE ARENA.</small></div>
        <div className="nova-stat"><span className="stat-icon"><CircleDollarSign size={18}/></span><strong>₹<span>20K</span></strong><small>DEMO PRIZE POOLS</small></div>
        <div className="stats-note">SHOWCASE DATA<br/><span>EVENTS & PRIZES ARE DEMONSTRATION CONTENT</span></div>
      </section>

      <section className="tournament-section" id="tournaments">
        <div className="section-head"><div><div className="section-kicker"><span>03</span> FIND YOUR NEXT MATCH</div><h2>THE <span>LINEUP.</span></h2><p>Pick your game. Find your lobby. Make your mark.</p></div><a className="text-link" href="/ApexNova/login/">PLAYER HUB <ArrowRight size={16}/></a></div>
        <div className="tournament-tools"><div className="game-filters"><button className={game==='ALL'?'filter-active':''} onClick={()=>setGame('ALL')}>ALL GAMES <span>04</span></button><button className={game==='FREE FIRE'?'filter-active':''} onClick={()=>setGame('FREE FIRE')}><span className="game-mini ff">FF</span> FREE FIRE</button><button className={game==='BGMI'?'filter-active':''} onClick={()=>setGame('BGMI')}><span className="game-mini bg">B</span> BGMI</button></div><label className="tournament-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tournaments..." aria-label="Search tournaments"/><span>/</span></label></div>
        <div className="tournament-grid">
          {visible.map((t, i) => <article className={'tournament-card card-'+t.color} key={t.id}>
            <div className="card-art"><div className="card-art-lines"/><div className="card-game-stamp">{t.game==='BGMI'?'BATTLEGROUNDS':'FREE FIRE'}<span> // COMPETITIVE SERIES</span></div><div className="card-game-mark">{t.game==='BGMI'?'B':'FF'}</div><span className="card-number">0{i+1} / 04</span><span className="card-tag">{t.tag}</span></div>
            <div className="card-content"><div className="card-meta"><span>{t.id}</span><span className="card-live"><i className="live-dot"/>{t.status}</span></div><h3>{t.title}</h3><p className="card-mode"><Gamepad2 size={14}/>{t.mode}</p>
              <div className="card-prizes"><div><small>PRIZE POOL</small><strong>{money(t.prize)}</strong></div><div><small>ENTRY FEE</small><strong className={t.entry===0?'free-entry':''}>{t.entry===0?'FREE':money(t.entry)}</strong></div></div>
              <div className="slot-line"><div><span>LOBBY CAPACITY</span><b>{t.filled}/{t.slots}</b></div><div className="slot-track"><i style={{width:(t.filled/t.slots*100)+'%'}}/></div></div>
              <div className="card-footer"><span><CalendarDays size={14}/>{t.date} <b>·</b> {t.time}</span><a href="/ApexNova/login/" aria-label={'Register for '+t.title}>ENTER ARENA <ArrowRight size={15}/></a></div>
            </div>
          </article>)}
          {visible.length===0 && <div className="no-tournaments">NO MATCHES FOUND. TRY ANOTHER GAME OR SEARCH.</div>}
        </div>
        <p className="demo-disclaimer"><ShieldCheck size={14}/> Tournament cards are demo fixtures for the portfolio build. Registration and payments require a connected account and verified backend flow.</p>
      </section>

      <section className="arena-band" id="how-it-works"><div className="band-graphic"><div className="band-cross">✳</div><span>READY<br/>CHECK</span><b>APX / 01</b></div><div className="band-copy"><div className="section-kicker"><span>04</span> NO COMPLICATED SETUP</div><h2>THREE STEPS.<br/><em>ALL GAME.</em></h2></div><div className="steps-list"><div><span>01</span><div><strong>CREATE YOUR PLAYER ID</strong><p>Set up your profile and choose your game.</p></div><ArrowRight size={16}/></div><div><span>02</span><div><strong>JOIN A TOURNAMENT</strong><p>Pick solo, duo, or squad events and register.</p></div><ArrowRight size={16}/></div><div><span>03</span><div><strong>PLAY. SUBMIT. CLIMB.</strong><p>Submit results, track standings, earn recognition.</p></div><ArrowRight size={16}/></div></div></section>

      <section className="community-section" id="leaderboard">
        <div className="leaderboard-block"><div className="section-kicker"><span>05</span> THE RANKING BOARD</div><div className="section-head compact"><div><h2>TOP <span>FRAGGERS.</span></h2><p>Every point tells a story.</p></div><span className="season-chip"><i className="live-dot"/> SEASON 01</span></div>
          <div className="leader-table"><div className="leader-row leader-header"><span>RANK</span><span>PLAYER / SQUAD</span><span>WINS</span><span>POINTS</span></div>{leaderboard.map(p=><div className="leader-row" key={p.rank}><span className={'leader-rank '+p.medal}>{p.rank}{p.medal==='gold'?<Crown size={13}/>:p.medal==='silver'?<Medal size={13}/>:p.medal==='bronze'?<Medal size={13}/>:null}</span><strong>{p.name}</strong><span>{p.wins}</span><b>{p.points.toLocaleString('en-IN')}</b></div>)}</div><p className="demo-disclaimer"><ShieldCheck size={14}/> Sample leaderboard data. Verified rankings will be driven by approved match results.</p>
        </div>
        <div className="rewards-block" id="rewards"><div className="rewards-top"><span className="section-kicker"><span>06</span> MORE THAN A WIN</span><Gift size={25}/></div><h2>STACK YOUR<br/><em>REWARDS.</em></h2><p>Track prize history, get tournament certificates, invite your squad, and keep every achievement in one player hub.</p><div className="reward-items"><div><Trophy size={17}/><span>ACHIEVEMENT<br/><b>CERTIFICATES</b></span></div><div><CircleDollarSign size={17}/><span>PRIZE<br/><b>HISTORY</b></span></div><div><Gift size={17}/><span>REFER &<br/><b>EARN</b></span></div></div><a className="button-primary full-button" href="/ApexNova/login/">OPEN PLAYER HUB <ArrowRight size={16}/></a><span className="rewards-note">DEMO MODE · NO REAL-MONEY PAYOUTS</span></div>
      </section>

      <section className="final-cta"><div className="cta-radar"><Crosshair size={78} strokeWidth={1}/></div><div><div className="section-kicker"><span>07</span> YOUR NEXT ROUND STARTS HERE</div><h2>DROP IN.<br/><span>STAND OUT.</span></h2></div><a className="button-primary" href="/ApexNova/login/">JOIN APEX NOVA <ArrowRight size={17}/></a><span className="cta-code">APX-ARENA / 001</span></section>

      <footer className="nova-footer"><a className="nova-brand" href="/ApexNova/"><span className="brand-symbol"><Crosshair size={22}/><i /></span><span>APEX<span className="brand-orange">NOVA</span><small>COMPETITIVE ARENA</small></span></a><p>BUILT FOR PLAYERS WHO SHOW UP.</p><div className="footer-links"><a href="/ApexNova/login/">PLAYER LOGIN</a><a href="#tournaments">TOURNAMENTS</a><a href="#leaderboard">LEADERBOARD</a></div><span className="footer-copy">© 2026 APEXNOVA · PORTFOLIO DEMO</span></footer>
    </main>
  );
}
