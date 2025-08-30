import * as React from "react"
import { getBreakpoint, isMobileBreakpoint, isTouchDevice, debounce, MOBILE_BREAKPOINTS } from "@/utils/mobile"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<keyof typeof MOBILE_BREAKPOINTS>(() => getBreakpoint())

  React.useEffect(() => {
    const handleResize = debounce(() => {
      setBreakpoint(getBreakpoint())
    }, 100)

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return breakpoint
}

export function useIsTouch() {
  const [isTouch, setIsTouch] = React.useState<boolean>(() => isTouchDevice())

  React.useEffect(() => {
    setIsTouch(isTouchDevice())
  }, [])

  return isTouch
}

export function useMobileOrientation() {
  const [orientation, setOrientation] = React.useState<'portrait' | 'landscape'>(() => {
    if (typeof window === 'undefined') return 'portrait'
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  })

  React.useEffect(() => {
    const handleOrientationChange = debounce(() => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
    }, 100)

    window.addEventListener('resize', handleOrientationChange)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.removeEventListener('resize', handleOrientationChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])

  return orientation
}
