import { useCallback, useRef, useState } from 'react';

const DRAG_THRESHOLD = 8;

export interface Point {
  readonly x: number;
  readonly y: number;
}

interface DragCallbacks {
  onTap: () => void;
  onDragStart: () => void;
  onDragMove: (pos: Point) => void;
  onDragEnd: (pos: Point) => void;
}

interface PointerHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
}

export function useDrag(callbacks: DragCallbacks) {
  const [isDragging, setIsDragging] = useState(false);
  const stateRef = useRef<{
    active: boolean;
    dragging: boolean;
    startX: number;
    startY: number;
    pointerId: number;
    element: HTMLElement | null;
  }>({ active: false, dragging: false, startX: 0, startY: 0, pointerId: -1, element: null });

  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const onPointerMove = useCallback((e: PointerEvent) => {
    const s = stateRef.current;
    if (!s.active || e.pointerId !== s.pointerId) return;

    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;

    if (!s.dragging && dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
      s.dragging = true;
      setIsDragging(true);
      cbRef.current.onDragStart();
    }

    if (s.dragging) {
      cbRef.current.onDragMove({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const onPointerUp = useCallback((e: PointerEvent) => {
    const s = stateRef.current;
    if (!s.active || e.pointerId !== s.pointerId) return;

    const el = s.element;
    s.active = false;
    s.element = null;

    if (el) {
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      try { el.releasePointerCapture(s.pointerId); } catch { /* already released */ }
    }

    if (s.dragging) {
      s.dragging = false;
      setIsDragging(false);
      cbRef.current.onDragEnd({ x: e.clientX, y: e.clientY });
    } else {
      cbRef.current.onTap();
    }
  }, [onPointerMove]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    const s = stateRef.current;

    s.active = true;
    s.dragging = false;
    s.startX = e.clientX;
    s.startY = e.clientY;
    s.pointerId = e.pointerId;
    s.element = el;

    try { el.setPointerCapture(e.pointerId); } catch { /* unsupported */ }

    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
  }, [onPointerMove, onPointerUp]);

  const handlers: PointerHandlers = { onPointerDown };

  return { isDragging, handlers };
}
