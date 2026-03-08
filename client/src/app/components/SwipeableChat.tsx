import React, { useRef, useState, useEffect } from 'react';

interface SwipeableChatProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  disabled?: boolean;
}

export function SwipeableChat({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftActions,
  rightActions,
  disabled = false,
}: SwipeableChatProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const swipeThreshold = 80; // Минимальное расстояние для срабатывания
  const maxSwipe = 120; // Максимальное расстояние свайпа

  useEffect(() => {
    if (!isSwiping && touchCurrent !== null) {
      // Reset after swipe
      const timer = setTimeout(() => {
        setTouchCurrent(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isSwiping, touchCurrent]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setTouchStart(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || touchStart === null) return;
    const current = e.touches[0].clientX;
    const diff = current - touchStart;
    
    // Ограничиваем свайп
    const limitedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
    setTouchCurrent(limitedDiff);
  };

  const handleTouchEnd = () => {
    if (disabled || touchStart === null || touchCurrent === null) {
      setIsSwiping(false);
      setTouchStart(null);
      return;
    }

    // Проверяем, достигнут ли порог
    if (touchCurrent < -swipeThreshold && onSwipeLeft) {
      onSwipeLeft();
    } else if (touchCurrent > swipeThreshold && onSwipeRight) {
      onSwipeRight();
    }

    setIsSwiping(false);
    setTouchStart(null);
  };

  const translateX = touchCurrent || 0;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'pan-y', // Разрешаем только вертикальный скролл
      }}
    >
      {/* Left actions (показываются при свайпе вправо) */}
      {rightActions && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '12px',
            opacity: translateX > 0 ? Math.min(translateX / swipeThreshold, 1) : 0,
            pointerEvents: 'none',
          }}
        >
          {rightActions}
        </div>
      )}

      {/* Right actions (показываются при свайпе влево) */}
      {leftActions && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            paddingRight: '12px',
            opacity: translateX < 0 ? Math.min(-translateX / swipeThreshold, 1) : 0,
            pointerEvents: 'none',
          }}
        >
          {leftActions}
        </div>
      )}

      {/* Main content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
}
