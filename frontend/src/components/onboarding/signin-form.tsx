import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

import { IconGoAhead } from "@/components/icons";
import AppInput from "@/components/input-field";
import { SubmitButton } from "@/components/submit-button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";

const signInFormSchema = z.object({
	email: z
		.string()
		.min(1, { message: "Please enter your email address." })
		.email({ message: "This email address is not valid." }),
	firstName: z
		.string()
		.min(2, { message: "Please enter your first name." })
		.regex(/^[A-Za-z\s]+$/, {
			message: "Name must contain only letters and spaces.",
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
		defaultValues: { email: "", firstName: "", lastName: "" },
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
					<SubmitButton
						className="mb-8 mt-3 w-full"
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
