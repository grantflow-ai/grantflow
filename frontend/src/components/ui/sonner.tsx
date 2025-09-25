"use client";

import { CircleCheck, Info, LoaderCircle, TriangleAlert, XCircle } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
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
			theme="light"
			toastOptions={{
				classNames: {
					actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
					cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
					description: "group-[.toast]:!text-white/70",
					error: "group toast !flex !items-center !gap-1 !w-[456px] !p-[8px] !rounded !bg-[var(--color-light-red)] !border !border-[var(--color-red)] !text-[var(--text-dark)] !text-[14px] !font-normal",
					info: "group toast !flex !items-center !gap-1 !w-[456px] !p-[8px] !rounded !bg-[var(--color-light-gray)] !border !border-[var(--color-app-slate-blue)] !text-[var(--text-dark)] !text-[14px] !font-normal",
					success:
						"group toast !flex !items-center !gap-1 !w-[456px] !p-[8px] !rounded !bg-app-dark-blue !text-white !text-[14px] !font-normal",
					warning:
						"group toast !flex !items-center !gap-1 !w-[456px] !p-[8px] !rounded !bg-[#FAF6EC] !border !border-[#FFDF77] !text-[var(--text-dark)] !text-[14px] !font-normal",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
