import { motion } from 'framer-motion'

interface Props {
  size?: number
  variant?: 'hero' | 'page'
}

export default function StudyHubLogo({ size = 120, variant = 'page' }: Props) {
  return (
    <motion.img
      src="/logo-black.png"
      alt="Study Hub"
      width={size}
      style={{ display: 'block', userSelect: 'none' }}
      initial={variant === 'hero' ? { opacity: 0, scale: 0.88 } : { opacity: 1, scale: 1 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={variant === 'hero' ? { duration: 0.7, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
      draggable={false}
    />
  )
}
