import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuthModal } from '@/context/auth-modal-context'
import { authClient } from '@/lib/auth-client'

/** Served from `public/hero-video.mp4` (source: `anton/src/video_5.mp4`) */
const HERO_VIDEO_SRC = '/hero-video.mp4'

const HERO_STAR_FAR = 150
const HERO_STAR_NEAR = 100
const PHI = 0.61803398875

function halton(index: number, base: number): number {
  let h = 0
  let f = 1 / base
  let i = index + 1
  while (i > 0) {
    h += f * (i % base)
    i = Math.floor(i / base)
    f /= base
  }
  return h
}

function haltonXY(i: number): [number, number] {
  return [halton(i, 2) * 100, halton(i, 3) * 100]
}

const STAR_COLORS = [
  '#ffffff',
  '#e8f2ff',
  '#fff9f3',
  '#d4e9ff',
  '#f0f4ff',
] as const

type StarSpec = {
  key: string
  x: number
  y: number
  s: number
  color: string
  glow: string
  a: number
  b: number
  dur: number
  delay: number
}

function HeroStarfield() {
  const stars = useMemo(() => {
    const out: StarSpec[] = []

    for (let i = 0; i < HERO_STAR_FAR; i++) {
      const [x, y] = haltonXY(i + 3)
      const s = 1 + (i % 5) * 0.48
      const color = STAR_COLORS[i % STAR_COLORS.length]
      const strength = (i * 7) % 6
      const a = 0.12 + strength * 0.038
      const b = a + 0.09 + ((i * 3) % 5) * 0.032
      out.push({
        key: `far-${i}-${x.toFixed(3)}-${y.toFixed(3)}`,
        x,
        y,
        s,
        color,
        glow: `0 0 ${4 + (i % 4)}px rgba(255,255,255,${0.3 + (i % 4) * 0.08})`,
        a,
        b,
        dur: 6.2 + (i % 9) * 0.72,
        delay: ((i * 0.17) % 8) + (i % 3) * 0.35,
      })
    }

    for (let j = 0; j < HERO_STAR_NEAR; j++) {
      const [x, y] = haltonXY(j + 400)
      const s = j % 7 === 0 ? 3 : j % 4 === 0 ? 2.4 : 1.55
      const color = STAR_COLORS[(j * 3) % STAR_COLORS.length]
      const strength = 2 + (j % 5)
      const a = 0.22 + strength * 0.048
      const b = a + 0.12 + ((j * 5) % 6) * 0.04
      out.push({
        key: `near-${j}-${x.toFixed(3)}-${y.toFixed(3)}`,
        x,
        y,
        s,
        color,
        glow:
          j % 6 === 0
            ? '0 0 12px 3px rgba(200, 230, 255, 0.45)'
            : `0 0 ${7 + (j % 4)}px rgba(255,255,255,${0.38 + (j % 3) * 0.09})`,
        a,
        b,
        dur: 4 + (j % 7) * 0.58,
        delay: ((j * PHI) % 6.2) + 0.15,
      })
    }

    return out
  }, [])

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] mix-blend-screen opacity-90"
      aria-hidden
    >
      {stars.map((st) => (
        <span
          key={st.key}
          className="absolute rounded-full"
          style={{
            left: `${st.x}%`,
            top: `${st.y}%`,
            width: st.s,
            height: st.s,
            backgroundColor: st.color,
            transform: 'translate(-50%, -50%)',
            boxShadow: st.glow,
            ['--star-a' as string]: st.a,
            ['--star-b' as string]: st.b,
            animationName: 'hero-star-pulse',
            animationDuration: `${st.dur}s`,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDelay: `${st.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

/** Soft crossfade at loop: gentle dip in opacity (not to black) over a longer window. */
function HeroLoopVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const prevTime = useRef(0)

  useEffect(() => {
    const v = ref.current
    if (!v) return

    const fadeSec = 0.65
    const minOpacity = 0.74
    const loopJumpDetectSec = 0.55
    let raf = 0

    const tick = () => {
      const t = v.currentTime
      const d = v.duration
      if (!d || !Number.isFinite(d)) {
        raf = requestAnimationFrame(tick)
        return
      }

      const prev = prevTime.current
      const jumpedToStart = prev > d - loopJumpDetectSec && t < loopJumpDetectSec

      /** Blend between full visibility and `minOpacity` (1 → min over fade window). */
      const blend = (progressThroughFade: number) =>
        minOpacity + (1 - minOpacity) * progressThroughFade

      let o = 1
      if (t > d - fadeSec) {
        o = blend(Math.max(0, (d - t) / fadeSec))
      } else if (jumpedToStart && t < fadeSec) {
        o = blend(Math.min(1, t / fadeSec))
      }

      v.style.opacity = String(o)
      prevTime.current = t
      raf = requestAnimationFrame(tick)
    }

    const onPlaying = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(tick)
    }
    const stop = () => cancelAnimationFrame(raf)

    v.addEventListener('playing', onPlaying)
    v.addEventListener('pause', stop)
    v.addEventListener('ended', stop)

    if (!v.paused) onPlaying()

    return () => {
      stop()
      v.removeEventListener('playing', onPlaying)
      v.removeEventListener('pause', stop)
      v.removeEventListener('ended', stop)
    }
  }, [])

  return (
    <video
      ref={ref}
      className={className}
      style={{
        willChange: 'opacity',
      }}
      autoPlay
      loop
      muted
      playsInline
      aria-hidden
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}

/* ─── Article Card ─── */

type CardData = {
  tag: string
  title: string
  paragraphs: string[]
  image?: string
}

function ArticleCard({ tag, title, paragraphs, image }: CardData) {
  return (
    <div className="relative flex min-h-[26rem] flex-col overflow-hidden rounded-2xl md:min-h-[32rem] lg:min-h-[34rem]">
      {image ? (
        <img
          src={image}
          alt=""
          className="absolute inset-0 z-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="absolute inset-0 z-0 bg-gradient-to-br from-white/10 to-white/[0.02]"
          aria-hidden
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/35 to-transparent"
        aria-hidden
      />
      <div className="relative z-[2] mt-auto p-4 md:p-6">
        <div className="liquid-glass flex flex-col gap-3 rounded-xl p-4 md:gap-4 md:rounded-2xl md:p-6">
          <p className="text-[0.6rem] font-medium uppercase tracking-[0.28em] text-white/70">
            {tag}
          </p>
          <h3
            className="text-xl font-normal leading-[1.15] tracking-tight text-white md:text-2xl lg:text-[1.65rem]"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {title}
          </h3>
          <div className="flex flex-col gap-3 md:gap-4">
            {paragraphs.map((p) => (
              <p
                key={p}
                className="text-sm leading-[1.65] text-white/88 md:text-[0.9375rem] md:leading-[1.7]"
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionCards({ cards }: { cards: CardData[] }) {
  return (
    <div className="mx-auto max-w-2xl px-6 lg:max-w-3xl">
      {cards.map((c) => (
        <ArticleCard key={c.title} {...c} />
      ))}
    </div>
  )
}

/* ─── Card content data ─── */

/** Single public feature card. Extra photography lives in `public/` for later passes: `/feature2.jpg`, `/feature3.jpg`. */
const PRODUCT_CARDS: CardData[] = [
  {
    tag: 'One room for your mind',
    title: 'Anton is the opposite of another tab to babysit.',
    paragraphs: [
      'Most tools compete for your nervous system—badges, feeds, fifteen inboxes pretending they are all urgent. Anton is built on a quieter bet: one native surface where an agent, your files, and the context of an actual day can breathe together, without turning work into a slot machine.',
      'We are not here to rename “busy” into “efficient.” We are here to give your attention a shoreline—so the mail you dread, the branch you never merged, and the calendar debt you carry stop living in separate rooms you have to glue together in your head at 11 p.m.',
      'Personal software used to mean something made for a human rhythm: strong when you need it, invisible when you do not, honest about limits. Anton chases that old standard—foreground when you open it, respectful when you close it. The louder stories and extra canvases can wait until the work earns them.',
    ],
    image: '/feature1.jpg',
  },
]

/* ─── Section type ─── */

type Section = 'home' | 'product'

const SECTION_ORDER: Section[] = ['home', 'product']

function sectionElId(s: Section) {
  return `section-${s}`
}

function headerChromeForSection(section: Section): string {
  switch (section) {
    case 'home':
      return 'bg-transparent'
    case 'product':
      return 'bg-background'
  }
}

export function Landing() {
  const { openLogin } = useAuthModal()
  const { data: session } = authClient.useSession()
  const [activeSection, setActiveSection] = useState<Section>('home')

  const scrollSyncPaused = useRef(false)
  const scrollArmTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const landingRootRef = useRef<HTMLDivElement>(null)
  const horizontalScrollerRef = useRef<HTMLDivElement>(null)
  const activeSectionRef = useRef<Section>(activeSection)
  activeSectionRef.current = activeSection

  /* No document vertical scroll on this route — panels move only horizontally */
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow
    const prevBody = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prevHtml
      document.body.style.overflow = prevBody
    }
  }, [])

  const syncActiveFromScroll = useCallback(() => {
    if (scrollSyncPaused.current) return
    const scroller = horizontalScrollerRef.current
    if (!scroller) return
    const w = scroller.clientWidth
    if (w <= 0) return
    const i = Math.min(
      SECTION_ORDER.length - 1,
      Math.max(0, Math.round(scroller.scrollLeft / w)),
    )
    const next = SECTION_ORDER[i]
    if (next === undefined) return
    setActiveSection((prev) => (prev === next ? prev : next))
  }, [])

  useEffect(() => {
    const root = landingRootRef.current
    const scroller = horizontalScrollerRef.current
    if (!root || !scroller) return

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        syncActiveFromScroll()
        ticking = false
      })
    }

    syncActiveFromScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })

    /** Route wheel to horizontal panels; never let the page scroll vertically. */
    const onWheelCapture = (e: WheelEvent) => {
      if (!root.contains(e.target as Node)) return

      const panel = (e.target as Element | null)?.closest('[data-panel-scroll]') as HTMLElement | null
      if (panel && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        const { scrollTop, scrollHeight, clientHeight } = panel
        const dy = e.deltaY
        const canUp = scrollTop > 0
        const canDown = scrollTop + clientHeight < scrollHeight - 1
        if ((dy < 0 && canUp) || (dy > 0 && canDown)) return
      }

      e.preventDefault()
      scroller.scrollLeft += e.deltaY + e.deltaX
    }
    root.addEventListener('wheel', onWheelCapture, { passive: false, capture: true })

    const onResize = () => {
      const idx = SECTION_ORDER.indexOf(activeSectionRef.current)
      const w = scroller.clientWidth
      if (idx >= 0 && w > 0) scroller.scrollLeft = idx * w
    }
    window.addEventListener('resize', onResize)

    return () => {
      scroller.removeEventListener('scroll', onScroll)
      root.removeEventListener('wheel', onWheelCapture, true)
      window.removeEventListener('resize', onResize)
    }
  }, [syncActiveFromScroll])

  const scrollToSection = useCallback(
    (section: Section) => {
      const scroller = horizontalScrollerRef.current
      const el = document.getElementById(sectionElId(section))
      if (!scroller || !el) return
      if (scrollArmTimeout.current) clearTimeout(scrollArmTimeout.current)
      scrollSyncPaused.current = true
      setActiveSection(section)
      const w = scroller.clientWidth
      const idx = SECTION_ORDER.indexOf(section)
      if (idx >= 0 && w > 0) {
        scroller.scrollTo({ left: idx * w, behavior: 'smooth' })
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
      }
      scrollArmTimeout.current = setTimeout(() => {
        scrollSyncPaused.current = false
        syncActiveFromScroll()
      }, 700)
    },
    [syncActiveFromScroll],
  )

  useEffect(() => {
    return () => {
      if (scrollArmTimeout.current) clearTimeout(scrollArmTimeout.current)
    }
  }, [])

  return (
    <div
      ref={landingRootRef}
      className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden overscroll-y-none bg-background text-white"
    >
      {/* Hero video only on Home; other slides use their own panel backgrounds */}
      <div
        className={`pointer-events-none fixed inset-0 z-0 transition-opacity duration-500 ease-out ${
          activeSection === 'home' ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={activeSection !== 'home'}
      >
        <div className="absolute inset-0 bg-slate-200">
          <HeroLoopVideo
            src={HERO_VIDEO_SRC}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </div>
        <HeroStarfield />
      </div>

      {/* Nav sits over video on Home; matches solid chrome on other slides */}
      <header
        className={`relative z-30 shrink-0 transition-colors duration-300 ${headerChromeForSection(activeSection)}`}
      >
        <nav
          className={`mx-auto flex max-w-7xl items-center gap-2 px-4 py-5 sm:gap-3 sm:px-8 sm:py-6 ${
            activeSection === 'home' ? 'drop-shadow-[0_1px_12px_rgba(0,0,0,0.45)]' : ''
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center justify-start">
            <Link
              to="/"
              className="flex min-w-0 items-center gap-2.5 text-white sm:gap-3"
              style={{ fontFamily: "'Instrument Serif', serif" }}
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('home')
              }}
            >
              <img
                src="/anton-logo.png"
                alt=""
                className="size-8 shrink-0 rounded-md object-cover sm:h-9 sm:w-9"
                width={36}
                height={36}
              />
              <span className="truncate text-2xl tracking-tight sm:text-3xl">
                Anton<sup className="text-xs text-white/65">®</sup>
              </span>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => scrollToSection('product')}
            className={`liquid-glass liquid-glass-flat relative z-[1] shrink-0 rounded-full px-4 py-2 text-xs whitespace-nowrap transition-all duration-200 hover:scale-[1.03] sm:px-6 sm:py-2.5 sm:text-sm ${
              activeSection === 'product'
                ? 'font-medium text-white'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Product
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-end">
            {session?.user ? (
              <Link
                to="/dashboard"
                className="liquid-glass inline-flex items-center justify-center rounded-full px-4 py-2 text-xs text-white whitespace-nowrap transition-transform hover:scale-[1.03] sm:px-6 sm:py-2.5 sm:text-sm"
              >
                Open Anton
              </Link>
            ) : (
              <button
                type="button"
                className="liquid-glass inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2 text-xs text-white whitespace-nowrap transition-transform hover:scale-[1.03] sm:px-6 sm:py-2.5 sm:text-sm"
                onClick={() => openLogin()}
              >
                Open Anton
              </button>
            )}
          </div>
        </nav>
      </header>

      <main
        ref={horizontalScrollerRef}
        className="relative z-10 flex min-h-0 min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain overscroll-y-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <section
          id={sectionElId('home')}
          data-panel-scroll
          className="relative isolate flex h-full min-h-0 min-w-full shrink-0 snap-center snap-always flex-col items-center justify-center overflow-y-auto overflow-x-hidden bg-transparent px-6 py-16 text-center sm:py-20"
        >
          <div className="relative z-10 flex flex-col items-center text-center">
          <h1
            className="max-w-7xl text-5xl font-normal leading-[0.95] tracking-[-2.46px] sm:text-7xl md:text-8xl"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Your personal <em className="not-italic text-white/80">superagent.</em>
          </h1>
          <p className="mt-8 max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
            One agent. Everything you'd rather not do yourself.
          </p>
          {session?.user ? (
            <Link
              to="/dashboard"
              className="liquid-glass mt-12 inline-flex cursor-pointer items-center justify-center rounded-full px-14 py-5 text-base text-white transition-transform hover:scale-[1.03]"
            >
              Open Anton
            </Link>
          ) : (
            <button
              type="button"
              className="liquid-glass mt-12 inline-flex cursor-pointer items-center justify-center rounded-full px-14 py-5 text-base text-white transition-transform hover:scale-[1.03]"
              onClick={() => openLogin()}
            >
              Open Anton
            </button>
          )}
          </div>
        </section>

        <section
          id={sectionElId('product')}
          data-panel-scroll
          className="flex h-full min-h-0 min-w-full shrink-0 snap-center snap-always flex-col overflow-y-auto overflow-x-hidden bg-background py-12 sm:py-16"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center py-4">
            <SectionCards cards={PRODUCT_CARDS} />
          </div>
        </section>
      </main>
    </div>
  )
}
