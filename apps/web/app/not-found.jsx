'use client';

import Link from 'next/link';
import { Activity, ArrowLeft, Crosshair, Home, SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="shell notFoundShell">
      <header className="topbar">
        <Link className="brand notFoundBrand" href="/" aria-label="ApexNova home">
          <Crosshair size={22} />
          <span>APEX<span className="ember">NOVA</span></span>
        </Link>
        <span className="status"><i className="pulse" /> SYSTEM STATUS / OPERATIONAL</span>
        <Link className="iconButton notFoundHomeIcon" href="/" aria-label="Return home"><Home size={18} /></Link>
      </header>

      <section className="notFoundContent">
        <div className="notFoundGraphic" aria-hidden="true">
          <span className="notFoundRing ringOne" />
          <span className="notFoundRing ringTwo" />
          <span className="notFoundCrosshair"><Crosshair size={66} strokeWidth={1.1} /></span>
          <span className="notFoundCode">404</span>
          <span className="notFoundCoordinate">COORDINATES NOT FOUND</span>
        </div>

        <div className="notFoundCopy">
          <p className="eyebrow"><SearchX size={14} /> APEX NOVA / ROUTE ERROR</p>
          <h1>YOU’VE LEFT<br /><span className="ember">THE ARENA.</span></h1>
          <p className="lede">This route doesn’t exist, or it may have moved. Your next match is still out there—let’s get you back to the command board.</p>
          <div className="notFoundActions">
            <Link className="primaryButton notFoundPrimary" href="/"><Home size={16} /> RETURN TO COMMAND BOARD</Link>
            <button className="secondaryButton" onClick={() => window.history.back()}><ArrowLeft size={16} /> GO BACK</button>
          </div>
          <div className="notFoundMeta"><Activity size={15} /><span>ERROR CODE: 404</span><span className="notFoundMetaDivider">/</span><span>NO MATCHING ROUTE</span></div>
        </div>
      </section>

      <footer><span>APEXNOVA / ROUTE RECOVERY</span><span><Activity size={14} /> ALL SYSTEMS NOMINAL</span></footer>
    </main>
  );
}
