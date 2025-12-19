import { useEffect, useMemo, useState } from 'react';

const BREAKPOINT_VALUES = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

const getBreakpointLabel = (width) => {
  if (width >= BREAKPOINT_VALUES.xl) {
    return 'xl';
  }
  if (width >= BREAKPOINT_VALUES.lg) {
    return 'lg';
  }
  if (width >= BREAKPOINT_VALUES.md) {
    return 'md';
  }
  if (width >= BREAKPOINT_VALUES.sm) {
    return 'sm';
  }
  return 'xs';
};

const getViewportSnapshot = () => {
  if (typeof window === 'undefined') {
    const fallbackWidth = BREAKPOINT_VALUES.lg;
    return {
      width: fallbackWidth,
      height: 0,
      breakpoint: getBreakpointLabel(fallbackWidth),
    };
  }
  const { innerWidth, innerHeight } = window;
  return {
    width: innerWidth,
    height: innerHeight,
    breakpoint: getBreakpointLabel(innerWidth),
  };
};

export const useBreakpoint = () => {
  const [viewport, setViewport] = useState(getViewportSnapshot);

  useEffect(() => {
    const handleResize = () => {
      setViewport(getViewportSnapshot());
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const flags = useMemo(() => {
    const isMobile = viewport.width < BREAKPOINT_VALUES.md;
    const isTablet =
      viewport.width >= BREAKPOINT_VALUES.md &&
      viewport.width < BREAKPOINT_VALUES.lg;
    const isDesktop = viewport.width >= BREAKPOINT_VALUES.lg;

    const up = (label) =>
      viewport.width >= (BREAKPOINT_VALUES[label] ?? Number.MAX_VALUE);
    const down = (label) => viewport.width < (BREAKPOINT_VALUES[label] ?? 0);

    return {
      isMobile,
      isTablet,
      isDesktop,
      up,
      down,
    };
  }, [viewport.width]);

  return { ...viewport, ...flags };
};
