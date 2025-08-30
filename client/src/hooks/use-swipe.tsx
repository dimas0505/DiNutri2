import { useState, useEffect, useCallback } from 'react';

interface SwipeInput {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  minSwipeDistance?: number;
}

interface TouchPosition {
  x: number;
  y: number;
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  minSwipeDistance = 50,
}: SwipeInput) {
  const [touchStartPos, setTouchStartPos] = useState<TouchPosition | null>(null);
  const [touchEndPos, setTouchEndPos] = useState<TouchPosition | null>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.targetTouches[0];
    setTouchStartPos({
      x: touch.clientX,
      y: touch.clientY,
    });
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStartPos || !touchEndPos) return;

    const distanceX = touchStartPos.x - touchEndPos.x;
    const distanceY = touchStartPos.y - touchEndPos.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
    if (isUpSwipe && onSwipeUp) {
      onSwipeUp();
    }
    if (isDownSwipe && onSwipeDown) {
      onSwipeDown();
    }
  }, [touchStartPos, touchEndPos, minSwipeDistance, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.targetTouches[0];
    setTouchEndPos({
      x: touch.clientX,
      y: touch.clientY,
    });
  }, []);

  useEffect(() => {
    document.addEventListener('touchstart', onTouchStart);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  return {
    touchStartPos,
    touchEndPos,
  };
}