"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { AppCard, AppCardContent } from "@/components/app/app-card";
import { SubmitButton } from "@/components/app/buttons/submit-button";
import AppInput from "@/components/app/fields/input-field";
import { LogoDark } from "@/components/branding/icons/logo";
import { AuthCardHeader } from "@/components/onboarding/auth-card-header";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useUserStore } from "@/stores/user-store";
import { updateUserProfile } from "@/utils/firebase";
import { log } from "@/utils/logger/client";
import { routes } from "@/utils/navigation";

const onboardingFormSchema = z.object({
	displayName: z.string().min(1, "Display name is required").min(2, "Display name must be at least 2 characters"),
});

type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export default function Onboarding() {
	const router = useRouter();
	const { setUser, user } = useUserStore();
	const [isLoading, setIsLoading] = useState(false);

	const form = useForm<OnboardingFormValues>({
		defaultValues: {
			displayName: user?.displayName ?? "",
		},
		resolver: zodResolver(onboardingFormSchema),
	});

	useEffect(() => {
		if (!user) {
			log.warn("No user found in onboarding, redirecting to login");
			router.replace(routes.login());
			return;
		}

		if (user.displayName && user.displayName.trim().length >= 2) {
			log.info("User profile already complete, redirecting to organization");
			router.replace(routes.organization.root());
		}
	}, [user, router]);

	const onSubmit = async (data: OnboardingFormValues) => {
		if (!user) {
			toast.error("No user found. Please log in again.");
			router.replace(routes.login());
			return;
		}

		setIsLoading(true);

		try {
			log.info("Updating user profile", { displayName: data.displayName });

			await updateUserProfile({
				displayName: data.displayName,
			});

			setUser({
				...user,
				displayName: data.displayName,
			});

			toast.success("Profile completed successfully!");

			router.replace(routes.organization.root());
		} catch (error) {
			log.error("Failed to update user profile", error);
			toast.error("Failed to update profile. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	if (!user) {
		return null;
	}

	if (user.displayName && user.displayName.trim().length >= 2) {
		return null;
	}

	return (
		<div
			className="text-card-foreground relative flex size-full min-h-screen place-items-center overflow-hidden bg-white p-2 text-center"
			data-testid="onboarding-container"
		>
			<div className="z-10 flex w-full flex-col items-center justify-center">
				<div className="w-full max-w-md">
					<LogoDark className="mx-auto mb-8 h-12 w-auto" />

					<AppCard className="border-primary border bg-white px-7 pb-2 pt-7 shadow-md sm:px-9 sm:pb-3 sm:pt-9">
						<AuthCardHeader
							description="Just a few more details to get started"
							title="Complete Your Profile"
						/>
						<AppCardContent>
							<Form {...form}>
								<form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
									<FormField
										control={form.control}
										name="displayName"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Display Name</FormLabel>
												<FormControl>
													<AppInput
														{...field}
														data-testid="onboarding-display-name-input"
														disabled={isLoading}
														placeholder="Enter your display name"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<SubmitButton
										className="w-full"
										data-testid="onboarding-submit-button"
										isLoading={isLoading}
										type="submit"
									>
										Complete Setup
									</SubmitButton>
								</form>
							</Form>
						</AppCardContent>
					</AppCard>
				</div>
			</div>
		</div>
	);
}
