import { IconGoAhead } from "@/components/branding/icons";
import { ScrollButton } from "@/components/layout/navigation/scroll-button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaymentRecurrence } from "./payment-plan.types";
import { PaymentPlanCard } from "./payment-plan-card";
import { PaymentPlansList } from "./payment-plans.constants";

export function PaymentPlans() {
	function renderPlans(recurrence: PaymentRecurrence) {
		return (
			<ScrollArea className="pl-5.5 mt-10 w-[calc(100vw-2.75rem)] whitespace-nowrap rounded-md border xl:mx-auto xl:w-fit">
				<div className="flex w-max space-x-3">
					{PaymentPlansList.map((plan) => (
						<div className="shrink-0" key={plan.name}>
							<PaymentPlanCard paymentRecurrence={recurrence} plan={plan} />
						</div>
					))}
				</div>
				<ScrollBar orientation="horizontal" />
			</ScrollArea>
		);
	}
	return (
		<div
			className="bg-preview-bg px-5.5 text-app-black flex flex-col items-center py-20"
			data-testid="payment-plans-container"
			id="payment-plans"
		>
			<h3 className="text-center text-2xl font-medium md:text-4xl">Plans Built for Research Success</h3>
			<p className="mt-2 text-center">
				Flexible options designed for labs of all sizes. Get the tools, collaboration, and support you need to
				win more grants.
			</p>

			<Tabs className="mt-11 gap-0" data-testid="payment-tabs" defaultValue="monthly">
				<TabsList className="mx-auto">
					<TabsTrigger data-testid="monthly-tab" value="monthly">
						Monthly
					</TabsTrigger>
					<TabsTrigger data-testid="yearly-tab" value="yearly">
						Yearly <span className="text-sm">save 20%</span>
					</TabsTrigger>
				</TabsList>
				<TabsContent value="monthly">{renderPlans("monthly")}</TabsContent>
				<TabsContent value="yearly">{renderPlans("yearly")}</TabsContent>
			</Tabs>

			<ScrollButton
				aria-label="Go to Waitlist Form"
				className="mx-6 mt-10 w-full md:w-fit"
				desktopTargetId="waitlist"
				mobileTargetId="waitlist"
				rightIcon={<IconGoAhead />}
				size="lg"
			>
				Secure Priority Access
			</ScrollButton>
		</div>
	);
}