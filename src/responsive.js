// Mobile Responsiveness Controller
// Batch 1: Responsive Design System & Breakpoints

import { useState, useEffect, useRef, useCallback } from 'react';

// Responsive breakpoints and utilities
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
};

export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    ...windowSize,
    isMobile: windowSize.width < BREAKPOINTS.mobile,
    isTablet: windowSize.width >= BREAKPOINTS.mobile && windowSize.width < BREAKPOINTS.tablet,
    isDesktop: windowSize.width >= BREAKPOINTS.tablet,
    isSmallScreen: windowSize.width < BREAKPOINTS.tablet,
  };
};

// Responsive scaling utilities
export const responsiveScale = (baseSize, mobileScale = 0.75, tabletScale = 0.9) => {
  if (typeof window === 'undefined') return baseSize;

  const width = window.innerWidth;
  if (width < BREAKPOINTS.mobile) return baseSize * mobileScale;
  if (width < BREAKPOINTS.tablet) return baseSize * tabletScale;
  return baseSize;
};

export const responsiveSpacing = (baseSpacing) => {
  if (typeof window === 'undefined') return baseSpacing;

  const width = window.innerWidth;
  if (width < BREAKPOINTS.mobile) return Math.max(baseSpacing * 0.6, 8);
  if (width < BREAKPOINTS.tablet) return baseSpacing * 0.8;
  return baseSpacing;
};

// Touch-friendly interaction utilities
export const useTouchInteraction = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return {
    isTouchDevice,
    touchProps: isTouchDevice ? {
      onTouchStart: () => {},
      onTouchEnd: () => {},
    } : {},
  };
};

// Swipe gesture hook for parameter control
export const useSwipeGesture = (onSwipeLeft, onSwipeRight, threshold = 50) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = threshold;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};

// Touch feedback hook for visual feedback
export const useTouchFeedback = () => {
  const [isPressed, setIsPressed] = useState(false);

  const touchProps = {
    onTouchStart: () => setIsPressed(true),
    onTouchEnd: () => setIsPressed(false),
    onMouseDown: () => setIsPressed(true),
    onMouseUp: () => setIsPressed(false),
    onMouseLeave: () => setIsPressed(false),
  };

  return {
    isPressed,
    touchProps,
  };
};

// Long press hook for advanced interactions
export const useLongPress = (onLongPress, onClick, delay = 500) => {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef();
  const target = useRef();

  const start = useCallback((event) => {
    event.preventDefault();
    setLongPressTriggered(false);
    timeout.current = setTimeout(() => {
      onLongPress(event);
      setLongPressTriggered(true);
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback((event, shouldTriggerClick = true) => {
    event.preventDefault();
    timeout.current && clearTimeout(timeout.current);
    if (shouldTriggerClick && !longPressTriggered) {
      onClick(event);
    }
    setLongPressTriggered(false);
  }, [onClick, longPressTriggered]);

  return {
    onMouseDown: (e) => start(e),
    onTouchStart: (e) => start(e),
    onMouseUp: (e) => clear(e),
    onMouseLeave: (e) => clear(e, false),
    onTouchEnd: (e) => clear(e),
  };
};

// Batch progress tracking
export const RESPONSIVE_BATCHES = {
  1: { name: 'Design System & Breakpoints', completed: true },
  2: { name: 'Control Bar Responsiveness', completed: true },
  3: { name: 'Typography Scaling', completed: true },
  4: { name: 'Layout Adjustments', completed: true },
  5: { name: 'Plot/Chart Responsiveness', completed: false },
  6: { name: 'Touch Interactions', completed: true },
};

export const getBatchProgress = () => {
  const completed = Object.values(RESPONSIVE_BATCHES).filter(batch => batch.completed).length;
  return {
    completed,
    total: Object.keys(RESPONSIVE_BATCHES).length,
    percentage: Math.round((completed / Object.keys(RESPONSIVE_BATCHES).length) * 100),
  };
};