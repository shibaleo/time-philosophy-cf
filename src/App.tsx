import { Hero } from './sections/Hero'
import { Properties } from './sections/Properties'
import { Closing } from './sections/Closing'

export default function App() {
  return (
    <>
      <div className="app-bg" aria-hidden />
      <main className="relative">
        <Hero />
        <Properties />
        <Closing />
      </main>
    </>
  )
}
