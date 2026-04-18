import { createContext, useContext } from 'react'

export interface TransitionCtx {
  isTransitioning: boolean
  triggerLogin: () => void
}

export const TransitionContext = createContext<TransitionCtx>({
  isTransitioning: false,
  triggerLogin: () => {},
})

export const useLoginTransition = () => useContext(TransitionContext)
