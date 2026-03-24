import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function readViewport() {
  if (typeof window === 'undefined') {
    return { width: 430, height: 932 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function useLandscapeGameLayout() {
  const [viewport, setViewport] = useState(readViewport);
  const [guidePanelNode, setGuidePanelNode] = useState(null);
  const [actionPanelNode, setActionPanelNode] = useState(null);
  const guidePanelElementRef = useRef(null);
  const actionPanelElementRef = useRef(null);
  const guideTouchRef = useRef(null);
  const actionTouchRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const update = () => setViewport(readViewport());
    update();

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const guidePanelRef = useCallback((node) => {
    guidePanelElementRef.current = node;
    setGuidePanelNode(node);
  }, []);

  const actionPanelRef = useCallback((node) => {
    actionPanelElementRef.current = node;
    setActionPanelNode(node);
  }, []);

  const buildPanelTouchHandlers = useCallback((panelRef, touchRef, rotated) => {
    const startDrag = (clientX, clientY, pointerId = null) => {
      const panel = panelRef.current;
      if (!panel || panel.scrollHeight <= panel.clientHeight) return false;

      touchRef.current = {
        startX: clientX,
        startY: clientY,
        startScrollTop: panel.scrollTop,
        dragging: false,
        axis: null,
        pointerId,
      };
      return true;
    };

    const updateDrag = (event, clientX, clientY, pointerId = null) => {
      const panel = panelRef.current;
      const touchState = touchRef.current;
      if (!panel || !touchState || panel.scrollHeight <= panel.clientHeight) return;
      if (pointerId !== null && touchState.pointerId !== pointerId) return;

      const deltaX = clientX - touchState.startX;
      const deltaY = clientY - touchState.startY;
      const maxDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));

      if (!touchState.dragging) {
        if (maxDelta < 4) return;
        touchState.dragging = true;
        touchState.axis = Math.abs(deltaX) >= Math.abs(deltaY) ? 'x' : 'y';
      }

      const scrollDelta = touchState.axis === 'x' ? deltaX : -deltaY;
      panel.scrollTop = touchState.startScrollTop + scrollDelta;

      if (event.cancelable) {
        event.preventDefault();
      }
    };

    const clearDrag = (pointerId = null) => {
      if (pointerId !== null && touchRef.current?.pointerId !== pointerId) return;
      touchRef.current = null;
    };

    return {
      onPointerDown: (event) => {
        if (!rotated) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (!startDrag(event.clientX, event.clientY, event.pointerId)) return;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      },
      onPointerMove: (event) => {
        if (!rotated) return;
        updateDrag(event, event.clientX, event.clientY, event.pointerId);
      },
      onPointerUp: (event) => {
        clearDrag(event.pointerId);
      },
      onPointerCancel: (event) => {
        clearDrag(event.pointerId);
      },
      onTouchStart: (event) => {
        if (!rotated || event.touches.length !== 1 || touchRef.current?.pointerId !== null) return;
        const touch = event.touches[0];
        startDrag(touch.clientX, touch.clientY);
      },
      onTouchMove: (event) => {
        if (!rotated || event.touches.length !== 1 || touchRef.current?.pointerId !== null) return;
        const touch = event.touches[0];
        updateDrag(event, touch.clientX, touch.clientY);
      },
      onTouchEnd: () => {
        if (touchRef.current?.pointerId !== null) return;
        clearDrag();
      },
      onTouchCancel: () => {
        if (touchRef.current?.pointerId !== null) return;
        clearDrag();
      },
    };
  }, []);

  const isPortraitViewport = viewport.height > viewport.width;

  useEffect(() => {
    if (!isPortraitViewport) return undefined;

    const bindTouchScroll = (node, elementRef, touchRef) => {
      if (!node) return () => {};

      const handlers = buildPanelTouchHandlers(elementRef, touchRef, true);
      node.addEventListener('pointerdown', handlers.onPointerDown);
      node.addEventListener('pointermove', handlers.onPointerMove, { passive: false });
      node.addEventListener('pointerup', handlers.onPointerUp);
      node.addEventListener('pointercancel', handlers.onPointerCancel);
      node.addEventListener('touchstart', handlers.onTouchStart, { passive: true });
      node.addEventListener('touchmove', handlers.onTouchMove, { passive: false });
      node.addEventListener('touchend', handlers.onTouchEnd, { passive: true });
      node.addEventListener('touchcancel', handlers.onTouchCancel, { passive: true });

      return () => {
        node.removeEventListener('pointerdown', handlers.onPointerDown);
        node.removeEventListener('pointermove', handlers.onPointerMove);
        node.removeEventListener('pointerup', handlers.onPointerUp);
        node.removeEventListener('pointercancel', handlers.onPointerCancel);
        node.removeEventListener('touchstart', handlers.onTouchStart);
        node.removeEventListener('touchmove', handlers.onTouchMove);
        node.removeEventListener('touchend', handlers.onTouchEnd);
        node.removeEventListener('touchcancel', handlers.onTouchCancel);
      };
    };

    const detachGuide = bindTouchScroll(guidePanelNode, guidePanelElementRef, guideTouchRef);
    const detachAction = bindTouchScroll(actionPanelNode, actionPanelElementRef, actionTouchRef);

    return () => {
      detachGuide();
      detachAction();
    };
  }, [actionPanelNode, buildPanelTouchHandlers, guidePanelNode, isPortraitViewport]);

  return useMemo(() => {
    const sceneWidth = Math.max(viewport.width, viewport.height);
    const sceneHeight = Math.min(viewport.width, viewport.height);
    const panelWidth = Math.min(Math.max(sceneWidth * 0.34, 260), 340);
    const overlayRight = panelWidth + 32;
    const rotatedPanelTouchAction = isPortraitViewport ? 'none' : 'pan-y';

    return {
      isPortraitViewport,
      sceneWidth,
      sceneHeight,
      panelWidth,
      overlayRight,
      guidePanelRef,
      actionPanelRef,
      guidePanelHandlers: buildPanelTouchHandlers(guidePanelElementRef, guideTouchRef, isPortraitViewport),
      actionPanelHandlers: buildPanelTouchHandlers(actionPanelElementRef, actionTouchRef, isPortraitViewport),
      outerStyle: {
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#0a1628',
      },
      portraitGuideOverlayStyle: {
        position: 'fixed',
        inset: 0,
        zIndex: 140,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        padding: `calc(12px + env(safe-area-inset-top, 0px)) 12px calc(20px + env(safe-area-inset-bottom, 0px))`,
        background: 'rgba(7, 16, 30, 0.74)',
      },
      portraitGuideCardStyle: {
        width: 'min(100%, 420px)',
        maxHeight: 'calc(100dvh - 24px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: 'pan-y',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        pointerEvents: 'auto',
      },
      portraitGuideFooterStyle: {
        position: 'sticky',
        bottom: 0,
        zIndex: 2,
        marginTop: 'auto',
        paddingTop: 10,
        background: 'linear-gradient(180deg, rgba(7,16,30,0) 0%, rgba(7,16,30,0.92) 34%, rgba(7,16,30,1) 100%)',
      },
      stageStyle: isPortraitViewport
        ? {
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: sceneWidth,
            height: sceneHeight,
            transform: 'translate(-50%, -50%) rotate(90deg)',
            transformOrigin: 'center center',
            overflow: 'hidden',
            background: '#0a1628',
          }
        : {
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            background: '#0a1628',
          },
      guidePanelStyle: {
        position: 'absolute',
        top: 12,
        right: 12,
        bottom: 12,
        width: panelWidth,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: rotatedPanelTouchAction,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      },
      actionPanelStyle: {
        position: 'absolute',
        top: 12,
        right: 12,
        bottom: 12,
        width: panelWidth,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        gap: 12,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: rotatedPanelTouchAction,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      },
    };
  }, [buildPanelTouchHandlers, viewport.height, viewport.width]);
}
