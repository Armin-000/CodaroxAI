import { useCallback, useEffect, useRef, useState } from "react";

const BOTTOM_THRESHOLD = 120;

export function useConversationScroll({
  scrollRef,
  messages,
  streaming,
}) {
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const autoFollowRef = useRef(true);
  const programmaticScrollUntilRef = useRef(0);

  const scrollToLatest = useCallback((behavior = "smooth") => {
    const element = scrollRef.current;
    if (!element) return;

    autoFollowRef.current = true;
    setShowScrollToLatest(false);
    programmaticScrollUntilRef.current =
      behavior === "smooth" ? performance.now() + 900 : 0;

    element.scrollTo({
      top: element.scrollHeight,
      behavior,
    });
  }, [scrollRef]);

  const resumeAutoFollow = useCallback(() => {
    autoFollowRef.current = true;
    setShowScrollToLatest(false);
  }, []);

  const handleConversationScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const distanceFromBottom =
      element.scrollHeight -
      element.scrollTop -
      element.clientHeight;

    const nearBottom = distanceFromBottom <= BOTTOM_THRESHOLD;

    if (programmaticScrollUntilRef.current > performance.now()) {
      if (nearBottom) programmaticScrollUntilRef.current = 0;
      autoFollowRef.current = true;
      setShowScrollToLatest(false);
      return;
    }

    autoFollowRef.current = nearBottom;
    setShowScrollToLatest(!nearBottom);
  }, [scrollRef]);

  useEffect(() => {
    if (!autoFollowRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      scrollToLatest(streaming ? "auto" : "smooth");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages, streaming, scrollToLatest]);

  return {
    showScrollToLatest,
    handleConversationScroll,
    scrollToLatest,
    resumeAutoFollow,
  };
}
