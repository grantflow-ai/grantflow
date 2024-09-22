"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

import { signInWithEmail } from "@/actions/auth";
import { FormButton } from "@/components/form-button";
import { InfoMessage } from "@/constants";
import type { Localisation } from "@/i18n";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

const emailSchema = z.object({
	email: z.string().email({ message: "Invalid email address" }),
});

export type EmailFormValues = z.infer<typeof emailSchema>;

export function EmailSigninForm({ locales }: { locales: Localisation }) {
	const [isEmailSent, setIsEmailSent] = useState(false);

	const emailForm = useForm<EmailFormValues>({
		resolver: zodResolver(emailSchema),
		defaultValues: { email: "" },
	});

	const onEmailSubmit: SubmitHandler<EmailFormValues> = async (values) => {
		const error = await signInWithEmail(values.email);
		if (error) {
			toast.error(error, { duration: 3000 });
			return;
		}
		setIsEmailSent(true);
		toast.info(InfoMessage.MAGIC_LINK_SENT, { duration: 3000 });
	};

	return (
		<div data-testid="email-signin-form">
			{isEmailSent ? (
				<div
					className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3"
					data-testid="email-signin-form-magic-link-sent-message"
				>
					<CheckCircle className="h-6 w-6 text-green-500" />
					<p className="text-green-700 font-medium">{locales.emailSigninForm.magicLinkSent}</p>
				</div>
			) : (
				<EmailForm form={emailForm} onSubmit={onEmailSubmit} locales={locales} />
			)}
		</div>
	);
}

function EmailForm({
	form,
	onSubmit,
	locales,
}: {
	form: ReturnType<typeof useForm<EmailFormValues>>;
	onSubmit: SubmitHandler<EmailFormValues>;
	locales: Localisation;
}) {
	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="mb-4" data-testid="email-signin-form">
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
							<FormMessage data-testid="email-input-error-message" className="text-destructive" />
						</FormItem>
					)}
				/>
				<FormButton
					className="mt-4 mb-2 w-full"
					isLoading={form.formState.isSubmitting}
					disabled={!form.formState.isValid}
					data-testid="email-signin-form-submit-button"
				>
					{locales.emailSigninForm.sendMagicLink}
				</FormButton>
			</form>
		</Form>
	);
}
