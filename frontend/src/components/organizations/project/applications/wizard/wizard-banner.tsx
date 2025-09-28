import Image from "next/image";

type BannerVariant = "error" | "info" | "warning";

interface WizardBannerProps {
	children: React.ReactNode;
	onClose?: () => void;
	variant?: BannerVariant;
}

const variantConfig = {
	error: {
		background: "bg-red-50",
		icon: "/icons/icon-toast-error.svg",
		outline: "outline-red-400",
	},
	info: {
		background: "bg-slate-100",
		icon: "/icons/icon-toast-info.svg",
		outline: "outline-slate-400",
	},
	warning: {
		background: "bg-yellow-50",
		icon: "/icons/icon-toast-warning.svg",
		outline: "outline-yellow-400",
	},
};

export function WizardBanner({ children, onClose, variant = "info" }: WizardBannerProps) {
	const config = variantConfig[variant];

	return (
		<div
			className={`self-stretch p-2 ${config.background} rounded outline-1 outline-offset-[-1px] ${config.outline} inline-flex justify-start items-start gap-1`}
			data-testid={`wizard-banner-${variant}`}
		>
			<Image alt={variant} className="shrink-0" height={16} src={config.icon} width={16} />
			<div className="flex-1 grow text-sm text-app-black font-normal leading-tight">{children}</div>
			{onClose && (
				<button className="shrink-0 self-start" onClick={onClose} type="button">
					<Image
						alt="Close"
						className="hover:opacity-60 transition-opacity cursor-pointer"
						height={16}
						src="/icons/close.svg"
						width={16}
					/>
				</button>
			)}
		</div>
	);
}
