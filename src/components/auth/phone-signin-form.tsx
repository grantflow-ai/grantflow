import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { isMobilePhone } from "validator";
import { z } from "zod";

import { signInWithPhone, verifyPhoneOTP } from "@/actions/auth";
import { FormButton } from "@/components/form-button";
import { PhoneSigninType } from "@/config/enums";
import { InfoMessage } from "@/constants";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "gen/ui/form";
import { Input } from "gen/ui/input";

const phoneSchema = z.object({
	phoneNumber: z.string().refine(isMobilePhone, "Invalid phone number"),
});

const otpSchema = z.object({
	otp: z.string().length(6, { message: "OTP must be 6 digits" }),
});

export type PhoneFormValues = z.infer<typeof phoneSchema>;
export type OtpFormValues = z.infer<typeof otpSchema>;

export function PhoneSigninForm({ signingType = PhoneSigninType.SMS }: { signingType?: PhoneSigninType }) {
	const [isOtpSent, setIsOtpSent] = useState(false);

	const phoneForm = useForm<PhoneFormValues>({
		resolver: zodResolver(phoneSchema),
		defaultValues: { phoneNumber: "" },
	});

	const otpForm = useForm<OtpFormValues>({
		resolver: zodResolver(otpSchema),
		defaultValues: { otp: "" },
	});

	const onPhoneSubmit: SubmitHandler<PhoneFormValues> = async (values) => {
		const error = await signInWithPhone(values.phoneNumber, signingType);
		if (error) {
			toast.error(error, { duration: 3000 });
			return;
		}
		setIsOtpSent(true);
		toast.info(InfoMessage.PHONE_OTP_SENT, { duration: 3000 });
	};

	const onOtpSubmit: SubmitHandler<OtpFormValues> = async (values) => {
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
				<OtpForm form={otpForm} onSubmit={onOtpSubmit} />
			) : (
				<PhoneForm form={phoneForm} onSubmit={onPhoneSubmit} signingType={signingType} />
			)}
		</div>
	);
}

function PhoneForm({
	form,
	onSubmit,
	signingType,
}: {
	form: ReturnType<typeof useForm<PhoneFormValues>>;
	onSubmit: SubmitHandler<PhoneFormValues>;
	signingType: PhoneSigninType;
}) {
	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="mb-4" data-testid="phone-signin-form-phone-form">
				<FormField
					name="phoneNumber"
					control={form.control}
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
							<FormMessage data-testid="phone-input-error-message" className="text-destructive" />
						</FormItem>
					)}
				/>
				<FormButton className="mt-4 mb-2 w-full" type="submit" data-testid="phone-signin-form-submit-button">
					{signingType === PhoneSigninType.SMS ? "Send OTP" : "Send WhatsApp OTP"}
				</FormButton>
			</form>
		</Form>
	);
}

function OtpForm({
	form,
	onSubmit,
}: {
	form: ReturnType<typeof useForm<OtpFormValues>>;
	onSubmit: SubmitHandler<OtpFormValues>;
}) {
	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="mb-4" data-testid="phone-signin-form-otp-form">
				<FormField
					name="otp"
					control={form.control}
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
							<FormMessage data-testid="otp-input-error-message" className="text-destructive" />
						</FormItem>
					)}
				/>
				<FormButton className="mt-4 mb-2 w-full" type="submit" data-testid="phone-signin-form-verify-button">
					Verify OTP
				</FormButton>
			</form>
		</Form>
	);
}
