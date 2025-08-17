import { useEffect, useRef, useState } from 'react';

interface UseAutoScrollOptions {
  threshold?: number;
  smooth?: boolean;
  delay?: number;
}

export function useAutoScroll(
  dependency: any[],
  options: UseAutoScrollOptions = {}
) {
  const {
    threshold = 100,
    smooth = true,
    delay = 100
  } = options;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      setIsUserScrolling(distanceFromBottom > threshold);
      
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 1000);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [threshold]);
  
  useEffect(() => {
    if (!isUserScrolling && containerRef.current) {
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }, delay);
    }
  }, dependency);
  
  return { containerRef, isUserScrolling };
}