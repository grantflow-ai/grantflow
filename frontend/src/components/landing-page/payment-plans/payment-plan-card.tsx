import { cn } from "@/lib/utils";
import type { PaymentPlanCardProps, PaymentRecurrence } from "./payment-plan.types";

export function PaymentPlanCard({
	paymentRecurrence,
	plan,
}: {
	paymentRecurrence: PaymentRecurrence;
	plan: PaymentPlanCardProps;
}) {
	const pricing = plan.pricing[paymentRecurrence];

	return (
		<div
			className="pt-10.5 h-[451px] min-w-[291px] whitespace-nowrap rounded-xl border border-gray-100 bg-white px-6 backdrop-blur-sm"
			data-testid="payment-plan-card"
		>
			<p className="text-2xl text-gray-600">{plan.name}</p>
			<p className={cn("font-button text-app-black mt-2.5 whitespace-nowrap text-5xl", pricing.classNames)}>
				<span data-testid="payment-card-price-text">{pricing.priceText}</span>{" "}
				{pricing.priceSubtext && <span className="text-sm text-gray-500">/ {pricing.priceSubtext}</span>}
			</p>

			<div className="mt-4.5 h-px w-full bg-gray-100" />

			<p className="text-app-black mt-6.5 leading-5.5 font-semibold">Includes</p>
			<ul className="mt-2.4 text-app-black flex flex-col gap-2">
				{plan.inclusions.map((inclusion) => (
					<li key={inclusion}>
						<p>{inclusion}</p>
					</li>
				))}
			</ul>
		</div>
	);
}
