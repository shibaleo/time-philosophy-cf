import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { chapters, type Property } from '../content'
import { Pictogram } from '../components/Pictogram'
import { StreamWall } from '../components/StreamWall'
import { Flow } from '../components/Flow'
import { Finite } from '../components/Finite'
import { Irreversible } from '../components/Irreversible'
import { Heterogeneous } from '../components/Heterogeneous'

gsap.registerPlugin(ScrollTrigger)

export function Properties() {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      // generic card reveal
      ref.current?.querySelectorAll('[data-prop-card]').forEach((card) => {
        const mark = card.querySelector('[data-prop-mark]')
        const lines = card.querySelectorAll('[data-prop-line]')
        if (mark) {
          gsap.from(mark, {
            y: 60,
            opacity: 0,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: { trigger: card, start: 'top 78%' },
          })
        }
        gsap.from(lines, {
          y: 24,
          opacity: 0,
          duration: 0.9,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 72%' },
        })
      })

      // chapter intro
      ref.current?.querySelectorAll('[data-chapter]').forEach((ch) => {
        const els = ch.querySelectorAll('[data-chapter-el]')
        gsap.from(els, {
          y: 30,
          opacity: 0,
          duration: 1.2,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: { trigger: ch, start: 'top 70%' },
        })
      })

      // motion: flow — text drifts down + fades, the mark keeps re-emerging
      ref.current?.querySelectorAll('[data-motion="flow"]').forEach((el) => {
        const mark = el.querySelector('[data-prop-mark]')
        if (mark) {
          gsap.to(mark, {
            yPercent: 8,
            opacity: 0.55,
            duration: 3.2,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          })
        }
      })

      // motion: shuffle — KSF order subtly reorders on scroll into view
      ref.current?.querySelectorAll('[data-motion="shuffle"]').forEach((el) => {
        const items = el.querySelectorAll('[data-shuffle-item]')
        if (items.length === 0) return
        ScrollTrigger.create({
          trigger: el,
          start: 'top 70%',
          onEnter: () => {
            const tl = gsap.timeline()
            items.forEach((it, i) => {
              tl.to(
                it,
                {
                  y: (i % 2 === 0 ? -1 : 1) * 14,
                  opacity: 0,
                  duration: 0.35,
                  ease: 'power2.in',
                },
                i * 0.05,
              )
            })
            tl.add(() => {
              const parent = items[0].parentElement
              if (!parent) return
              const arr = Array.from(items)
              // reverse order
              arr.reverse().forEach((n) => parent.appendChild(n))
            })
            tl.to(items, {
              y: 0,
              opacity: 1,
              duration: 0.55,
              stagger: 0.07,
              ease: 'power3.out',
            })
          },
        })
      })

      // motion: jitter — mark trembles subtly, occasional larger jolt
      ref.current?.querySelectorAll('[data-motion="jitter"]').forEach((el) => {
        const mark = el.querySelector('[data-prop-mark]')
        if (!mark) return
        const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'power1.inOut' } })
        tl.to(mark, { x: 2, y: -1, duration: 0.25 })
          .to(mark, { x: -2, y: 1, duration: 0.25 })
          .to(mark, { x: 1, y: 2, duration: 0.25 })
          .to(mark, { x: 0, y: 0, duration: 0.25 })
          .to(mark, { x: 8, duration: 0.12, ease: 'power3.out' })
          .to(mark, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.4)' })
          .to({}, { duration: 1.8 })
      })

      // motion: window — sweep reveal that re-closes when out of view
      ref.current?.querySelectorAll('[data-motion="window"]').forEach((el) => {
        const mark = el.querySelector('[data-prop-mark]') as HTMLElement | null
        if (!mark) return
        mark.style.clipPath = 'inset(0 100% 0 0)'
        ScrollTrigger.create({
          trigger: el,
          start: 'top 75%',
          end: 'bottom 25%',
          onEnter: () =>
            gsap.to(mark, { clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'power3.out' }),
          onLeave: () =>
            gsap.to(mark, { clipPath: 'inset(0 0 0 100%)', duration: 0.8, ease: 'power3.in' }),
          onEnterBack: () =>
            gsap.to(mark, { clipPath: 'inset(0 0% 0 0)', duration: 1.0, ease: 'power3.out' }),
          onLeaveBack: () =>
            gsap.to(mark, { clipPath: 'inset(0 100% 0 0)', duration: 0.8, ease: 'power3.in' }),
        })
      })
    },
    { scope: ref },
  )

  return (
    <section ref={ref} className="relative px-5 md:px-10 py-10 md:py-16">
      <div className="max-w-3xl mx-auto">
        {chapters.map((ch, ci) => (
          <div key={ch.id} className="mb-20 md:mb-28">
            <ChapterIntro
              numeral={ch.numeral}
              title={ch.title}
              reading={ch.reading}
              lead={ch.lead}
            />
            <ol className="space-y-10 md:space-y-14 mt-12 md:mt-16">
              {ch.properties.map((p, pi) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  index={globalIndex(ci, pi)}
                  align={pi % 2 === 0 ? 'left' : 'right'}
                />
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  )
}

function globalIndex(ci: number, pi: number) {
  let n = 0
  for (let i = 0; i < ci; i++) n += chapters[i].properties.length
  return n + pi + 1
}

function ChapterIntro({
  numeral,
  title,
  reading,
  lead,
}: {
  numeral: string
  title: string
  reading: string
  lead: string
}) {
  return (
    <div
      data-chapter
      className="text-center py-16 md:py-20 flex flex-col items-center"
    >
      <div
        data-chapter-el
        className="font-mono text-[10px] md:text-[11px] tracking-[0.4em] uppercase text-ink-soft"
      >
        Chapter {numeral}
      </div>
      <div
        data-chapter-el
        className="kanji-mark font-serif text-[120px] md:text-[180px] leading-none mt-6"
      >
        {title}
      </div>
      <div
        data-chapter-el
        className="font-mono text-[10px] tracking-[0.32em] uppercase text-ink-soft mt-4"
      >
        {reading}
      </div>
      <div data-chapter-el className="hairline w-24 mt-10 mb-8" />
      <p
        data-chapter-el
        className="font-serif text-base md:text-xl text-ink/85 max-w-md"
      >
        {lead}
      </p>
    </div>
  )
}

function PropertyCard({
  property: p,
  index,
  align,
}: {
  property: Property
  index: number
  align: 'left' | 'right'
}) {
  return (
    <li
      data-prop-card
      data-motion={p.motion}
      className={`glass rounded-3xl px-6 py-10 md:px-12 md:py-14 ${
        align === 'right' ? 'md:ml-12' : 'md:mr-12'
      }`}
    >
      <div
        data-prop-line
        className={`flex justify-between items-baseline font-mono text-[10px] tracking-[0.28em] uppercase text-ink-soft ${
          align === 'right' ? 'flex-row-reverse' : ''
        }`}
      >
        <span>{String(index).padStart(2, '0')} / 11</span>
        <span>{p.reading}</span>
      </div>

      <div
        className={`flex items-center justify-between gap-6 md:gap-12 mt-8 md:mt-12 ${
          align === 'right' ? 'flex-row-reverse' : ''
        }`}
      >
        <div
          data-prop-mark
          className="kanji-mark text-[80px] md:text-[130px] leading-none select-none"
          aria-hidden
        >
          {p.mark}
        </div>
        <div data-prop-line className="opacity-80 shrink-0">
          {p.scene === 'stream-wall' ? (
            <StreamWall className="w-[260px] md:w-[460px] h-auto" />
          ) : p.scene === 'flow' ? (
            <Flow className="w-[260px] md:w-[460px] h-auto" />
          ) : p.scene === 'finite' ? (
            <Finite className="w-[260px] md:w-[460px] h-auto" />
          ) : p.scene === 'irreversible' ? (
            <Irreversible className="w-[260px] md:w-[460px] h-auto" />
          ) : p.scene === 'heterogeneous' ? (
            <Heterogeneous className="w-[260px] md:w-[460px] h-auto" />
          ) : (
            <Pictogram
              pattern={p.pictogram}
              className="w-[220px] md:w-[320px] h-auto"
            />
          )}
        </div>
      </div>

      <h3
        data-prop-line
        className="font-serif text-2xl md:text-3xl mt-6 md:mt-8 text-ink"
      >
        {p.name}
      </h3>

      <p
        data-prop-line
        className="font-serif text-base md:text-lg mt-4 md:mt-5 leading-relaxed text-ink/85"
      >
        {p.essence}
      </p>

      <p
        data-prop-line
        className="font-sans text-[13px] md:text-sm mt-5 md:mt-6 leading-loose text-ink-soft"
      >
        {p.description}
      </p>

      <div data-prop-line className="hairline mt-8 mb-6" />

      <div data-prop-line>
        <div className="font-mono text-[10px] tracking-[0.28em] uppercase text-ink-soft mb-3">
          How to use it
        </div>
        <ul className="space-y-2">
          {p.ksf.map((k) => (
            <li
              key={k}
              data-shuffle-item
              className="font-serif text-[13px] md:text-sm text-ink/85 flex gap-3 leading-relaxed"
            >
              <span className="text-azure mt-[0.4em]">·</span>
              <span>{k}</span>
            </li>
          ))}
        </ul>
      </div>
    </li>
  )
}
