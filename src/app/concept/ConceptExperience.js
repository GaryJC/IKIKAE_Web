'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { readConceptDraft, writeConceptDraft, normalizeMotto } from '@/lib/conceptDraft';
import styles from './concept.module.css';

import { STORY_STOPS as STOPS, EDITOR_STOP, storyState } from './three/timeline';
const DEFAULT_MOTTO = 'Stay in it.';
const ORBIT_PREVIEW_STOP = .21;
const EDITOR_INDEX = STOPS.indexOf(EDITOR_STOP);
const CHAPTERS = ['The piece', 'The detail', 'Your words', 'Yours, quietly'];

export default function ConceptExperience() {
  const stage = useRef(null), host = useRef(null), scene = useRef(null), captureLink = useRef(null);
  const progress = useRef(0), focused = useRef(false), appliedMotto = useRef(DEFAULT_MOTTO);
  const updateProgress = useRef(null);
  const chapterRail = useRef(null), orbitAnchor = useRef(null);
  const menu = useRef(null);
  const [ready, setReady] = useState(false), [fallback, setFallback] = useState(false);
  const [chapter, setChapter] = useState(0), [reduced, setReduced] = useState(false);
  const [draft, setDraft] = useState(DEFAULT_MOTTO), [applied, setApplied] = useState(DEFAULT_MOTTO);
  const [capture, setCapture] = useState(false), [announcement, setAnnouncement] = useState('');
  const [metrics, setMetrics] = useState('');
  const [activeCopy,setActiveCopy] = useState(0), [ctaEnabled,setCtaEnabled] = useState(false);

  useEffect(() => {
    const saved = readConceptDraft();
    if (saved) { setDraft(saved);setApplied(saved);appliedMotto.current=saved; }
    const params = new URLSearchParams(window.location.search);
    const localQA = process.env.NODE_ENV === 'development';
    const captureMode = localQA && params.has('capture');
    setCapture(captureMode);
    const staticPreview = localQA && params.get('preview') === 'static';
    const forcedReduced = localQA && params.get('motion') === 'reduce';
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let dead = false, observer, sceneFailed = false;
    const isReduced = () => media.matches || forcedReduced;
    function onMedia() {
      setReduced(isReduced());
      scene.current?.setReducedMotion(isReduced());
      update(progress.current);
    }
    function present(p, state=storyState(p)) {
      if(dead) return;
      setChapter(state.chapter);
      stage.current?.style.setProperty('--opening',String(state.opening));
      stage.current?.style.setProperty('--copy-x',(isReduced()?0:state.copyX)+'px');
      stage.current?.style.setProperty('--copy-y',(isReduced()?0:state.copyY)+'px');
      const values=[state.hero,state.detail,state.editor,state.final];
      setActiveCopy(values[state.chapter]>.001?state.chapter:-1);
      setCtaEnabled(state.cta>0);
      ['hero','detail','editor','final','cta'].forEach(key=>stage.current?.style.setProperty(`--${key}-alpha`,String(state[key])));
      stage.current?.style.setProperty('--macro-alpha',String(state.macro));
      stage.current?.style.setProperty('--progress',String(p));
    }
    function update(p) {
      progress.current=p;
      const effective = focused.current ? EDITOR_STOP : p;
      const resolved=isReduced()?STOPS[storyState(effective).chapter]:effective;
      if(scene.current && !sceneFailed) scene.current.setProgress(resolved);
      else present(resolved);
    }
    updateProgress.current = update;
    // The browser scrolls one screen per chapter. The four authored camera
    // poses have their own timeline coordinates.
    const rail = chapterRail.current;
    let top = 0, chapterHeight = 0, page = 0;
    let viewportHeight, viewportWidth;
    function readProgress() {
      page = Math.min(STOPS.length - 1, Math.max(0, (window.scrollY - top) / chapterHeight));
      const index = Math.min(Math.floor(page), STOPS.length - 2);
      update(STOPS[index] + (STOPS[index + 1] - STOPS[index]) * (page - index));
    }
    function measure() {
      const height = Math.max(1, rail.firstElementChild.getBoundingClientRect().height);
      const held = Math.round(page);
      const wasAtAnchor = Math.abs(page - held) * chapterHeight <= 1;
      top = window.scrollY + rail.getBoundingClientRect().top;
      if (chapterHeight && height !== chapterHeight && (focused.current || (wasAtAnchor && !captureMode && !isReduced()))) {
        // Chrome can retain the old pixel offset after a viewport/keyboard resize.
        const anchor = rail.children[focused.current ? EDITOR_INDEX : held];
        anchor.scrollIntoView({block:'start', behavior:'instant'});
      }
      chapterHeight = height;
      viewportHeight = window.innerHeight;
      viewportWidth = window.innerWidth;
      readProgress();
    }
    function onScroll() {
      // Native scroll restoration may arrive before ResizeObserver when rotating.
      if (window.innerHeight !== viewportHeight || window.innerWidth !== viewportWidth) measure();
      else readProgress();
    }
    function enableFallback() {
      if (dead) return;
      sceneFailed = true;
      setFallback(true);
      setReady(true);
      update(progress.current);
    }
    measure();
    const layout = new ResizeObserver(measure);
    layout.observe(rail);
    window.addEventListener('scroll', onScroll, {passive:true});
    onMedia();
    media.addEventListener('change', onMedia);
    if (staticPreview) enableFallback();
    else import('./three/scene').then(module => {
      if (dead) return;
      scene.current = module.createScene(host.current, {motto:appliedMotto.current, reducedMotion:isReduced(), onProgress:present, onReady:()=>setReady(true), onFailure:enableFallback});
      observer = new IntersectionObserver(([entry])=>scene.current?.setActive(entry.isIntersecting));
      observer.observe(stage.current);
      const initial = focused.current ? EDITOR_STOP : progress.current;
      scene.current?.setProgress(isReduced() ? STOPS[storyState(initial).chapter] : initial, true);
    }).catch(enableFallback);
    return () => {
      dead = true;
      window.removeEventListener('scroll', onScroll);
      media.removeEventListener('change', onMedia);
      layout.disconnect();
      observer?.disconnect();
      scene.current?.dispose();
      scene.current = null;
      updateProgress.current = null;
    };
  },[]);

  function jump(index, previewOrbit = false) {
    menu.current?.hidePopover?.();
    focused.current = false;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const target = previewOrbit ? orbitAnchor.current : chapterRail.current?.children[index];
    target?.scrollIntoView({block:'start', behavior:reduced ? 'instant' : 'smooth'});
  }
  function beginEdit() {
    focused.current = true;
    updateProgress.current?.(progress.current);
  }
  function preview(event) {
    event.preventDefault();
    const next=normalizeMotto(draft).trim() || DEFAULT_MOTTO;
    setDraft(next);setApplied(next);appliedMotto.current=next;
    writeConceptDraft(next);scene.current?.setMotto(next);
    setAnnouncement(fallback ? 'Your words are saved for the next step.' : 'Your embroidery preview is ready.');
  }
  function leaveEditor() {
    focused.current = false;
    chapterRail.current?.children[EDITOR_INDEX].scrollIntoView({block:'start', behavior:'instant'});
    updateProgress.current?.(EDITOR_STOP);
    setDraft(normalizeMotto(draft));
  }
  function exportStill(p, yaw = null) {
    const url=scene.current?.capture(p,yaw);
    if(url && captureLink.current){captureLink.current.href=url;captureLink.current.download=yaw===null?(p?'hoodie-detail.png':'hoodie-front.png'):'hoodie-side.png';captureLink.current.click();}
  }

  return (
    <div className={styles.experience} data-snap={!reduced && !capture}>
      <header className={styles.header}>
        <Link className={styles.wordmark} href="/" aria-label="IKIKAE home">IKIKAE</Link>
        <nav className={styles.headerChapters} aria-label="Collection chapters">
          {CHAPTERS.map((name,index)=>(
            <button key={name} aria-current={chapter===index?'step':undefined} onClick={()=>jump(index)}>{name}</button>
          ))}
        </nav>
        <button className={styles.menuToggle} popoverTarget="concept-menu" aria-label="Site menu">
          <span aria-hidden="true"/>
        </button>
        <nav ref={menu} className={styles.siteMenu} id="concept-menu" popover="auto" aria-label="Site navigation">
          <div className={styles.mobileChapters}>
            {CHAPTERS.map((name,index)=>(
              <button key={name} aria-current={chapter===index?'step':undefined} onClick={()=>jump(index)}>{name}</button>
            ))}
          </div>
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/contact-us">Contact</Link>
        </nav>
      </header>
      <section ref={stage} className={styles.scrollTrack} aria-label="Explore your personal garment">
        <div className={styles.stage}>
          <div className={styles.grain} aria-hidden="true"/>
          <div className={styles.guides} aria-hidden="true"><i/><i/><i/></div>
          <div className={styles.sceneWrap} data-chapter={chapter}>
            <div className={styles.figureLayer}>
              <div ref={host} className={styles.scene} style={{visibility:fallback?'hidden':'visible'}}/>
              {(!ready || fallback) && <Image className={styles.poster} fill sizes="(max-width: 767px) 100vw, 71vw" priority src={chapter===1?'/concept/hoodie-graphite-shoulder.webp':chapter===2?'/concept/hoodie-graphite-stitch.webp':chapter===3?'/concept/hoodie-graphite-final.webp':'/concept/hoodie-neck-front.webp'} alt="Charcoal IKIKAE concept zip hoodie on a classical stone figure" onError={e=>{e.currentTarget.style.opacity=0;}}/>}
            </div>
          </div>
          <div className={styles.topNote}><span className={styles.dot}/> A personal garment. An ongoing story.</div>
          <div className={`${styles.copy} ${styles.openingCopy}`} style={{opacity:"var(--hero-alpha, 1)"}} data-active={activeCopy===0} aria-hidden={activeCopy!==0} inert={activeCopy!==0}>
            <div className={styles.eyebrow}>THE QUIET COMMITMENT</div>
            <h1>Wear what<br/><em>matters.</em></h1>
            <p>Your words. Held close.<br/>Made part of your everyday.</p>
            <button className={styles.textButton} onClick={()=>jump(1)}>Come a little closer <span aria-hidden="true">↓</span></button>
          </div>
          <div className={styles.copy} style={{opacity:"var(--detail-alpha, 0)"}} data-active={activeCopy===1} aria-hidden={activeCopy!==1} inert={activeCopy!==1}>
            <div className={styles.eyebrow}>MEANING IN THE DETAILS</div>
            <h2>Quietly<br/><em>yours.</em></h2>
            <p>Visible up close.<br/>Personal from any distance.</p>
            <button className={styles.textButton} onClick={()=>jump(2)}>Leave your words <span aria-hidden="true">↓</span></button>
          </div>
          <div className={`${styles.copy} ${styles.editorCopy}`} style={{opacity:"var(--editor-alpha, 0)"}} data-active={activeCopy===2} aria-hidden={activeCopy!==2} inert={activeCopy!==2}>
            <div className={styles.eyebrow}>A NOTE TO YOURSELF</div>
            <h2>What keeps <br/>you <em>going?</em></h2>
            <form className={styles.form} onSubmit={preview}>
              <label htmlFor="concept-motto">Your words</label>
              <div className={styles.inputRow}>
                <input id="concept-motto" value={draft} onChange={e=>{setDraft(e.nativeEvent.isComposing?e.target.value:normalizeMotto(e.target.value));setAnnouncement('');}} onCompositionEnd={e=>setDraft(normalizeMotto(e.currentTarget.value))} onFocus={beginEdit} onBlur={leaveEditor} autoComplete="off" spellCheck="false" aria-describedby="concept-input-note"/>
                <button type="submit">{fallback ? 'Save words' : 'Preview'} <span aria-hidden="true">↗</span></button>
              </div>
              <div id="concept-input-note" className={styles.inputNote}>Up to 24 characters. Just for you.</div>
            </form>
            <button className={styles.textButton} onClick={()=>jump(3)}>See the whole piece <span aria-hidden="true">↓</span></button>
          </div>
          <div className={`${styles.copy} ${styles.returnCopy}`} style={{opacity:"var(--final-alpha, 0)"}} data-active={activeCopy===3} aria-hidden={activeCopy!==3} inert={activeCopy!==3}>
            <div className={styles.eyebrow}>YOUR WORDS. YOUR WAY.</div>
            <h2>Carry it<br/><em>with you.</em></h2>
            <p>Some things don’t need to be loud.<br/>They just need to stay with you.</p>
            <Link className={styles.cta} style={{opacity:"var(--cta-alpha, 0)",pointerEvents:ctaEnabled?"auto":"none"}} tabIndex={ctaEnabled?0:-1} aria-hidden={!ctaEnabled} href="/userProfile/motto?draft=concept" onClick={()=>writeConceptDraft(applied)}>Make it yours <span aria-hidden="true">↗</span></Link>
            <button className={styles.editAgain} onClick={()=>jump(2)}>Revisit your words</button>
          </div>
          <div className={styles.productLabel} aria-hidden="true">IKIKAE<span>ESSENTIAL / 001</span></div>
          <footer className={styles.footer}>
            <div className={styles.chapterNav} role="group" aria-label="Story chapters">{CHAPTERS.map((name,index)=><button key={name} aria-label={`${index+1}. ${name}`} aria-current={chapter===index?'step':undefined} onClick={()=>jump(index)}><span>0{index+1}</span><i/></button>)}</div>
            <div className={styles.chapterName}>{CHAPTERS[chapter]}</div>
            <span className={styles.conceptLabel}>CONCEPT STUDY — 01</span>
          </footer>
          <div className={styles.progressTrack} aria-hidden="true"><i/></div>
          <span className={styles.srOnly} role="status">{announcement}</span>
          {capture && <div className={styles.captureControls}>
            <button onClick={()=>jump(1,true)}>Orbit shot</button>
            <button onClick={()=>jump(1)}>Shoulder shot</button>
            <button onClick={()=>exportStill(0)}>Export front still</button>
            <button onClick={()=>exportStill(STOPS[1])}>Export shoulder still</button>
            <button onClick={()=>exportStill(EDITOR_STOP)}>Export stitch still</button>
            <button onClick={()=>exportStill(1)}>Export final still</button>
            <button onClick={()=>exportStill(0,Math.PI/2)}>Export side still</button>
            <button onClick={()=>scene.current?.inspect(Math.PI/2)}>Side view</button>
            <button onClick={()=>scene.current?.inspect(Math.PI)}>Back view</button>
            <button onClick={()=>{const d=host.current?.querySelector('canvas')?.dataset;setMetrics(d?`${d.fps || '—'} fps · ${d.triangles} triangles · ${d.drawCalls} draws`:'Static');}}>Read metrics</button>
            <output>{metrics}</output><a ref={captureLink} hidden>Export</a>
          </div>}
        </div>
        <div className={styles.chapterRail} ref={chapterRail} aria-hidden="true">
          {CHAPTERS.map((name,index)=>(
            <div className={styles.chapterAnchor} key={name}>
              {capture && index===0 && <div ref={orbitAnchor} className={styles.orbitAnchor} style={{top:`${ORBIT_PREVIEW_STOP / STOPS[1] * 100}%`}}/>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
