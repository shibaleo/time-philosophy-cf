import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

type Options = {
  selector?: string
  y?: number
  duration?: number
  stagger?: number
  start?: string
}

export function useScrollReveal<T extends HTMLElement = HTMLElement>(
  options: Options = {},
) {
  const ref = useRef<T>(null)
  const {
    selector = '[data-reveal]',
    y = 32,
    duration = 1.0,
    stagger = 0.1,
    start = 'top 82%',
  } = options

  useGSAP(
    () => {
      const targets = ref.current?.querySelectorAll(selector)
      if (!targets || targets.length === 0) return

      gsap.from(targets, {
        y,
        opacity: 0,
        duration,
        stagger,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: ref.current,
          start,
        },
      })
    },
    { scope: ref },
  )

  return ref
}
