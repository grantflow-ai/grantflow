"use client";

import { CircleCheck, Info, LoaderCircle, TriangleAlert, XCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();

	return (
		<Sonner
			className="toaster group"
			icons={{
				error: <XCircle className="size-5" />,
				info: <Info className="size-5" />,
				loading: <LoaderCircle className="size-5 animate-spin" />,
				success: <CircleCheck className="size-5" />,
				warning: <TriangleAlert className="size-5" />,
			}}
			position="bottom-center"
			theme={theme as ToasterProps["theme"]}
			toastOptions={{
				classNames: {
					actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
					cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
					description: "group-[.toast]:!text-white/70",
					toast: "group toast !flex !items-center !gap-1 !w-[456px] !p-[8px] !rounded !bg-app-dark-blue !text-white !text-[14px] !font-normal",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
