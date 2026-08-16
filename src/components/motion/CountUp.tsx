"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useSpring } from "motion/react";

export function CountUp({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const numeric = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
  const hasNumber = /\d/.test(value);
  const nonNumeric = value.replace(/[0-9.]/g, "");
  const [display, setDisplay] = useState(0);
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: 1.6, bounce: 0 });

  useEffect(() => {
    if (!inView || !hasNumber) return;
    mv.set(numeric);
    const unsub = spring.on("change", (v) => setDisplay(v));
    return () => unsub();
  }, [inView, numeric, hasNumber, mv, spring]);

  return (
    <div ref={ref} className={className}>
      {hasNumber ? (
        <>
          {Math.round(display)}
          {nonNumeric}
        </>
      ) : (
        value
      )}
    </div>
  );
}