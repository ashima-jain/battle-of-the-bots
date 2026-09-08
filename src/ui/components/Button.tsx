import { motion, type HTMLMotionProps } from 'framer-motion'

type Variant = 'primary' | 'ghost'

const STYLES: Record<Variant, string> = {
  primary:
    'bg-bot-500 text-ocean-950 font-bold shadow-[0_8px_30px_-8px_#14d1a8] hover:bg-bot-400 disabled:bg-slate-600 disabled:text-slate-400 disabled:shadow-none',
  ghost: 'border border-ocean-700 text-slate-200 hover:border-bot-400 hover:text-white',
}

export function Button({ variant = 'primary', className = '', ...props }: HTMLMotionProps<'button'> & { variant?: Variant }) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: props.disabled ? 1 : 1.03 }}
      whileTap={{ scale: props.disabled ? 1 : 0.96 }}
      className={`rounded-xl px-5 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-bot-400 ${STYLES[variant]} ${className}`}
      {...props}
    />
  )
}
