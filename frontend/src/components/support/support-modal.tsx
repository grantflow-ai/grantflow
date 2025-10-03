"use client";

import { Mail } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AppButton } from "@/components/app/buttons/app-button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { log } from "@/utils/logger/client";
import { Label } from "../ui/label";

interface SupportModalProps {
	isOpen: boolean;
	onClose: () => void;
}

const supportSchema = z.object({
	email: z.email("Please enter a valid email address."),
	subject: z.string().min(1, "Subject cannot be empty."),
});

export function SupportModal({ isOpen, onClose }: SupportModalProps) {
	const [email, setEmail] = useState("");
	const [subject, setSubject] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<{ email?: string[]; subject?: string[] }>({});
	const handleClose = () => {
		setEmail("");
		setSubject("");
		setErrors({});
		onClose();
	};

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			handleClose();
		}
	};

	const handleSubmit = async () => {
		setErrors({});

		const result = supportSchema.safeParse({
			email,
			subject,
		});

		if (!result.success) {
			const tree = z.treeifyError(result.error);

			setErrors({
				email: tree.properties?.email?.errors ?? [],
				subject: tree.properties?.subject?.errors ?? [],
			});
			return;
		}

		setIsLoading(true);
		try {
			await new Promise((resolve) => setTimeout(resolve, 1000));

			toast.success("Your support request has been sent!");
			handleClose();
		} catch (error) {
			toast.error("Failed to send request. Please try again.");
			log.error("Support submission failed", error);
		} finally {
			setIsLoading(false);
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
								<div>
									<div className="relative">
										<input
											className="w-full h-10 px-3 pr-10 border rounded bg-white font-body text-sm text-app-gray-600 placeholder:text-app-gray-400 outline-none focus:border-primary border-app-gray-400"
											data-testid="email-input"
											onChange={(e) => {
												setEmail(e.target.value);
											}}
											placeholder="contact@example.org"
											type="email"
											value={email}
										/>
										<Mail className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-app-gray-600" />
									</div>
									{errors.email && <p className="text-red-500 text-xs ">{errors.email[0]}</p>}
								</div>
							</div>
							<div className="flex flex-col gap-3">
								<Label className="font-cabin text-base font-semibold text-app-black" htmlFor="email">
									Subject
								</Label>
								<div>
									<textarea
										className="resize-none w-full h-[122px] px-3 py-2 border rounded bg-white font-body text-sm text-app-gray-600 placeholder:text-app-gray-400 outline-none focus:border-primary border-app-gray-400"
										data-testid="email-input"
										onChange={(e) => {
											setSubject(e.target.value);
										}}
										placeholder="Brief summary of your request"
										value={subject}
									/>
									{errors.subject && <p className="text-red-500 text-xs ">{errors.subject[0]}</p>}
								</div>
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
							disabled={isLoading}
							onClick={handleSubmit}
							type="button"
							variant="primary"
						>
							{isLoading ? "Sending..." : "Send"}

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
