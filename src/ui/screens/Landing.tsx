import { motion } from 'framer-motion'
import { Button } from '../components/Button'

const STEPS = [
  { icon: '⚓', title: 'Hide your fleet', text: 'You and the bot each hide 5 ships on a 10×10 grid. Neither of you can see the other’s ships.' },
  { icon: '🎯', title: 'Take turns firing', text: 'Click a square on the enemy grid to fire. A ✕ means you hit a ship; a dot means water.' },
  { icon: '💥', title: 'Sink them all', text: 'Hit every square of a ship to sink it. Sink all 5 before the bot sinks yours.' },
]

export function Landing({ onStart, onFriend }: { onStart: () => void; onFriend: () => void }) {
  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-bot-400">Battleship, reprogrammed</p>
        <h1 className="text-5xl font-black leading-none tracking-tight sm:text-7xl">
          Battle of the <span className="text-bot-400">Bots</span>
        </h1>
        <p className="mt-4 text-lg text-slate-300">Sink Commander BOLT’s fleet before it sinks yours.</p>
      </motion.div>

      <motion.ol
        className="grid gap-4 sm:grid-cols-3"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } } }}
      >
        {STEPS.map((step, i) => (
          <motion.li
            key={step.title}
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="rounded-2xl bg-ocean-900/70 p-5 text-left shadow-[0_0_0_1px_#1b3a7a]"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-2xl" aria-hidden>
                {step.icon}
              </span>
              <span className="text-xs text-slate-500">Step {i + 1}</span>
            </div>
            <h3 className="font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{step.text}</p>
          </motion.li>
        ))}
      </motion.ol>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-col items-center gap-2">
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button onClick={onStart} className="px-10 py-4 text-lg">
            Play against BOLT
          </Button>
          <Button variant="ghost" onClick={onFriend} className="px-8 py-4 text-lg">
            Play with a friend
          </Button>
        </div>
        <p className="text-xs text-slate-500">Takes about 3 minutes. No sign-up. Friend mode: share a link, they join from their device.</p>
      </motion.div>
    </main>
  )
}
