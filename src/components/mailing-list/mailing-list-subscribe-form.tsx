"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type FormHTMLAttributes, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

import { subscribeToMailingList } from "@/actions/mailing-list";
import { FormButton } from "@/components/form-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";
import { toast } from "sonner";
import { cn } from "gen/cn";

const subscribeSchema = z.object({
	email: z.string().email({ message: "Invalid email address" }),
});

export type SubscribeFormValues = z.infer<typeof subscribeSchema>;

export function SubscribeToMailingListForm({ className, ...rest }: FormHTMLAttributes<HTMLFormElement>) {
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
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className={cn("mb-4 w-full", className)}
				data-testid="subscribe-form-email"
				{...rest}
			>
				<FormField
					name="email"
					control={form.control}
					render={({ field }) => (
						<FormItem>
							<FormLabel htmlFor="email" className="text-2xl md:text-3xl font-bold mb-6 text-primary-foreground">
								Subscribe to our mailing list
							</FormLabel>
							<FormControl>
								<Input
									id="email"
									placeholder="name@example.com"
									type="email"
									autoCapitalize="none"
									autoComplete="email"
									autoCorrect="off"
									className="form-input rounded"
									data-testid="subscribe-form-email-input"
									{...field}
								/>
							</FormControl>
							<FormMessage data-testid="email-input-error-message" className="text-destructive" />
						</FormItem>
					)}
				/>
				<FormButton
					className="mt-4 mb-2 max-w-[50%]"
					isLoading={form.formState.isSubmitting}
					disabled={!form.formState.isValid}
					data-testid="subscribe-form-submit-button"
				>
					Subscribe
				</FormButton>
			</form>
		</Form>
	);
}
