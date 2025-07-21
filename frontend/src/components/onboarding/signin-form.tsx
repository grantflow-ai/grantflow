import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { SubmitButton } from "@/components/app/buttons/submit-button";
import AppInput from "@/components/app/forms/input-field";
import { IconGoAhead } from "@/components/branding/icons";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";

const signInFormSchema = z.object({
	email: z.email({ message: "This email address is not valid." }),
	firstName: z
		.string()
		.min(2, { message: "Please enter your first name." })
		.regex(/^[A-Za-z\s]+$/, {
			message: "Name must contain only letters and spaces.",
		}),
	gdprConsent: z.boolean().refine((val) => val, {
		message: "Please agree to the Terms and Privacy Policy to continue.",
	}),
	lastName: z
		.string()
		.min(2, { message: "Please enter your last name." })
		.regex(/^[A-Za-z\s]+$/, {
			message: "Name must contain only letters and spaces.",
		}),
});

export type SignInFormValues = z.infer<typeof signInFormSchema>;

export function SigninForm({
	isLoading,
	onSubmit,
	socialSignInError,
}: {
	isLoading: boolean;
	onSubmit: SubmitHandler<SignInFormValues>;
	socialSignInError?: null | React.ReactNode | string;
}) {
	const form = useForm<SignInFormValues>({
		defaultValues: {
			email: "",
			firstName: "",
			gdprConsent: false,
			lastName: "",
		},
		delayError: 5,
		mode: "onChange",
		resolver: zodResolver(signInFormSchema),
	});

	return (
		<div data-testid="email-signin-form-container">
			<Form {...form}>
				<form className="" data-testid="email-signin-form" onSubmit={form.handleSubmit(onSubmit)}>
					<FormField
						control={form.control}
						name="firstName"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<AppInput
										autoCapitalize="words"
										autoComplete="given-name"
										autoCorrect="off"
										className="form-input"
										disabled={isLoading}
										errorMessage={form.formState.errors.firstName?.message}
										id="firstName"
										label="First name"
										placeholder="Type your first name"
										testId="email-signin-form-firstname-input"
										type="text"
										{...field}
									/>
								</FormControl>
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="lastName"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<AppInput
										autoCapitalize="words"
										autoComplete="family-name"
										autoCorrect="off"
										className="form-input"
										disabled={isLoading}
										errorMessage={form.formState.errors.lastName?.message}
										id="lastName"
										label="Last name"
										placeholder="Type your last name"
										testId="email-signin-form-lastname-input"
										type="text"
										{...field}
									/>
								</FormControl>
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<AppInput
										autoCapitalize="none"
										autoComplete="email"
										autoCorrect="off"
										className="form-input"
										disabled={isLoading}
										errorMessage={socialSignInError ?? form.formState.errors.email?.message}
										id="email"
										label="Email"
										placeholder="name@example.com"
										testId="email-signin-form-email-input"
										type="email"
										{...field}
									/>
								</FormControl>
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="gdprConsent"
						render={({ field }) => (
							<FormItem className="mt-2 flex flex-row items-start gap-1">
								<FormControl>
									<Checkbox
										checked={field.value}
										data-testid="email-signin-form-gdpr-checkbox"
										disabled={isLoading}
										onCheckedChange={field.onChange}
									/>
								</FormControl>
								<div className="space-y-1 leading-none">
									<FormLabel className="text-xs font-normal text-gray-500 gap-0.5 data-[error=true]:text-gray-500">
										By signing up, you agree to our{" "}
										<Link
											className="text-primary hover:underline"
											href="/terms"
											rel="noopener noreferrer"
											target="_blank"
										>
											Terms
										</Link>
										and
										<Link
											className="text-primary hover:underline"
											href="/privacy"
											rel="noopener noreferrer"
											target="_blank"
										>
											Privacy Policy
										</Link>
										.
									</FormLabel>
								</div>
							</FormItem>
						)}
					/>
					{form.formState.errors.gdprConsent && (
						<div className="mt-5">
							<p
								className="text-base text-destructive text-start font-semibold font-heading leading-snug"
								data-testid="email-signin-form-general-error"
							>
								{form.formState.errors.gdprConsent.message}
							</p>
						</div>
					)}
					<SubmitButton
						className="mb-8 mt-6 w-full"
						data-testid="email-signin-form-submit-button"
						disabled={!form.formState.isValid || isLoading}
						isLoading={isLoading}
						rightIcon={<IconGoAhead />}
						size="lg"
					>
						Start here
					</SubmitButton>
				</form>
			</Form>
		</div>
	);
}
