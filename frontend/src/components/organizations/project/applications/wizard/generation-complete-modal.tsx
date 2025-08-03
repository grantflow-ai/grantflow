"use client";

import { Coffee } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppButton } from "@/components/app";
import { BaseModal } from "@/components/app/feedback/base-modal";
import { useWizardStore } from "@/stores/wizard-store";

interface GenerationCompleteModalProps {
	isOpen: boolean;
	onClose: () => void;
	projectId: string;
}

export function GenerationCompleteModal({ isOpen, onClose, projectId }: GenerationCompleteModalProps) {
	const router = useRouter();
	const resetApplicationGenerationComplete = useWizardStore((state) => state.resetApplicationGenerationComplete);

	const handleClose = () => {
		onClose();
		resetApplicationGenerationComplete();
		router.push(`/projects/${projectId}`);
	};

	return (
		<BaseModal isOpen={isOpen} onClose={handleClose}>
			<div className="flex flex-col items-center text-center space-y-6 p-6">
				<div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
					<Coffee className="w-10 h-10 text-amber-600" />
				</div>

				<div className="space-y-2">
					<h3 className="text-xl font-semibold text-gray-900">Your Application is Being Generated!</h3>
					<p className="text-gray-600 max-w-sm">
						Go grab a coffee, we&apos;ll send you an email with the generated draft when it&apos;s ready!
					</p>
				</div>

				<AppButton
					className="w-full"
					data-testid="generation-complete-close-button"
					onClick={handleClose}
					size="lg"
				>
					Close
				</AppButton>
			</div>
		</BaseModal>
	);
}
