import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { AppButton } from "@/components/app";
import Paymentmodal from "./payment-modal";

export default function PaymentLink() {
	const [showPaymentModal, setShowPaymentModal] = useState(false);

	return (
		<section className="hidden">
			<article className="w-full bottom-0 left-0 absolute h-[54px] rounded-b-[8px] bg-primary flex justify-center items-center">
				<div className="flex items-center gap-2.5 ">
					<p className="font-normal text-base font-body leading-5">
						Upgrade to submit unlimited grant applications and access pro tools.
					</p>
					<AppButton
						className="bg-white text-primary flex items-center gap-1 px-3 py-1 font-normal text-sm leading-[22px] hover:bg-white "
						data-testid="upgrade-button"
						onClick={() => {
							setShowPaymentModal(true);
						}}
						variant="primary"
					>
						Upgrade
						<ChevronRight className="ml-2 size-4" />
					</AppButton>
				</div>
			</article>

			<Paymentmodal
				isOpen={showPaymentModal}
				onClose={() => {
					setShowPaymentModal(false);
				}}
			/>
		</section>
	);
}
