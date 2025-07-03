"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();

	return (
		<Sonner
			className="toaster group"
			position="bottom-center"
			offset={24}
			style={
				{
					"--normal-bg": "oklch(1 0 0)",
					"--normal-border": "oklch(0.922 0 0)",
					"--normal-text": "oklch(0.145 0 0)",
					"--error-bg": "oklch(0.95 0.05 10)",
					"--error-border": "oklch(0.85 0.1 10)",
					"--error-text": "oklch(0.4 0.15 10)",
					"--success-bg": "oklch(0.29 0.1308 278.65)",
					"--success-border": "oklch(0.29 0.1308 278.65)",
					"--success-text": "oklch(1 0 0)",
					"--warning-bg": "oklch(0.95 0.08 85)",
					"--warning-border": "oklch(0.88 0.12 85)",
					"--warning-text": "oklch(0.4 0.1 85)",
					"--info-bg": "oklch(0.94 0.02 240)",
					"--info-border": "oklch(0.86 0.04 240)",
					"--info-text": "oklch(0.35 0.08 240)",
				} as React.CSSProperties
			}
			theme={theme as ToasterProps["theme"]}
			toastOptions={{
				style: {
					borderRadius: "10px",
					padding: "12px 16px",
					fontSize: "14px",
					fontWeight: "500",
					lineHeight: "1.4",
					minWidth: "min(320px, calc(100vw - 32px))",
					maxWidth: "min(480px, calc(100vw - 32px))",
					boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)",
					border: "1px solid var(--normal-border)",
					background: "var(--normal-bg)",
					color: "var(--normal-text)",
				},
				classNames: {
					error: "!bg-[var(--error-bg)] !border-[var(--error-border)] !text-[var(--error-text)]",
					success: "!bg-[var(--success-bg)] !border-[var(--success-border)] !text-[var(--success-text)]",
					warning: "!bg-[var(--warning-bg)] !border-[var(--warning-border)] !text-[var(--warning-text)]",
					info: "!bg-[var(--info-bg)] !border-[var(--info-border)] !text-[var(--info-text)]",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
