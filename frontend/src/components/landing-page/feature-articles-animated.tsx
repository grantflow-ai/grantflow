"use client";

import { motion } from "motion/react";

const featureArticleVariants = {
	hidden: {
		opacity: 0,
		y: 20,
	},
	visible: {
		opacity: 1,
		transition: {
			duration: 0.4,
			ease: "easeInOut",
			staggerChildren: 0.1,
			when: "beforeChildren",
		},
		y: 0,
	},
};

const featureIconVariants = {
	hidden: {
		opacity: 0,
		scale: 0.8,
	},
	visible: {
		opacity: 1,
		scale: 1,
		transition: {
			duration: 0.4,
			ease: "easeInOut",
		},
	},
};

const textVariants = {
	hidden: {
		opacity: 0,
		y: 20,
	},
	visible: {
		opacity: 1,
		transition: {
			duration: 0.4,
			ease: "easeInOut",
		},
		y: 0,
	},
};

export function AnimatedFeatureArticle({
	className,
	featureDescription,
	featureTitle,
}: { featureDescription: string; featureTitle: string } & React.HTMLProps<HTMLElement>) {
	return (
		<motion.article
			className={className}
			id="feature-item"
			initial="hidden"
			variants={featureArticleVariants}
			viewport={{ amount: 0.2, once: true }}
			whileInView="visible"
		>
			<motion.div
				className="border-l-12 md:border-l-10 border-r-12 md:border-r-10 border-b-20 md:border-b-16 border-b-background size-0 border-x-transparent"
				variants={featureIconVariants}
			/>
			<motion.h3 className="font-heading my-5 text-2xl font-medium md:my-3" variants={textVariants}>
				{featureTitle}
			</motion.h3>
			<motion.p className="text-lg md:text-sm md:leading-tight" variants={textVariants}>
				{featureDescription}
			</motion.p>
		</motion.article>
	);
}
