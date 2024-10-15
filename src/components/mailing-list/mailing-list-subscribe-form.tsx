"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type FormHTMLAttributes, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

import { subscribeToMailingList } from "@/actions/mailing-list";
import { FormButton } from "@/components/form-button";
import { cn } from "gen/cn";
import { Form, FormControl, FormField, FormItem, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";
import { toast } from "sonner";

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
			<div className="text-center" data-testid="waiting-list-thank-you">
				<h2 className="text-2xl font-bold mb-2">Thank you for joining the waiting list!</h2>
				<p>You&apos;ll hear from us soon!</p>
			</div>
		);
	}

	return (
		<div data-testid="waiting-list-form">
			<h3 className="font-filicudi-solid">Join the waitlist!</h3>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className={cn("w-[20rem] p-4 mx-auto flex gap-4 items-center justify-around", className)}
					data-testid="subscribe-form-email"
					{...rest}
				>
					<FormField
						name="email"
						control={form.control}
						render={({ field }) => (
							<FormItem>
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
					<div>
						<FormButton
							variant="secondary"
							isLoading={form.formState.isSubmitting}
							disabled={!form.formState.isValid}
							data-testid="subscribe-form-submit-button"
						>
							Join
						</FormButton>
					</div>
				</form>
			</Form>
		</div>
	);
}
