import { AppButton, BaseModal } from "@/components/app";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { TabsTrigger } from "@radix-ui/react-tabs";
import { ChevronRight } from "lucide-react";
import React from "react";
const Monthlyplans = [
	{
		btn: "Start Now",
		features: ["One Grant application for free!", "Up to 3 collaborators", "AI-powered writing assistant"],
		isCurrent: true,

		note: "/ 1 application",
		price: "Free",
		title: "Starter",
	},
	{
		btn: "Start Now",
		features: [
			"Unlimited grant submissions",
			"Up to 3 collaborators",
			"Up to 3 Research projects",
			"AI-powered writing assistant",
		],
		isCurrent: false,
		note: "/mo",
		price: "€200",
		title: "Junior PI",
	},
	{
		btn: "Start Now",
		features: [
			"Unlimited grant submissions",
			"Up to 7 collaborators",
			"Up to 8 Research projects",
			"AI-powered writing assistant",
		],
		isCurrent: false,
		note: "/mo",
		price: "€480",
		title: "Smart Lab",
	},
	{
		btn: "Contact Us",
		features: [
			"Unlimited grant submissions",
			"Unlimited collaborators seats",
			"Unlimited Research projects",
			"Dedicated account manager",
			"AI-powered writing assistant",
		],
		isCurrent: false,
		note: "",
		price: "Custom ",
		tag: "Enterprise",
		title: "Smart Institution",
	},
];
const Yearlyplans = [
	{
		btn: "Start Now",
		features: ["One Grant application for free!", "Up to 3 collaborators", "AI-powered writing assistant"],
		isCurrent: true,

		note: "/ 1 application",
		price: "Free",
		title: "Starter",
	},
	{
		btn: "Start Now",
		features: [
			"Unlimited grant submissions",
			"Up to 3 collaborators",
			"Up to 3 Research projects",
			"AI-powered writing assistant",
		],
		isCurrent: false,
		note: "/mo",
		price: "€160",
		title: "Junior PI",
	},
	{
		btn: "Start Now",
		features: [
			"Unlimited grant submissions",
			"Up to 7 collaborators",
			"Up to 8 Research projects",
			"AI-powered writing assistant",
		],
		isCurrent: false,
		note: "/mo",
		price: "€384",
		title: "Smart Lab",
	},
	{
		btn: "Contact Us",
		features: [
			"Unlimited grant submissions",
			"Unlimited collaborators seats",
			"Unlimited Research projects",
			"Dedicated account manager",
			"AI-powered writing assistant",
		],
		isCurrent: false,
		note: "",
		price: "Custom ",
		tag: "Enterprise",
		title: "Smart Institution",
	},
];

interface PaymentModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function Paymentmodal({ isOpen, onClose }: PaymentModalProps) {
	return (
		<div>
			<BaseModal className="w-full !max-w-[1200px] text-black px-14 py-8" isOpen={isOpen} onClose={onClose}>
				<DialogHeader className=" w-full  flex items-center justify-center">
					<DialogTitle className="font-medium text-4xl leading-[42px]">
						Plans Built for Research Success
					</DialogTitle>
					<DialogDescription className="font-normal text-base leading-5 text-black">
						Flexible options designed for labs of all sizes. Get the tools, collaboration, and support you
						need to win more grants.
					</DialogDescription>
				</DialogHeader>
				<main>
					<Tabs defaultValue="account">
						<div className="flex w-full items-center justify-center">
							<TabsList className="cursor-pointer">
								<TabsTrigger
									className=" cursor-pointer px-6 py-1 rounded-l-[8px] font-normal text-base bg-white text-gray-400 data-[state=active]:bg-primary data-[state=active]:text-white"
									value="monthly"
								>
									Monthly
								</TabsTrigger>
								<TabsTrigger
									className="cursor-pointer px-6 py-1 rounded-r-[8px] font-normal text-base bg-white text-gray-400 data-[state=active]:bg-primary data-[state=active]:text-white"
									value="yearly"
								>
									Yearly save 20%
								</TabsTrigger>
							</TabsList>
						</div>
						<TabsContent className="w-fit" value="monthly">
							<main className="flex gap-3 w-full">
								{Monthlyplans.map((plan, index) => (
									<div
										className="w-[263px] p-6 h-[467px] bg-preview-bg rounded-[12px] flex flex-col gap-[26px] "
										key={index}
									>
										<div className="flex flex-col gap-2.5 py-3 border-b border-gray-300">
											<div
												className={`w-[79px] h-[18px] rounded-[20px] ${
													plan.isCurrent && "bg-app-dark-blue"
												}  text-white flex justify-center items-center font-normal text-xs leading-[18px] `}
											>
												{plan.isCurrent && <p>Current Plan</p>}
											</div>
											<h4 className="font-normal text-2xl leading-[34px] text-gray-600">
												{plan.title}
											</h4>
											<p className="font-normal text-sm leading-[30px] text-gray-500 ">
												<span className="text-black text-5xl">{plan.price}</span>
												{plan.note}{" "}
											</p>
										</div>

										<article className="flex flex-col gap-4">
											<h5 className="font-semibold text-base leading-[22px]">includes</h5>
											<article className="space-y-2">
												{plan.features.map((feature, index) => (
													<p className="font-normal text-base leading-5" key={index}>
														{feature}{" "}
													</p>
												))}
											</article>
										</article>
										<div className="flex items-end  h-full">
											{!plan.isCurrent && (
												<AppButton
													className="flex items-center justify-center w-full py-2 px-4 rounded-xl gap-1 font-normal text-[18px]  "
													variant="primary"
												>
													{plan.btn}
													<ChevronRight />
												</AppButton>
											)}
										</div>
									</div>
								))}
							</main>
						</TabsContent>
						<TabsContent value="yearly">
							<main className="flex gap-3 w-full">
								{Yearlyplans.map((plan, index) => (
									<div
										className="w-[263px] p-6 h-[467px] bg-preview-bg rounded-[12px] flex flex-col gap-[26px] "
										key={index}
									>
										<div className="flex flex-col gap-2.5 py-3 border-b border-gray-300">
											<div
												className={`w-[79px] h-[18px] rounded-[20px] ${
													plan.isCurrent && "bg-app-dark-blue"
												}  text-white flex justify-center items-center font-normal text-xs leading-[18px] `}
											>
												{plan.isCurrent && <p>Current Plan</p>}
											</div>
											<h4 className="font-normal text-2xl leading-[34px] text-gray-600">
												{plan.title}
											</h4>
											<p className="font-normal text-sm leading-[30px] text-gray-500 ">
												<span className="text-black text-5xl">{plan.price}</span>
												{plan.note}{" "}
											</p>
										</div>

										<article className="flex flex-col gap-4">
											<h5 className="font-semibold text-base leading-[22px]">includes</h5>
											<article className="space-y-2">
												{plan.features.map((feature, index) => (
													<p className="font-normal text-base leading-5" key={index}>
														{feature}{" "}
													</p>
												))}
											</article>
										</article>
										<div className="flex items-end  h-full">
											{!plan.isCurrent && (
												<AppButton
													className="flex items-center justify-center w-full py-2 px-4 rounded-xl gap-1 font-normal text-[18px]  "
													variant="primary"
												>
													{plan.btn}
													<ChevronRight />
												</AppButton>
											)}
										</div>
									</div>
								))}
							</main>
						</TabsContent>
					</Tabs>
				</main>
			</BaseModal>
		</div>
	);
}
