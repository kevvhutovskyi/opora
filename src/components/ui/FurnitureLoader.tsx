"use client";

import { motion } from "framer-motion";

const DUST_PARTICLES = Array.from({ length: 12 });

export default function FurnitureLoader() {
  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Ambient Shadow */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[190px] h-6 w-48 rounded-full bg-black blur-xl"
      />

      {/* Dust Particles */}
      {DUST_PARTICLES.map((_, index) => (
        <motion.div
          key={index}
          className="absolute h-1 w-1 rounded-full bg-[#D6C3AA]"
          initial={{
            x: Math.random() * 140 - 70,
            y: 80,
            opacity: 0,
          }}
          animate={{
            y: [-10, -80],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: index * 0.15,
            ease: "easeOut",
          }}
        />
      ))}

      <svg
        width="280"
        height="220"
        viewBox="0 0 280 220"
        fill="none"
      >
        {/* Chair Legs */}

        <motion.rect
          x="95"
          y="120"
          width="10"
          height="80"
          rx="3"
          fill="#6F4E37"
          initial={{ y: 240 }}
          animate={{ y: 120 }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            repeatDelay: 0.3,
          }}
        />

        <motion.rect
          x="175"
          y="120"
          width="10"
          height="80"
          rx="3"
          fill="#6F4E37"
          initial={{ y: 240 }}
          animate={{ y: 120 }}
          transition={{
            duration: 0.7,
            delay: 0.15,
            repeat: Infinity,
            repeatDelay: 0.3,
          }}
        />

        <motion.rect
          x="115"
          y="125"
          width="10"
          height="75"
          rx="3"
          fill="#6F4E37"
          initial={{ y: 240 }}
          animate={{ y: 125 }}
          transition={{
            duration: 0.7,
            delay: 0.2,
            repeat: Infinity,
            repeatDelay: 0.3,
          }}
        />

        <motion.rect
          x="155"
          y="125"
          width="10"
          height="75"
          rx="3"
          fill="#6F4E37"
          initial={{ y: 240 }}
          animate={{ y: 125 }}
          transition={{
            duration: 0.7,
            delay: 0.35,
            repeat: Infinity,
            repeatDelay: 0.3,
          }}
        />

        {/* Seat */}

        <motion.rect
          x="80"
          y="95"
          width="120"
          height="28"
          rx="14"
          fill="#E7D8C3"
          initial={{
            opacity: 0,
            y: 40,
          }}
          animate={{
            opacity: 1,
            y: 95,
          }}
          transition={{
            duration: 0.8,
            delay: 0.8,
            repeat: Infinity,
            repeatDelay: 0.3,
          }}
        />

        {/* Backrest */}

        <motion.rect
          x="92"
          y="20"
          width="96"
          height="70"
          rx="18"
          fill="#EDE4D6"
          initial={{
            rotate: -90,
            originX: "50%",
            originY: "100%",
          }}
          animate={{
            rotate: 0,
          }}
          transition={{
            duration: 0.9,
            delay: 1.6,
            repeat: Infinity,
            repeatDelay: 0.3,
          }}
        />
      </svg>

      {/* Luxury Loading Copy */}

      <motion.div
        className="mt-10 text-center"
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      >
        <p className="tracking-[0.25em] uppercase text-xs text-[#8B7355]">
          Crafting Your Selection
        </p>

        <p className="mt-3 text-sm text-[#A38B6A]">
          Preparing premium furniture details
        </p>
      </motion.div>
    </div>
  );
}