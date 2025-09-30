"use client";

import { Mail } from "lucide-react";
import Image from "next/image";
import { AppButton } from "@/components/app/buttons/app-button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

import { Label } from "../ui/label";

interface SupportModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function SupportModal({ isOpen, onClose }: SupportModalProps) {
	const handleClose = () => {
		onClose();
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			handleClose();
		}
	};

	return (
		<Dialog onOpenChange={handleOpenChange} open={isOpen}>
			<DialogContent
				className="w-[464px] p-0 bg-white border border-primary rounded-[8px] overflow-hidden"
				data-testid="support-modal"
			>
				<div className="p-8 flex flex-col gap-8">
					<div className="flex flex-col gap-6">
						<div className="flex items-start justify-between">
							<div className="flex flex-col gap-2">
								<DialogTitle className="font-cabin font-medium text-2xl leading-[30px] text-app-black">
									Contact Support
								</DialogTitle>
								<DialogDescription className="font-sans text-base font-normal text-app-gray-600">
									If you have an issue or question, please fill out the form below. Our team will
									respond soon. You can also contact us at{" "}
									<span className="text-primary">contact@grantflow.ai</span>.
								</DialogDescription>
							</div>
						</div>

						<div className="flex flex-col gap-6">
							<div className="flex flex-col gap-3">
								<Label className="font-cabin text-base font-semibold text-app-black" htmlFor="email">
									Email address
								</Label>
								<div className="relative">
									<input
										className="w-full h-10 px-3 pr-10 border rounded bg-white font-body text-sm text-app-gray-600 placeholder:text-app-gray-400 outline-none focus:border-primary border-app-gray-400"
										data-testid="email-input"
										placeholder="contact@example.org"
										type="email"
									/>
									<Mail className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-app-gray-600" />
								</div>
							</div>
							<div className="flex flex-col gap-3">
								<Label className="font-cabin text-base font-semibold text-app-black" htmlFor="email">
									Subject
								</Label>

								<textarea
									className="resize-none w-full h-[122px] px-3 py-2 border rounded bg-white font-body text-sm text-app-gray-600 placeholder:text-app-gray-400 outline-none focus:border-primary border-app-gray-400"
									data-testid="email-input"
									placeholder="Brief summary of your request"
								/>
							</div>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<AppButton
							className="px-4 py-2"
							data-testid="cancel-button"
							onClick={handleClose}
							variant="secondary"
						>
							Cancel
						</AppButton>
						<AppButton
							className=" px-4 py-2 items-center gap-1 "
							data-testid="submit-button"
							onClick={() => {
								/* Non-functional */
							}}
							type="button"
							variant="primary"
						>
							Send{" "}
							<span>
								<Image alt="Send Icon" height={16} src="/icons/send.svg" width={16} />
							</span>
						</AppButton>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
