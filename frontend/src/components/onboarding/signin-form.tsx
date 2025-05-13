import { SubmitButton } from "@/components/submit-button";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { IconGoAhead } from "@/components/icons";
import { AppInput } from "@/components/input-field";

const signInFormSchema = z.object({
	email: z.string().email({ message: "Invalid email address" }),
	firstName: z.string().min(2, { message: "First name must be at least 2 characters" }),
	lastName: z.string().min(2, { message: "Last name must be at least 2 characters" }),
});

export type SignInFormValues = z.infer<typeof signInFormSchema>;

export function SigninForm({ isLoading, onSubmit }: { isLoading: boolean; onSubmit: SubmitHandler<SignInFormValues> }) {
	const form = useForm<SignInFormValues>({
		defaultValues: { email: "", firstName: "", lastName: "" },
		delayError: 5,
		resolver: zodResolver(signInFormSchema),
	});

	return (
		<div data-testid="email-signin-form-container">
			<Form {...form}>
				<form className="space-y-5" data-testid="email-signin-form" onSubmit={form.handleSubmit(onSubmit)}>
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
										data-testid="email-signin-form-firstname-input"
										id="firstName"
										label="First name"
										placeholder="Type your first name"
										type="text"
										{...field}
									></AppInput>
								</FormControl>
								{form.formState.errors.firstName?.message && (
									<FormMessage
										className="text-destructive"
										data-testid="firstname-input-error-message"
									>
										{form.formState.errors.firstName.message}
									</FormMessage>
								)}
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
										data-testid="email-signin-form-lastname-input"
										id="lastName"
										label="Last name"
										placeholder="Type your last name"
										type="text"
										{...field}
									></AppInput>
								</FormControl>
								{form.formState.errors.lastName?.message && (
									<FormMessage
										className="text-destructive"
										data-testid="lastname-input-error-message"
									>
										{form.formState.errors.lastName.message}
									</FormMessage>
								)}
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
										data-testid="email-signin-form-email-input"
										id="email"
										label="Email"
										placeholder="name@example.com"
										type="email"
										{...field}
									></AppInput>
								</FormControl>
								{form.formState.errors.email?.message && (
									<FormMessage className="" data-testid="email-input-error-message">
										{form.formState.errors.email.message}
									</FormMessage>
								)}
							</FormItem>
						)}
					/>
					<SubmitButton
						canBeDisabled={false}
						className="mt-3 mb-8 w-full"
						data-testid="email-signin-form-submit-button"
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
