"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

import { subscribeToMailingList } from "@/actions/mailing-list";
import { FormButton } from "@/components/form-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";
import { toast } from "sonner";

const subscribeSchema = z.object({
	email: z.string().email({ message: "Invalid email address" }),
});

export type SubscribeFormValues = z.infer<typeof subscribeSchema>;

export function SubscribeForm() {
	const [isSubscribed, setIsSubscribed] = useState(false);

	const form = useForm<SubscribeFormValues>({
		resolver: zodResolver(subscribeSchema),
		defaultValues: { email: "" },
	});

	const onSubmit: SubmitHandler<SubscribeFormValues> = async (values) => {
		const error = await subscribeToMailingList(values.email);
		if (error) {
			toast.error(error, { duration: 3000 });
			return;
		}
		setIsSubscribed(true);
		toast.success("Successfully subscribed to the mailing list!", {
			duration: 3000,
		});
	};

	if (isSubscribed) {
		return (
			<div className="text-center">
				<h2 className="text-2xl font-bold mb-2">Thank you for subscribing!</h2>
				<p>You'll receive our newsletter at the email address you provided.</p>
			</div>
		);
	}

	return (
		<div data-testid="subscribe-form">
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="mb-4" data-testid="subscribe-form-email">
					<FormField
						name="email"
						control={form.control}
						render={({ field }) => (
							<FormItem>
								<FormLabel htmlFor="email">Email</FormLabel>
								<FormControl>
									<Input
										id="email"
										placeholder="name@example.com"
										type="email"
										autoCapitalize="none"
										autoComplete="email"
										autoCorrect="off"
										className="form-input"
										data-testid="subscribe-form-email-input"
										{...field}
									/>
								</FormControl>
								<FormMessage data-testid="email-input-error-message" className="text-destructive" />
							</FormItem>
						)}
					/>
					<FormButton
						className="mt-4 mb-2 w-full"
						isLoading={form.formState.isSubmitting}
						disabled={!form.formState.isValid}
						data-testid="subscribe-form-submit-button"
					>
						Subscribe
					</FormButton>
				</form>
			</Form>
		</div>
	);
}
