import { DOCUMENT } from '@angular/common';
import { SITE_URL } from '../../../core/site';
import { SeoService } from '../../../core/seo.service';
import { I18nService } from '../../../core/i18n.service';
import { Dot, FilterOption, Project, ProjectFilter, Spark, Stat } from './portfolio.model';
import { Component, DestroyRef, ElementRef, afterNextRender, effect, inject, signal, viewChild } from '@angular/core';

const MIN_V = 4;
const MAX_V = 20;
const COLORS = ['#FFB020', '#7B5CFF', '#2DD4BF'];
const FONTS = 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
const ROLES = ['Full Stack .NET Developer', 'C# and API engineer', 'Angular developer since v4', 'microservices builder', 'SQL Server tuner', 'product builder, repo to release'];
const MARQUEE = ['.NET 10', 'C#', 'ASP.NET Core', 'Angular 20', 'EF Core', 'SQL Server 2022', 'Microsoft Azure', 'Azure Functions', 'Microservices', 'TypeScript', 'Azure DevOps', 'Power BI', 'Claude Code'];

const STATS: Stat[] = [
  { end: 7, suffix: '+', label: 'years of experience' },
  { end: 5, suffix: '', label: 'companies' },
  { end: 6, suffix: '', label: 'Eurofins labs running my code' },
  { end: 2, suffix: 'M+', label: 'users on platforms I built for' },
];

const FILTERS: FilterOption[] = [
  { id: 'all', label: 'All' },
  { id: 'enterprise', label: 'Enterprise' },
  { id: 'azure', label: 'Azure' },
  { id: 'data', label: 'Data and finance' },
];

const PROJECTS: Project[] = [
  {
    id: 'cl',
    name: 'CoreLabs',
    kind: 'Laboratory Management System for Eurofins',
    v: 20,
    tags: ['enterprise'],
    star: true,
    big: true,
    when: 'Current project',
    stack: ['.NET 10', 'C#', 'EF Core', 'Angular 20+', 'Microservices', 'Claude Code'],
    text: "Eurofins tests new medicines in its labs before they reach human trials, and CoreLabs is the system six of those lab centers run on. I work on the path a sample follows through the lab: it is registered, tests are assigned, results are entered and a report comes out. I build on both sides of that path: the .NET 10 microservices and EF Core data access underneath, and the Angular 20+ modules lab staff work in. A wrong value here can affect a drug study, so validation and data integrity get as much attention as the screens.",
    step: 'Today: Angular 20+ on .NET 10, the newest releases of both and sixteen major Angular versions on from where I started.',
  },
  {
    id: 'es',
    name: 'e-Sign Speridian',
    kind: 'Document signing workflow',
    v: 18,
    tags: ['enterprise', 'azure'],
    star: true,
    big: true,
    when: 'Built from scratch',
    stack: ['ASP.NET Core 8', 'C#', 'Angular 18', 'Azure'],
    text: 'Started from an empty repository, with every early design decision mine. An admin uploads a document, drops signature fields onto it and chooses who signs. Signers get an email and sign in a fixed order through a hierarchy of approvals, and the completed document goes back to the admin. Behind that flow sit role-based access, signing state tracked on the server and email notifications. Once the foundation was solid I brought colleagues onto the codebase to finish it. Paper sign-offs became a flow where every signature can be traced.',
    step: 'Angular 18 with an ASP.NET Core 8 API on Azure. Here I set up the project structure and the client-server contract myself instead of fitting into an existing codebase.',
  },
  {
    id: 'o3',
    name: 'O360 Payroll and RMS',
    kind: 'HR, payroll and recruitment',
    v: 14,
    tags: ['enterprise', 'azure', 'data'],
    stack: ['ASP.NET Core 6+', 'C#', 'Angular 14+', 'Azure'],
    text: "Two connected pieces of one HR suite. In payroll I wrote the business rules for salary calculation, holidays and leave, where a mistake ends up on someone's payslip. The Recruitment Management System gathers candidates from referrals, job portals, LinkedIn and Naukri into one pipeline. When a candidate is hired, it creates their record in the employee portal automatically, so HR no longer types the same details in twice.",
    step: 'Angular 14 and ASP.NET Core 6 marked my move into HR software, with rule-heavy screens for payroll and recruitment.',
  },
  {
    id: 'lms',
    name: 'Learning Management System',
    short: 'LMS',
    kind: 'Corporate e-learning platform',
    v: 4,
    tags: ['enterprise', 'azure'],
    stack: ['ASP.NET', 'C#', 'Angular 4+', 'TypeScript', 'jQuery', 'Cordova', 'Azure'],
    text: "GCube's corporate learning platform, now Tenneo, used by more than 2 million learners on the web and through mobile and iOS apps. On the core product team I built learner tracking, which records each learner's progress, and the delivery of custom e-learning courses. The work spanned the ASP.NET backend, the Angular and jQuery front end and the Cordova build that took the web app to phones.",
    step: 'Angular 4: my starting point on the framework. Angular screens ran next to jQuery pages, and Cordova packaged the same web code for mobile and iOS.',
  },
  {
    id: 'sp',
    name: 'SProc Optimization',
    kind: 'SQL Server performance tuning',
    v: null,
    label: 'SQL Server',
    tags: ['data'],
    stack: ['SQL Server 2022', 'Stored procedures', 'SSMS 2022'],
    text: "A live application at MetaDesign Solutions was slow, and the cause sat in the database rather than the UI. I profiled the stored procedures behind its slowest queries in SSMS 2022 and reworked them, so the screens waiting on that data respond faster.",
  },
  {
    id: 'mfo',
    name: 'My Financial Online',
    kind: 'Digital accounting application',
    v: null,
    label: 'ASP.NET MVC',
    tags: ['data'],
    stack: ['ASP.NET MVC', 'C#', 'Angular', 'SQL Server'],
    text: 'Moves bookkeeping off paper and automates routine accounting work. I was responsible for it in production, so a bug report could lead into the SQL Server data, the ASP.NET MVC controllers or the Angular screens. Fixing problems at that depth, and then adding features on top, taught me how every layer of a web application fits together.',
  },
];

/** Position of an Angular version on the journey track, in percent. */
const pos = (v: number) => ((v - MIN_V) / (MAX_V - MIN_V)) * 92 + 4;

/**
 * Kunal Kumar's portfolio. A full-screen page with its own header, footer and dark look, so the site header and footer
 * are hidden here (see App.bare). All text is in the prerendered HTML; the animations start in the browser only.
 */
@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.html',
  styleUrl: './portfolio.scss',
  host: { '[class.anim]': 'animate()' },
})

export class Portfolio {
  private h = 0;
  private w = 0;
  private countId = 0;
  private frameId = 0;
  private typeTimer = 0;
  private reduce = false;
  private sparkTimer = 0;
  private dots: Dot[] = [];
  private sparks: Spark[] = [];
  protected readonly stats = STATS;
  private mouse = { x: -999, y: -999 };
  protected readonly filters = FILTERS;
  protected readonly projects = PROJECTS;
  private readonly doc = inject(DOCUMENT);
  protected readonly solid = signal(false);
  private readonly seo = inject(SeoService);
  protected readonly animate = signal(false);
  protected readonly role = signal(ROLES[0]);
  private readonly i18n = inject(I18nService);
  private readonly stop = new AbortController();
  private io: IntersectionObserver | null = null;
  private readonly destroyRef = inject(DestroyRef);
  protected readonly selected = signal(PROJECTS[0]);
  private ctx: CanvasRenderingContext2D | null = null;
  protected readonly marquee = [...MARQUEE, ...MARQUEE];
  protected readonly filter = signal<ProjectFilter>('all');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly statText = signal(STATS.map((s) => s.end + s.suffix));
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');
  private readonly code = viewChild.required<ElementRef<HTMLElement>>('code');
  private readonly glow = viewChild.required<ElementRef<HTMLElement>>('glow');
  private readonly grid = viewChild.required<ElementRef<HTMLElement>>('grid');
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly sky = viewChild.required<ElementRef<HTMLCanvasElement>>('sky');
  protected readonly pins = PROJECTS.filter((p) => p.v !== null).map((p) => ({ p, left: pos(p.v!) }));
  protected readonly ticks = Array.from({ length: MAX_V - MIN_V + 1 }, (_, i) => ({ v: MIN_V + i, left: pos(MIN_V + i), now: MIN_V + i === MAX_V }));

  constructor() {
    this.i18n.set('en', false); // the portfolio is in English
    this.addFonts();
    effect(() => {
      this.seo.set({
        title: this.i18n.t('seo.kunal.title'),
        description: this.i18n.t('seo.kunal.desc'),
        path: '/kunal/',
        image: 'default',
        lang: 'en',
        imageAlt: 'Kunal Kumar, Full Stack .NET Developer',
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            url: `${SITE_URL}/kunal/`,
            name: this.i18n.t('seo.kunal.title'),
            mainEntity: {
              '@type': 'Person',
              name: 'Kunal Kumar',
              jobTitle: 'Full Stack .NET Developer',
              email: 'mailto:kkumar.nitrr@gmail.com',
              url: `${SITE_URL}/kunal/`,
              sameAs: ['https://www.linkedin.com/in/imkkumar/'],
              alumniOf: { '@type': 'CollegeOrUniversity', name: 'National Institute of Technology Raipur' },
              award: ['Outstanding Performance, Programmers.ai', 'Certificate of Excellence, GCube WebWide', 'A New Kid on the Block, GCube WebWide'],
              knowsAbout: ['C#', '.NET', 'ASP.NET Core', 'Angular', 'SQL Server', 'Microsoft Azure', 'Microservices'],
            },
          },
        ],
      });
    });
    afterNextRender(() => this.start());
  }

  // #region Private Methods

  private size(): void {
    const win = this.doc.defaultView!;
    const cv = this.sky().nativeElement;
    const dpr = Math.min(win.devicePixelRatio || 1, 2);
    this.w = win.innerWidth;
    this.h = win.innerHeight;
    cv.width = this.w * dpr;
    cv.height = this.h * dpr;
    cv.style.width = this.w + 'px';
    cv.style.height = this.h + 'px';
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(90, Math.floor((this.w * this.h) / 16000));
    const speed = () => (this.reduce ? 0 : (Math.random() - 0.5) * 0.35);
    this.dots = Array.from({ length: n }, () => ({ x: Math.random() * this.w, y: Math.random() * this.h, vx: speed(), vy: speed(), r: Math.random() * 1.6 + 0.6, c: COLORS[Math.floor(Math.random() * 3)] }));
  }

  private type(): void {
    if (this.reduce)
      return;
    let r = 0;
    let i = ROLES[0].length;
    let del = true;
    const tick = () => {
      const word = ROLES[r];
      i += del ? -1 : 1;
      this.role.set(word.slice(0, i));
      let wait = del ? 35 : 70;
      if (!del && i === word.length) {
        del = true;
        wait = 1800;
      } else if (del && i === 0) {
        del = false;
        r = (r + 1) % ROLES.length;
        wait = 300;
      }
      this.typeTimer = window.setTimeout(tick, wait);
    };
    this.typeTimer = window.setTimeout(tick, 2200);
  }

  private start(): void {
    const win = this.doc.defaultView!;
    this.reduce = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = win.matchMedia('(pointer: fine)').matches;
    // Registered here, not in the constructor: prerendering also destroys the page, and the server has no animation frames.
    this.destroyRef.onDestroy(() => {
      this.stop.abort();
      this.io?.disconnect();
      clearTimeout(this.typeTimer);
      clearTimeout(this.sparkTimer);
      cancelAnimationFrame(this.frameId);
      cancelAnimationFrame(this.countId);
    });
    if (!this.reduce)
      this.statText.set(STATS.map(() => '0'));
    this.animate.set(true);
    this.type();
    this.reveal();
    this.scroll();
    this.startSky();
    if (fine && !this.reduce)
      this.pointer();
    this.center(this.track().nativeElement.querySelector<HTMLElement>('.pin[aria-pressed="true"]'));
  }

  private frame(): void {
    const ctx = this.ctx!;
    ctx.clearRect(0, 0, this.w, this.h);
    for (const d of this.dots) {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0 || d.x > this.w)
        d.vx *= -1;
      if (d.y < 0 || d.y > this.h)
        d.vy *= -1;
      const dx = d.x - this.mouse.x;
      const dy = d.y - this.mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 140) {
        d.x += (dx / dist) * 1.2;
        d.y += (dy / dist) * 1.2;
      }
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, 7);
      ctx.fillStyle = d.c;
      ctx.globalAlpha = 0.8;
      ctx.fill();
    }
    ctx.lineWidth = 0.6;
    for (let i = 0; i < this.dots.length; i++) {
      for (let j = i + 1; j < this.dots.length; j++) {
        const a = this.dots[i];
        const b = this.dots[j];
        const dd = Math.hypot(a.x - b.x, a.y - b.y);
        if (dd >= 120)
          continue;
        ctx.globalAlpha = (1 - dd / 120) * 0.25;
        ctx.strokeStyle = '#8B9CFF';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);
    for (const s of this.sparks) {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.08;
      s.vx *= 0.97;
      s.life -= 0.022;
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.2 * s.life + 0.4, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    this.frameId = requestAnimationFrame(() => this.frame());
  }

  private count(): void {
    const t0 = performance.now();
    const dur = this.reduce ? 0 : 1400;
    const step = (t: number) => {
      const k = dur ? Math.min(1, (t - t0) / dur) : 1;
      this.statText.set(STATS.map((s) => Math.round(s.end * (1 - Math.pow(1 - k, 3))) + (k === 1 ? s.suffix : '')));
      if (k < 1)
        this.countId = requestAnimationFrame(step);
    };
    step(t0);
  }

  private reveal(): void {
    this.io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting)
            continue;
          en.target.classList.add('in');
          if (en.target.classList.contains('stats'))
            this.count();
          this.io?.unobserve(en.target);
        }
      },
      { threshold: 0.15 },
    );
    this.host.nativeElement.querySelectorAll('.reveal').forEach((el) => this.io!.observe(el));
  }

  private scroll(): void {
    const win = this.doc.defaultView!;
    const bar = this.bar().nativeElement;
    const update = () => {
      this.solid.set(win.scrollY > 30);
      bar.style.width = (win.scrollY / (this.doc.documentElement.scrollHeight - win.innerHeight)) * 100 + '%';
    };
    win.addEventListener('scroll', update, { passive: true, signal: this.stop.signal });
    update();
  }

  private pointer(): void {
    const win = this.doc.defaultView!;
    const on = { signal: this.stop.signal };
    const grid = this.grid().nativeElement;
    const code = this.code().nativeElement;
    const glow = this.glow().nativeElement;
    grid.addEventListener('pointermove', (e) => {
      const c = (e.target as HTMLElement).closest<HTMLElement>('.pcard');
      if (!c)
        return;
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      c.style.setProperty('--mx', x + 'px');
      c.style.setProperty('--my', y + 'px');
      c.style.transform = `perspective(900px) rotateX(${(y / r.height - 0.5) * -7}deg) rotateY(${(x / r.width - 0.5) * 7}deg)`;
    }, on);
    grid.addEventListener('pointerout', (e) => {
      const c = (e.target as HTMLElement).closest<HTMLElement>('.pcard');
      if (c && !c.contains(e.relatedTarget as Node))
        c.style.transform = '';
    }, on);
    win.addEventListener('pointermove', (e) => {
      const x = e.clientX / win.innerWidth - 0.5;
      const y = e.clientY / win.innerHeight - 0.5;
      code.style.transform = `perspective(1000px) rotateY(${-8 + x * 10}deg) rotateX(${4 - y * 8}deg)`;
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
    }, on);
    this.host.nativeElement.querySelectorAll<HTMLElement>('.magnet').forEach((m) => {
      m.addEventListener('pointermove', (e) => {
        const r = m.getBoundingClientRect();
        m.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px,${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      }, on);
      m.addEventListener('pointerleave', () => (m.style.transform = ''), on);
    });
  }

  private startSky(): void {
    const win = this.doc.defaultView!;
    const on = { signal: this.stop.signal };
    this.ctx = this.sky().nativeElement.getContext('2d');
    if (!this.ctx)
      return;
    this.size();
    win.addEventListener('resize', () => this.size(), on);
    if (!this.reduce) {
      win.addEventListener('pointermove', (e) => (this.mouse = { x: e.clientX, y: e.clientY }), on);
      win.addEventListener('pointerdown', (e) => {
        if (!(e.target as HTMLElement).closest('button'))
          this.spark(e.clientX, e.clientY);
      }, on);
      this.sparkTimer = window.setTimeout(() => this.spark(this.w * 0.3, this.h * 0.35, 40), 600);
    }
    this.frame();
  }

  private addFonts(): void {
    // The page uses its own fonts. Added once to <head>, so the prerendered HTML already links them.
    if (this.doc.getElementById('portfolio-fonts'))
      return;
    const link = (rel: string, href: string, id?: string, cors = false) => {
      const el = this.doc.createElement('link');
      el.setAttribute('rel', rel);
      el.setAttribute('href', href);
      if (id)
        el.setAttribute('id', id);
      if (cors)
        el.setAttribute('crossorigin', '');
      this.doc.head.appendChild(el);
    };
    link('preconnect', 'https://fonts.googleapis.com');
    link('preconnect', 'https://fonts.gstatic.com', undefined, true);
    link('stylesheet', FONTS, 'portfolio-fonts');
  }

  protected tag(p: Project): string {
    return p.when || (p.v ? 'Angular ' + p.v : p.label!);
  }

  protected hidden(p: Project): boolean {
    return this.filter() !== 'all' && !p.tags.includes(this.filter());
  }

  protected go(ev: Event, id: string): void {
    // Addresses use the hash for routing (/#/kunal), so in-page links scroll instead of changing the hash.
    ev.preventDefault();
    this.doc.getElementById(id)?.scrollIntoView({ behavior: this.reduce ? 'auto' : 'smooth', block: 'start' });
  }

  private center(pin: HTMLElement | null): void {
    // On narrow screens the track scrolls sideways: bring the chosen version into view.
    const sc = this.track().nativeElement.parentElement!;
    if (pin && sc.scrollWidth > sc.clientWidth)
      sc.scrollTo({ left: pin.offsetLeft - sc.clientWidth / 2, behavior: this.reduce ? 'auto' : 'smooth' });
  }

  protected pick(p: Project, ev: MouseEvent): void {
    this.selected.set(p);
    this.spark(ev.clientX, ev.clientY, 18);
    this.center(ev.currentTarget as HTMLElement);
  }

  private spark(x: number, y: number, n = 26): void {
    if (this.reduce)
      return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * 5 + 1.5;
      this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, c: COLORS[i % 3] });
    }
  }

  // #endregion
}
