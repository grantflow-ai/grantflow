"use client";

import React from "react";
import { motion, useScroll, useTransform } from "motion/react";

export const ScrollFadeElement: React.FC<{
	children: React.ReactNode;
	className?: string;
	delay?: number;
	threshold?: number;
}> = ({ children, className = "", delay = 0, threshold = 0.1 }) => {
	const elementRef = React.useRef<HTMLDivElement>(null);

	const { scrollYProgress } = useScroll({
		offset: ["start end", "end start"],
		target: elementRef,
	});

	const opacity = useTransform(scrollYProgress, [0, threshold, threshold + 0.1, 0.75, 1], [0, 0, 0.8, 1, 0]);
	const y = useTransform(scrollYProgress, [0, threshold, threshold + 0.1, 0.75, 1], [20, 10, 0, 0, -20]);

	return (
		<motion.div
			className={className}
			ref={elementRef}
			style={{
				opacity,
				y,
			}}
			transition={{
				delay,
				duration: 0.5,
				ease: "easeInOut",
			}}
		>
			{children}
		</motion.div>
	);
};
