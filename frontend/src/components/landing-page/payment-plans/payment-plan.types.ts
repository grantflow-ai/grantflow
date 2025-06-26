export interface PaymentPlanCardProps {
	inclusions: string[];
	name: string;
	pricing: Record<
		PaymentRecurrence,
		{
			classNames?: string;
			priceSubtext?: string;
			priceText: string;
		}
	>;
}

export type PaymentRecurrence = "monthly" | "yearly";
