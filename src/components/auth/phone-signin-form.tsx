"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

import { signInWithPhone, verifyPhoneOTP } from "@/actions/auth";
import { FormButton } from "@/components/form-button";
import { InfoMessage } from "@/constants";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";
import { toast } from "sonner";
import { isMobilePhone } from "validator";

const phoneSchema = z.object({
	phoneNumber: z.string().refine(isMobilePhone),
});

const otpSchema = z.object({
	otp: z.string().length(6, { message: "OTP must be 6 digits" }),
});

export function PhoneSigninForm({ channel = "sms" }: { channel?: "sms" | "whatsapp" }) {
	const [isOtpSent, setIsOtpSent] = useState(false);

	const phoneForm = useForm<z.infer<typeof phoneSchema>>({
		resolver: zodResolver(phoneSchema),
		defaultValues: {
			phoneNumber: "",
		},
	});

	const otpForm = useForm<z.infer<typeof otpSchema>>({
		resolver: zodResolver(otpSchema),
		defaultValues: {
			otp: "",
		},
	});

	const onPhoneSubmit: SubmitHandler<z.infer<typeof phoneSchema>> = async (values) => {
		const error = await signInWithPhone(values.phoneNumber, channel);
		if (error) {
			toast.error(error, { duration: 3000 });
			return;
		}
		setIsOtpSent(true);
		toast.info(InfoMessage.PHONE_OTP_SENT, { duration: 3000 });
	};

	const onOtpSubmit: SubmitHandler<z.infer<typeof otpSchema>> = async (values) => {
		const { phoneNumber } = phoneForm.getValues();
		const error = await verifyPhoneOTP(phoneNumber, values.otp);
		if (error) {
			toast.error(error, { duration: 3000 });
			return;
		}
		toast.success(InfoMessage.PHONE_OTP_VERIFIED, { duration: 3000 });
	};

	return (
		<div data-testid="phone-signin-form">
			{isOtpSent ? (
				<Form {...otpForm}>
					<form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="mb-4">
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
											className="form-input"
											data-testid="phone-signin-form-otp-input"
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
							data-testid="phone-signin-form-verify-button"
						>
							Verify OTP
						</FormButton>
					</form>
				</Form>
			) : (
				<Form {...phoneForm}>
					<form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="mb-4">
						<FormField
							name="phoneNumber"
							control={phoneForm.control}
							render={({ field }) => (
								<FormItem>
									<FormLabel htmlFor="phoneNumber">Phone Number</FormLabel>
									<FormControl>
										<Input
											id="phoneNumber"
											placeholder="+1234567890"
											type="tel"
											autoCapitalize="none"
											autoComplete="tel"
											autoCorrect="off"
											className="form-input"
											data-testid="phone-signin-form-phone-input"
											{...field}
										/>
									</FormControl>
									{phoneForm.formState.errors.phoneNumber?.message && (
										<FormMessage data-testid="phone-input-error-message" className="text-destructive">
											{phoneForm.formState.errors.phoneNumber.message}
										</FormMessage>
									)}
								</FormItem>
							)}
						/>
						<FormButton
							className="mt-4 mb-2 w-full"
							isLoading={phoneForm.formState.isSubmitting}
							disabled={!phoneForm.formState.isValid}
							data-testid="phone-signin-form-submit-button"
						>
							{channel === "sms" ? "Send OTP" : "Send WhatsApp OTP"}
						</FormButton>
					</form>
				</Form>
			)}
		</div>
	);
}
