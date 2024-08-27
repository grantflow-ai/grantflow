"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

import { signInWithEmail, verifyEmailOTP } from "@/actions/auth";
import { FormButton } from "@/components/form-button";
import { EmailSigninType } from "@/config/enums";
import { InfoMessage } from "@/constants";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";
import { toast } from "sonner";

const emailSchema = z.object({
	email: z.string().email({ message: "Invalid email address" }),
});

const otpSchema = z.object({
	otp: z.string().length(6, { message: "OTP must be 6 digits" }),
});

export function EmailSigninForm() {
	const [isOtpSent, setIsOtpSent] = useState(false);

	const emailForm = useForm<z.infer<typeof emailSchema>>({
		resolver: zodResolver(emailSchema),
		defaultValues: {
			email: "",
		},
	});

	const otpForm = useForm<z.infer<typeof otpSchema>>({
		resolver: zodResolver(otpSchema),
		defaultValues: {
			otp: "",
		},
	});

	const onEmailSubmit: SubmitHandler<z.infer<typeof emailSchema>> = async (values) => {
		const error = await signInWithEmail(values.email, EmailSigninType.OTP);
		if (error) {
			toast.error(error, { duration: 3000 });
			return;
		}
		setIsOtpSent(true);
		toast.info(InfoMessage.EMAIL_OTP_SENT, { duration: 3000 });
	};

	const onOtpSubmit: SubmitHandler<z.infer<typeof otpSchema>> = async (values) => {
		const { email } = emailForm.getValues();
		const error = await verifyEmailOTP(email, values.otp);
		if (error) {
			toast.error(error, { duration: 3000 });
			return;
		}
		toast.success(InfoMessage.EMAIL_OTP_VERIFIED, { duration: 3000 });
	};

	return (
		<>
			{isOtpSent ? (
				<Form {...otpForm}>
					<form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="mb-4" data-testid="email-signin-form">
						<FormField
							name="otp"
							control={otpForm.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel htmlFor="otp">One-Time Password</FormLabel>
									<FormControl>
										<Input
											id="otp"
											placeholder="123456"
											type="text"
											inputMode="numeric"
											pattern="[0-9]*"
											maxLength={6}
											autoComplete="one-time-code"
											className="form-input rounded p-10"
											data-testid="email-signin-form-otp-input"
											{...field}
										/>
									</FormControl>
									{otpForm.formState.errors.otp?.message && (
										<FormMessage data-testid="otp-input-error-message" className="text-destructive">
											{otpForm.formState.errors.otp.message}
										</FormMessage>
									)}
								</FormItem>
							)}
						/>
						<FormButton
							className="mt-4 mb-2 w-full"
							isLoading={otpForm.formState.isSubmitting}
							disabled={!otpForm.formState.isValid}
							data-testid="email-signin-form-verify-button"
						>
							Verify OTP
						</FormButton>
					</form>
				</Form>
			) : (
				<Form {...emailForm}>
					<form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="mb-4" data-testid="email-signin-otp-form">
						<FormField
							name="email"
							control={emailForm.control}
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
									{emailForm.formState.errors.email?.message && (
										<FormMessage data-testid="email-input-error-message" className="text-destructive">
											{emailForm.formState.errors.email.message}
										</FormMessage>
									)}
								</FormItem>
							)}
						/>
						<FormButton
							className="mt-4 mb-2 w-full"
							isLoading={emailForm.formState.isSubmitting}
							disabled={!emailForm.formState.isValid}
							data-testid="email-signin-form-submit-button"
						>
							Send OTP
						</FormButton>
					</form>
				</Form>
			)}
		</>
	);
}
