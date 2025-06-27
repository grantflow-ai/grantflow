import type { PaymentPlanCardProps } from "./payment-plan.types";

export const PaymentPlansList: PaymentPlanCardProps[] = [
	{
		inclusions: ["One Grant application for free!", "Up to 3 collaborators", "AI-powered writing assistant"],
		name: "Starter",
		pricing: {
			monthly: {
				priceSubtext: "1 application",
				priceText: "Free",
			},
			yearly: {
				priceSubtext: "1 application",
				priceText: "Free",
			},
		},
	},
	{
		inclusions: [
			"Unlimited grant submissions",
			"Up to 3 collaborators",
			"Up to 3 Research projects",
			"AI-powered writing assistant",
		],
		name: "Junior PI",
		pricing: {
			monthly: {
				priceSubtext: "mo",
				priceText: "€200",
			},
			yearly: {
				priceSubtext: "mo",
				priceText: "€160",
			},
		},
	},
	{
		inclusions: [
			"Unlimited grant submissions",
			"Up to 7 collaborators",
			"Up to 8 Research projects",
			"AI-powered writing assistant",
		],
		name: "Smart Lab",
		pricing: {
			monthly: {
				priceSubtext: "mo",
				priceText: "€480",
			},
			yearly: {
				priceSubtext: "mo",
				priceText: "€384",
			},
		},
	},
	{
		inclusions: [
			"Unlimited grant submissions",
			"Unlimited collaborators seats",
			"Unlimited Research projects",
			"Dedicated account manager",
			"AI-powered writing assistant",
		],
		name: "Smart Institution",
		pricing: {
			monthly: {
				classNames: "text-4.25xl",
				priceText: "Custom",
			},
			yearly: {
				classNames: "text-4.25xl",
				priceText: "Custom",
			},
		},
	},
];
