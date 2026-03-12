"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }
  }, []);

  return (
    <div
      className={`
        transition-all duration-300 ease-in-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
      style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
    >
      {children}
    </div>
  );
}
