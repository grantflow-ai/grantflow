import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

import { SubmitButton } from "@/components/submit-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";

const WHITE_LISTED_EMAILS = new Set([
	"allonwag@berkeley.edu",
	"naftali.kaminski@yale.edu",
	"mgrinstein@bwh.harvard.edu",
	"dviraran@technion.ac.il",
]);

const emailSchema = z.object({
	email: z
		.string()
		.email({ message: "Invalid email address" })
		.refine((email) => WHITE_LISTED_EMAILS.has(email), {
			message: "This email address is not approved for our private beta. Please use another email address.",
		}),
});

export type EmailFormValues = z.infer<typeof emailSchema>;

export function EmailSigninForm({
	onSubmit,
	isLoading,
}: {
	onSubmit: SubmitHandler<EmailFormValues>;
	isLoading: boolean;
}) {
	const form = useForm<EmailFormValues>({
		resolver: zodResolver(emailSchema),
		defaultValues: { email: "" },
		delayError: 5,
	});

	return (
		<div data-testid="email-signin-form">
			<Form {...form}>
				<form className="mb-4" data-testid="email-signin-form" onSubmit={form.handleSubmit(onSubmit)}>
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
					<SubmitButton
						className="mt-4 mb-2 w-full"
						isLoading={isLoading}
						disabled={!form.formState.isValid}
						data-testid="email-signin-form-submit-button"
					>
						Send Magic Link
					</SubmitButton>
				</form>
			</Form>
		</div>
	);
}
