"use client";

import React from "react";
import { motion, useScroll, useTransform } from "motion/react";

export function ScaleElement({
	children,
	className = "",
	delay = 0,
}: {
	children: React.ReactNode;
	className?: string;
	delay?: number;
}) {
	const elementRef = React.useRef<HTMLDivElement>(null);

	const { scrollYProgress } = useScroll({
		offset: ["start end", "center center"],
		target: elementRef,
	});
	const opacity = useTransform(scrollYProgress, [0, 0.3, 0.5], [0, 0.8, 1]);
	const scale = useTransform(scrollYProgress, [0, 0.3, 0.5], [0.95, 0.98, 1]);

	return (
		<motion.div
			className={`h-full ${className}`}
			ref={elementRef}
			style={{
				opacity,
				scale,
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
}
