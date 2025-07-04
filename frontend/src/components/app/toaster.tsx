"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const AppToaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();

	return (
		<>
			{/* eslint-disable-next-line react/no-unknown-property */}
			<style global jsx>{`
			`}</style>
			<Sonner
				closeButton={false}
				icons={{
					error: <Image alt="Error" height={16} src="/icons/icon-toast-error.svg" width={16} />,
					info: <Image alt="Info" height={16} src="/icons/icon-toast-info.svg" width={16} />,
					success: <Image alt="Success" height={16} src="/icons/icon-toast-success-white.svg" width={16} />,
					warning: <Image alt="Warning" height={16} src="/icons/icon-toast-warning.svg" width={16} />,
				}}
				offset={24}
				position="bottom-center"
				theme={theme as ToasterProps["theme"]}
				toastOptions={{
					className: "flex flex-row items-start !rounded-sm border shadow-none",
					classNames: {
						description: "!text-app-gray-600",
						error: "!bg-rose-50 !border-destructive",
						info: "!bg-slate-100 !border-slate-400",
						success:
							"!bg-app-dark-blue !border-app-dark-blue !text-white [&_[data-description]]:!text-white/70",
						warning: "!bg-orange-50 !border-amber-200",
					},
					style: {
						alignItems: "flex-start",
						boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
						display: "flex",
						fontSize: "14px",
						fontWeight: "400",
						lineHeight: "1",
						maxWidth: "min(480px, calc(100vw - 32px))",
						minWidth: "min(320px, calc(100vw - 32px))",
						padding: "8px",
					},
				}}
				{...props}
			/>
		</>
	);
};

export { AppToaster };
