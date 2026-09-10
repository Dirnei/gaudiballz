import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { useDrag } = await import('./useDrag');

function pointerMove(target: HTMLElement, x: number, y: number, pointerId = 1) {
  target.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, pointerId, bubbles: true }));
}

function pointerUp(target: HTMLElement, x: number, y: number, pointerId = 1) {
  target.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId, bubbles: true }));
}

describe('useDrag', () => {
  it('fires onTap when released below the movement threshold', () => {
    const onTap = vi.fn();
    const onDragStart = vi.fn();
    const { result } = renderHook(() => useDrag({ onTap, onDragStart, onDragMove: vi.fn(), onDragEnd: vi.fn() }));

    const el = document.createElement('div');
    el.setPointerCapture = vi.fn();
    el.releasePointerCapture = vi.fn();
    document.body.appendChild(el);

    act(() => {
      result.current.handlers.onPointerDown({ currentTarget: el, clientX: 100, clientY: 100, pointerId: 1, preventDefault: vi.fn() } as any);
    });
    act(() => {
      pointerUp(el, 102, 103, 1);
    });

    expect(onTap).toHaveBeenCalled();
    expect(onDragStart).not.toHaveBeenCalled();

    document.body.removeChild(el);
  });

  it('transitions to drag mode when movement exceeds threshold', () => {
    const onDragStart = vi.fn();
    const onDragMove = vi.fn();
    const { result } = renderHook(() => useDrag({ onTap: vi.fn(), onDragStart, onDragMove, onDragEnd: vi.fn() }));

    const el = document.createElement('div');
    el.setPointerCapture = vi.fn();
    el.releasePointerCapture = vi.fn();
    document.body.appendChild(el);

    act(() => {
      result.current.handlers.onPointerDown({ currentTarget: el, clientX: 100, clientY: 100, pointerId: 1, preventDefault: vi.fn() } as any);
    });
    act(() => {
      pointerMove(el, 120, 100, 1);
    });

    expect(onDragStart).toHaveBeenCalled();
    expect(onDragMove).toHaveBeenCalledWith(expect.objectContaining({ x: 120, y: 100 }));

    document.body.removeChild(el);
  });

  it('reports isDragging while drag is active', () => {
    const { result } = renderHook(() => useDrag({ onTap: vi.fn(), onDragStart: vi.fn(), onDragMove: vi.fn(), onDragEnd: vi.fn() }));

    const el = document.createElement('div');
    el.setPointerCapture = vi.fn();
    el.releasePointerCapture = vi.fn();
    document.body.appendChild(el);

    expect(result.current.isDragging).toBe(false);

    act(() => {
      result.current.handlers.onPointerDown({ currentTarget: el, clientX: 100, clientY: 100, pointerId: 1, preventDefault: vi.fn() } as any);
    });
    act(() => {
      pointerMove(el, 120, 100, 1);
    });

    expect(result.current.isDragging).toBe(true);

    act(() => {
      pointerUp(el, 120, 100, 1);
    });

    expect(result.current.isDragging).toBe(false);

    document.body.removeChild(el);
  });

  it('calls onDragEnd with final position on release after drag', () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() => useDrag({ onTap: vi.fn(), onDragStart: vi.fn(), onDragMove: vi.fn(), onDragEnd }));

    const el = document.createElement('div');
    el.setPointerCapture = vi.fn();
    el.releasePointerCapture = vi.fn();
    document.body.appendChild(el);

    act(() => {
      result.current.handlers.onPointerDown({ currentTarget: el, clientX: 100, clientY: 100, pointerId: 1, preventDefault: vi.fn() } as any);
    });
    act(() => {
      pointerMove(el, 120, 100, 1);
    });
    act(() => {
      pointerUp(el, 130, 110, 1);
    });

    expect(onDragEnd).toHaveBeenCalledWith(expect.objectContaining({ x: 130, y: 110 }));

    document.body.removeChild(el);
  });

  it('does not fire onTap after a drag', () => {
    const onTap = vi.fn();
    const { result } = renderHook(() => useDrag({ onTap, onDragStart: vi.fn(), onDragMove: vi.fn(), onDragEnd: vi.fn() }));

    const el = document.createElement('div');
    el.setPointerCapture = vi.fn();
    el.releasePointerCapture = vi.fn();
    document.body.appendChild(el);

    act(() => {
      result.current.handlers.onPointerDown({ currentTarget: el, clientX: 100, clientY: 100, pointerId: 1, preventDefault: vi.fn() } as any);
    });
    act(() => {
      pointerMove(el, 120, 100, 1);
    });
    act(() => {
      pointerUp(el, 120, 100, 1);
    });

    expect(onTap).not.toHaveBeenCalled();

    document.body.removeChild(el);
  });
});
