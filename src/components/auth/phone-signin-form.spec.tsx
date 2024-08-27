import { signInWithPhone, verifyPhoneOTP } from "@/actions/auth";
import { PhoneSigninType } from "@/config/enums";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { PhoneSigninForm } from "./phone-signin-form";

vi.mock("@/actions/auth", () => ({
	signInWithPhone: vi.fn(),
	verifyPhoneOTP: vi.fn(),
}));

describe("PhoneSigninForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders PhoneForm initially", () => {
		render(<PhoneSigninForm />);
		expect(screen.getByTestId("phone-signin-form-phone-input")).toBeInTheDocument();
		expect(screen.queryByTestId("phone-signin-form-otp-input")).not.toBeInTheDocument();
	});

	it("switches to OtpForm after successful phone submission", async () => {
		vi.mocked(signInWithPhone).mockResolvedValue(undefined);
		render(<PhoneSigninForm />);

		await act(async () => {
			fireEvent.change(screen.getByTestId("phone-signin-form-phone-input"), { target: { value: "+15875302271" } });
		});

		await act(async () => {
			fireEvent.click(screen.getByTestId("phone-signin-form-submit-button"));
		});

		await waitFor(() => {
			expect(screen.getByTestId("phone-signin-form-otp-form")).toBeInTheDocument();
		});
	});

	it("shows error toast on phone submission failure", async () => {
		vi.mocked(signInWithPhone).mockResolvedValue("Error message");
		render(<PhoneSigninForm />);

		await act(async () => {
			fireEvent.change(screen.getByTestId("phone-signin-form-phone-input"), { target: { value: "+15875302271" } });
		});

		await act(async () => {
			fireEvent.click(screen.getByTestId("phone-signin-form-submit-button"));
		});

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Error message", { duration: 3000 });
		});
	});

	it("shows success toast on OTP verification success", async () => {
		vi.mocked(signInWithPhone).mockResolvedValue(undefined);
		vi.mocked(verifyPhoneOTP).mockResolvedValue(undefined);
		render(<PhoneSigninForm />);

		await act(async () => {
			fireEvent.change(screen.getByTestId("phone-signin-form-phone-input"), { target: { value: "+15875302271" } });
		});

		await act(async () => {
			fireEvent.click(screen.getByTestId("phone-signin-form-submit-button"));
		});

		await waitFor(() => {
			expect(screen.getByTestId("phone-signin-form-otp-input")).toBeInTheDocument();
		});

		await act(async () => {
			fireEvent.change(screen.getByTestId("phone-signin-form-otp-input"), { target: { value: "123456" } });
		});

		await act(async () => {
			fireEvent.click(screen.getByTestId("phone-signin-form-verify-button"));
		});

		await waitFor(() => {
			expect(toast.success).toHaveBeenCalled();
		});
	});

	it("renders SMS button text by default", () => {
		render(<PhoneSigninForm />);
		expect(screen.getByText("Send OTP")).toBeInTheDocument();
	});

	it("renders WhatsApp button text when signingType is WHATSAPP", () => {
		render(<PhoneSigninForm signingType={PhoneSigninType.WHATSAPP} />);
		expect(screen.getByText("Send WhatsApp OTP")).toBeInTheDocument();
	});
});
