import { useScrollReveal } from '../hooks/useScrollReveal'
import { closing } from '../content'

export function Closing() {
  const ref = useScrollReveal<HTMLElement>()

  return (
    <section
      ref={ref}
      className="relative min-h-[80vh] flex flex-col justify-center items-center text-center px-6 py-24 md:py-32"
    >
      <div
        data-reveal
        className="font-mono text-[10px] md:text-[11px] tracking-[0.32em] uppercase text-ink-soft"
      >
        {closing.eyebrow}
      </div>

      <div data-reveal className="hairline w-24 mt-8 mb-10" />

      <h2
        data-reveal
        className="font-serif text-3xl md:text-5xl tracking-tight text-ink max-w-xl leading-tight"
      >
        {closing.title}
      </h2>

      <p
        data-reveal
        className="font-serif text-sm md:text-base mt-10 leading-loose text-ink-soft max-w-md whitespace-pre-line"
      >
        {closing.body}
      </p>

      <div data-reveal className="mt-20 font-mono text-[10px] tracking-[0.3em] uppercase text-ink-soft">
        — fin —
      </div>
    </section>
  )
}
