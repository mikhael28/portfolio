"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleDelay: number;
  duration: number;
}

interface Connection {
  targetId: number;
  duration: number;
  delay: number;
}

interface NetworkNode {
  id: number;
  x: number;
  y: number;
  connections: Connection[];
  duration: number;
  delay: number;
}

interface Scene {
  stars: Star[];
  networkNodes: NetworkNode[];
}

// All randomness lives here, so re-renders never reshuffle animation timings.
function generateScene(width: number, height: number): Scene {
  // Generate stars for night sky effect
  const stars: Star[] = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2 + 1,
    opacity: Math.random() * 0.5 + 0.3,
    twinkleDelay: Math.random() * 3,
    duration: 2 + Math.random() * 2,
  }));

  // Generate network nodes for matrix effect
  const nodeCount = 12;
  const networkNodes: NetworkNode[] = Array.from({ length: nodeCount }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    y: Math.random() * height,
    connections: [],
    duration: 3 + Math.random() * 2,
    delay: Math.random() * 3,
  }));

  // Create connections between nearby nodes
  networkNodes.forEach((node, i) => {
    networkNodes.forEach((otherNode, j) => {
      if (i !== j) {
        const distance = Math.sqrt(
          Math.pow(node.x - otherNode.x, 2) + Math.pow(node.y - otherNode.y, 2)
        );
        if (distance < 200 && node.connections.length < 3) {
          node.connections.push({
            targetId: j,
            duration: 4 + Math.random() * 3,
            delay: Math.random() * 5,
          });
        }
      }
    });
  });

  return { stars, networkNodes };
}

export default function AnimatedBackground() {
  const [{ stars, networkNodes }, setScene] = useState<Scene>({ stars: [], networkNodes: [] });

  useEffect(() => {
    // Regenerate the scene to fit the viewport on mount and whenever it resizes.
    const updateScene = () => {
      setScene(generateScene(window.innerWidth, window.innerHeight));
    };

    updateScene();
    window.addEventListener("resize", updateScene);
    return () => window.removeEventListener("resize", updateScene);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Stars */}
      {stars.map((star) => (
        <motion.div
          key={`star-${star.id}`}
          className="absolute rounded-full bg-slate-300/60 dark:bg-slate-400/40"
          style={{
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
          }}
          animate={{
            opacity: [star.opacity, star.opacity * 0.3, star.opacity],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.twinkleDelay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Network connections */}
      <svg className="absolute inset-0 w-full h-full">
        {networkNodes.map((node) =>
          node.connections.map((connection) => {
            const targetNode = networkNodes[connection.targetId];
            if (!targetNode) return null;
            
            return (
              <motion.line
                key={`connection-${node.id}-${connection.targetId}`}
                x1={node.x}
                y1={node.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-slate-200/15 dark:text-slate-700/20"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: [0, 1, 0],
                  opacity: [0, 0.6, 0],
                }}
                transition={{
                  duration: connection.duration,
                  repeat: Infinity,
                  delay: connection.delay,
                  ease: "easeInOut",
                }}
              />
            );
          })
        )}
      </svg>

      {/* Network nodes */}
      {networkNodes.map((node) => (
        <motion.div
          key={`node-${node.id}`}
          className="absolute w-1 h-1 rounded-full bg-slate-300/30 dark:bg-slate-600/30"
          style={{
            left: node.x - 2,
            top: node.y - 2,
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: node.duration,
            repeat: Infinity,
            delay: node.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/30" />
    </div>
  );
}
