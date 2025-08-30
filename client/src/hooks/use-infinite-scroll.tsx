import { useState, useEffect, useCallback } from 'react';

interface UseInfiniteScrollProps {
  fetchMore: () => Promise<void>;
  hasMore: boolean;
  threshold?: number;
  rootMargin?: string;
}

export function useInfiniteScroll({
  fetchMore,
  hasMore,
  threshold = 1.0,
  rootMargin = '0px',
}: UseInfiniteScrollProps) {
  const [isFetching, setIsFetching] = useState(false);
  const [targetRef, setTargetRef] = useState<Element | null>(null);

  const handleIntersection = useCallback(
    async (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isFetching) {
        setIsFetching(true);
        try {
          await fetchMore();
        } finally {
          setIsFetching(false);
        }
      }
    },
    [fetchMore, hasMore, isFetching]
  );

  useEffect(() => {
    if (!targetRef) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    });

    observer.observe(targetRef);

    return () => {
      observer.disconnect();
    };
  }, [targetRef, handleIntersection, threshold, rootMargin]);

  const setRef = useCallback((node: Element | null) => {
    setTargetRef(node);
  }, []);

  return {
    isFetching,
    setRef,
  };
}