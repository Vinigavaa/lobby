"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const confettiColors = ["#FF5A3C", "#2DD4BF", "#F5C542", "#8B7CF6", "#F5F7FA"];
const particleCount = 36;

type Particle = {
  id: number;
  x: number;
  rotate: number;
  color: string;
  delay: number;
  size: number;
};

export function TriviaConfetti() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const generated: Particle[] = Array.from(
      { length: particleCount },
      (_, index) => ({
        id: index,
        x: (Math.random() - 0.5) * 100,
        rotate: Math.random() * 360,
        color: confettiColors[index % confettiColors.length],
        delay: Math.random() * 0.15,
        size: 6 + Math.random() * 6,
      })
    );

    window.setTimeout(() => setParticles(generated), 0);
  }, []);

  if (particles.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute left-1/2 top-1/3 rounded-sm"
          style={{
            width: particle.size,
            height: particle.size * 0.4,
            backgroundColor: particle.color,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: `${particle.x}vw`,
            y: "70vh",
            opacity: 0,
            rotate: particle.rotate,
          }}
          transition={{
            duration: 1.6,
            delay: particle.delay,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}
