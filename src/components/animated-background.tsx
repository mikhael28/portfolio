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
}

interface NetworkNode {
  id: number;
  x: number;
  y: number;
  connections: number[];
}

export default function AnimatedBackground() {
  const [stars, setStars] = useState<Star[]>([]);
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (dimensions.width === 0) return;

    // Generate stars for night sky effect
    const newStars: Star[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * dimensions.width,
      y: Math.random() * dimensions.height,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.3,
      twinkleDelay: Math.random() * 3,
    }));

    // Generate network nodes for matrix effect
    const nodeCount = 12;
    const newNodes: NetworkNode[] = Array.from({ length: nodeCount }, (_, i) => ({
      id: i,
      x: Math.random() * dimensions.width,
      y: Math.random() * dimensions.height,
      connections: [],
    }));

    // Create connections between nearby nodes
    newNodes.forEach((node, i) => {
      newNodes.forEach((otherNode, j) => {
        if (i !== j) {
          const distance = Math.sqrt(
            Math.pow(node.x - otherNode.x, 2) + Math.pow(node.y - otherNode.y, 2)
          );
          if (distance < 200 && node.connections.length < 3) {
            node.connections.push(j);
          }
        }
      });
    });

    setStars(newStars);
    setNetworkNodes(newNodes);
  }, [dimensions]);

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
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: star.twinkleDelay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Network connections */}
      <svg className="absolute inset-0 w-full h-full">
        {networkNodes.map((node) =>
          node.connections.map((connectionId) => {
            const targetNode = networkNodes[connectionId];
            if (!targetNode) return null;
            
            return (
              <motion.line
                key={`connection-${node.id}-${connectionId}`}
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
                  duration: 4 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 5,
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
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/30" />
    </div>
  );
}
