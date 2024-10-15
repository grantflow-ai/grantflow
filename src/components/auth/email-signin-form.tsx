"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormButton } from "@/components/form-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";
import { sendMagicLink } from "@/actions/send-magic-link";

const emailSchema = z.object({
	email: z.string().email({ message: "Invalid email address" }),
});

export type EmailFormValues = z.infer<typeof emailSchema>;

export function EmailSigninForm() {
	const form = useForm<EmailFormValues>({
		resolver: zodResolver(emailSchema),
		defaultValues: { email: "" },
		delayError: 5,
	});

	return (
		<div data-testid="email-signin-form">
			<Form {...form}>
				<form
					className="mb-4"
					data-testid="email-signin-form"
					action={async (formData) => {
						await sendMagicLink(formData);
					}}
				>
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
										data-testid="email-signin-form-email-input"
										{...field}
									/>
								</FormControl>
								{form.formState.errors.email?.message && (
									<FormMessage data-testid="email-input-error-message" className="text-destructive">
										{form.formState.errors.email.message}
									</FormMessage>
								)}
							</FormItem>
						)}
					/>
					<FormButton
						className="mt-4 mb-2 w-full"
						isLoading={form.formState.isSubmitting}
						disabled={!form.formState.isValid}
						data-testid="email-signin-form-submit-button"
					>
						Send Magic Link
					</FormButton>
				</form>
			</Form>
		</div>
	);
}
