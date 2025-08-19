import { render } from "@react-email/render";
import PersonalAccountDeletionTemplate from "./personal-account-deletion-template";

describe("PersonalAccountDeletionTemplate", () => {
	const mockProps = {
		contactUsUrl: "https://grantflow.ai/contact",
	};

	it("renders the correct preview text", async () => {
		const html = await render(<PersonalAccountDeletionTemplate {...mockProps} />);
		expect(html).toContain("Your GrantFlow Account Is Scheduled for Deletion");
	});

	it("includes the main deletion warning", async () => {
		const html = await render(<PersonalAccountDeletionTemplate {...mockProps} />);
		expect(html).toContain("We confirm that your GrantFlow account has been scheduled for deletion");
		expect(html).toContain("permanently removed from our system in 10 days");
	});

	it("includes instructions on how to recover the account", async () => {
		const html = await render(<PersonalAccountDeletionTemplate {...mockProps} />);
		expect(html).toContain("If you change your mind or would like to recover your account");
	});

	it("includes the Contact Us button with the correct href", async () => {
		const html = await render(<PersonalAccountDeletionTemplate {...mockProps} />);
		expect(html).toContain(`href="${mockProps.contactUsUrl}"`);
		expect(html).toContain("Contact Us");
	});

	it("includes the feedback request message", async () => {
		const html = await render(<PersonalAccountDeletionTemplate {...mockProps} />);
		expect(html).toContain("We're sorry to see you go.");
	});

	it("includes the correct sign-off", async () => {
		const html = await render(<PersonalAccountDeletionTemplate {...mockProps} />);
		expect(html).toContain("Thank you for being part of GrantFlow.");
		expect(html).toContain("Warm regards,");
		expect(html).toContain("Vsphera Team");
	});

	it("generates a valid HTML structure", async () => {
		const html = await render(<PersonalAccountDeletionTemplate {...mockProps} />);
		expect(html).toContain("<!DOCTYPE html");
	});
});
