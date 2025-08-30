export const MOBILE_BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export const MOBILE_BREAKPOINT = MOBILE_BREAKPOINTS.md;

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function getBreakpoint(): keyof typeof MOBILE_BREAKPOINTS {
  if (typeof window === 'undefined') return 'md';
  
  const width = window.innerWidth;
  
  if (width >= MOBILE_BREAKPOINTS['2xl']) return '2xl';
  if (width >= MOBILE_BREAKPOINTS.xl) return 'xl';
  if (width >= MOBILE_BREAKPOINTS.lg) return 'lg';
  if (width >= MOBILE_BREAKPOINTS.md) return 'md';
  if (width >= MOBILE_BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

export function isBreakpoint(breakpoint: keyof typeof MOBILE_BREAKPOINTS): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= MOBILE_BREAKPOINTS[breakpoint];
}

export function isMobileBreakpoint(): boolean {
  return !isBreakpoint('md');
}

export function addTouchClass(): void {
  if (typeof document === 'undefined') return;
  
  if (isTouchDevice()) {
    document.documentElement.classList.add('touch');
  } else {
    document.documentElement.classList.add('no-touch');
  }
}

// Debounce function for resize events
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}