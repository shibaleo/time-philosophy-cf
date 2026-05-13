import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { intro } from '../content'

export function Hero() {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('[data-hero-eyebrow]', { y: 12, opacity: 0, duration: 0.9 })
        .from('[data-hero-title]', { y: 28, opacity: 0, duration: 1.2 }, '-=0.5')
        .from('[data-hero-lead]', { y: 18, opacity: 0, duration: 1.0 }, '-=0.6')
        .from('[data-hero-body]', { y: 14, opacity: 0, duration: 1.0 }, '-=0.6')
        .from('[data-hero-foot]', { opacity: 0, duration: 0.9 }, '-=0.5')

      gsap.to('[data-hero-orb]', {
        y: 18,
        duration: 6,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      })
    },
    { scope: ref },
  )

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex flex-col px-6 py-12 md:px-16 md:py-16 overflow-hidden"
    >
      {/* floating orbs */}
      <div
        data-hero-orb
        aria-hidden
        className="absolute -top-20 -right-16 w-[55vw] h-[55vw] max-w-[520px] max-h-[520px] rounded-full opacity-70 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(127,179,255,0.55), transparent 70%)' }}
      />
      <div
        data-hero-orb
        aria-hidden
        className="absolute bottom-0 -left-20 w-[60vw] h-[60vw] max-w-[560px] max-h-[560px] rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(184,230,223,0.6), transparent 70%)' }}
      />

      <div className="relative flex justify-between text-[10px] md:text-[11px] tracking-[0.32em] uppercase text-ink-soft">
        <span data-hero-eyebrow className="font-mono">{intro.eyebrow}</span>
        <span data-hero-eyebrow className="font-mono">011 / properties</span>
      </div>

      <div className="relative flex-1 flex flex-col justify-center items-center text-center my-10">
        <h1
          data-hero-title
          className="kanji-mark text-[28vw] md:text-[200px] tracking-tight"
        >
          {intro.title}
        </h1>

        <p
          data-hero-lead
          className="font-serif text-lg md:text-2xl mt-12 md:mt-14 text-ink/90 max-w-xl"
        >
          {intro.lead}
        </p>

        <p
          data-hero-body
          className="font-serif text-sm md:text-base mt-6 md:mt-8 leading-loose text-ink-soft max-w-md whitespace-pre-line"
        >
          {intro.body}
        </p>
      </div>

      <div
        data-hero-foot
        className="relative flex justify-between items-end text-[10px] md:text-[11px] tracking-[0.25em] uppercase text-ink-soft"
      >
        <span className="font-mono">scroll ↓</span>
        <span className="font-serif tracking-[0.15em]">時間という資産</span>
      </div>
    </section>
  )
}
