"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const MESSAGES = [
  "Get it delivered in 3-7 days 🚀",
  "Get 10% OFF on all orders 🎉",
];

type Direction = "left" | "right";

export default function DeliveryBanner() {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<Direction>("left");
  // slideState: "idle" | "exit" | "enter"
  const [slideState, setSlideState] = useState<"idle" | "exit" | "enter">("idle");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingIndex = useRef(0);

  function swipeTo(nextIndex: number, dir: Direction) {
    if (animating) return;

    pendingIndex.current = (nextIndex + MESSAGES.length) % MESSAGES.length;
    setDirection(dir);
    setAnimating(true);
    setSlideState("exit");

    setTimeout(() => {
      setIndex(pendingIndex.current);
      setSlideState("enter");

      setTimeout(() => {
        setSlideState("idle");
        setAnimating(false);
      }, 280);
    }, 280);
  }

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % MESSAGES.length;
        pendingIndex.current = next;
        return prev;
      });

      setDirection("left");
      setAnimating(true);
      setSlideState("exit");

      setTimeout(() => {
        setIndex(pendingIndex.current);
        setSlideState("enter");

        setTimeout(() => {
          setSlideState("idle");
          setAnimating(false);
        }, 280);
      }, 280);
    }, 5000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  function handlePrev() {
    swipeTo(index - 1, "right");
    startTimer();
  }

  function handleNext() {
    swipeTo(index + 1, "left");
    startTimer();
  }

  // Compute transform and opacity based on slideState + direction
  function getStyle(): React.CSSProperties {
    if (slideState === "idle") {
      return { transform: "translateX(0%)", opacity: 1, transition: "none" };
    }
    if (slideState === "exit") {
      // slide out to the opposite of direction
      const exitX = direction === "left" ? "-60%" : "60%";
      return {
        transform: `translateX(${exitX})`,
        opacity: 0,
        transition: "transform 280ms ease-in-out, opacity 280ms ease-in-out",
      };
    }
    if (slideState === "enter") {
      // start from the direction side, animate to center
      const enterFrom = direction === "left" ? "60%" : "-60%";
      return {
        transform: "translateX(0%)",
        opacity: 1,
        transition: "transform 280ms ease-in-out, opacity 280ms ease-in-out",
        // We set initial via a quick trick — enter state always animates to 0
        animationName: direction === "left" ? "slideInFromRight" : "slideInFromLeft",
        animationDuration: "280ms",
        animationTimingFunction: "ease-in-out",
        animationFillMode: "both",
      };
    }
    return {};
  }

  return (
    <div className="mb-5">
      <style>{`
        @keyframes slideInFromRight {
          from { transform: translateX(60%); opacity: 0; }
          to   { transform: translateX(0%);  opacity: 1; }
        }
        @keyframes slideInFromLeft {
          from { transform: translateX(-60%); opacity: 0; }
          to   { transform: translateX(0%);   opacity: 1; }
        }
      `}</style>

      <div className="
        flex items-center justify-between
        px-5 py-3
        rounded-xl
        bg-gradient-to-r
        from-[#F4F6F5]
        to-[#E8ECEB]
        border border-[#D8E1DE]
        shadow-sm
        overflow-hidden
      ">
        <button
          onClick={handlePrev}
          className="text-sm font-medium text-gray-800 hover:text-gray-600 transition select-none shrink-0 z-10"
        >
          ←
        </button>

        <div className="flex-1 overflow-hidden flex items-center justify-center mx-2">
          <span
            className="text-sm font-semibold text-gray-800 whitespace-nowrap"
            style={getStyle()}
          >
            {MESSAGES[index]}
          </span>
        </div>

        <button
          onClick={handleNext}
          className="text-sm font-medium text-gray-800 hover:text-gray-600 transition select-none shrink-0 z-10"
        >
          →
        </button>
      </div>
    </div>
  );
}