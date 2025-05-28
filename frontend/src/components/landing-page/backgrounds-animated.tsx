"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

const gradientPath = [
	`radial-gradient(60% 100% at 100% 100%, var(--primary) 0%, transparent 100%)`,
	`radial-gradient(60% 100% at 100% 0%, var(--primary) 0%, transparent 100%)`,
	`radial-gradient(60% 100% at 50% 0%, var(--primary) 0%, transparent 100%)`,
	`radial-gradient(60% 100% at 0% 0%, var(--primary) 0%, transparent 100%)`,
	`radial-gradient(60% 100% at 0% 100%, var(--primary) 0%, transparent 100%)`,
	`radial-gradient(60% 100% at 50% 100%, var(--primary) 0%, transparent 100%)`,
	`radial-gradient(60% 100% at 100% 100%, var(--primary) 0%, transparent 100%)`,
];

export function AnimatedGradientBackground({ className }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<motion.div
			animate={{ background: gradientPath }}
			className={cn("opacity-70 relative", className)}
			data-testid="animated-background"
			initial={{ background: gradientPath[0] }}
			transition={{
				duration: 25,
				ease: "linear",
				repeat: Infinity,
				repeatType: "loop",
				times: [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1],
			}}
		></motion.div>
	);
}
