import { render } from "@react-email/render";
import EmailVerificationTemplate from "./email-verification-template";


describe("EmailVerificationTemplate", () => {
	const mockVerificationUrl = "https://grantflow.ai/verify-email?token=test-token";

	it("renders email with verification URL", async () => {
		const html = await render(<EmailVerificationTemplate verificationUrl={mockVerificationUrl} />);

		expect(html).toContain("Verify your email to complete your GrantFlow registration");
		expect(html).toContain("Dear Researcher");
		expect(html).toContain("Thanks for signing up!");
		expect(html).toContain(mockVerificationUrl);
	});

	it("includes verify button with correct href", async () => {
		const html = await render(<EmailVerificationTemplate verificationUrl={mockVerificationUrl} />);

		expect(html).toContain(`href="${mockVerificationUrl}"`);
		expect(html).toContain("Verify My Email");
	});

	it("includes expiration warning", async () => {
		const html = await render(<EmailVerificationTemplate verificationUrl={mockVerificationUrl} />);

		expect(html).toContain("This link will expire in 24 hours for security reasons");
	});

	it("includes fallback text for button", async () => {
		const html = await render(<EmailVerificationTemplate verificationUrl={mockVerificationUrl} />);

		expect(html).toContain("If the button doesn&#x27;t work, you can copy and paste the following link");
	});

	it("includes ignore message for non-users", async () => {
		const html = await render(<EmailVerificationTemplate verificationUrl={mockVerificationUrl} />);

		expect(html).toContain("If you didn&#x27;t create an account, you can safely ignore this email");
	});

	it("includes proper footer with preferences link", async () => {
		const html = await render(<EmailVerificationTemplate verificationUrl={mockVerificationUrl} />);

		expect(html).toContain("Want to change how you receive these emails?");
		expect(html).toContain("update your preferences");
	});

	it("includes GrantFlow branding", async () => {
		const html = await render(<EmailVerificationTemplate verificationUrl={mockVerificationUrl} />);

		expect(html).toContain("GrantFlow");
		expect(html).toContain("By Vsphera");
	});

	it("includes warm sign-off", async () => {
		const html = await render(<EmailVerificationTemplate verificationUrl={mockVerificationUrl} />);

		expect(html).toContain("Looking forward to helping you simplify your grant applications");
		expect(html).toContain("Warm regards");
		expect(html).toContain("Vsphera Team");
	});

	it("generates valid HTML structure", async () => {
		const html = await render(<EmailVerificationTemplate verificationUrl={mockVerificationUrl} />);

		expect(html).toContain("<!DOCTYPE html");
		expect(html).toContain("<html");
		expect(html).toContain("<body");
		expect(html).toContain("</body>");
		expect(html).toContain("</html>");
	});

	it("includes preview text", async () => {
		const html = await render(<EmailVerificationTemplate verificationUrl={mockVerificationUrl} />);

		expect(html).toContain("Verify your email to complete your GrantFlow registration");
	});
});
