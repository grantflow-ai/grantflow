import { render } from "@react-email/render";
import OrganizationDeletedTemplate from "./organization-deleted-template";

describe("OrganizationDeletedTemplate", () => {
	const mockProps = {
		contactUsUrl: "https://grantflow.ai/support",
		organizationName: "Acme Research Inc.",
	};

	it("renders email with organization name", async () => {
		const html = await render(<OrganizationDeletedTemplate {...mockProps} />);

		expect(html).toContain("Organization Acme Research Inc. Has Been Deleted");
		expect(html).toContain("Dear Researcher");
		expect(html).toContain("We confirm that the organization <!-- -->Acme Research Inc.<!-- --> has been removed");
	});

	it("includes the main confirmation message", async () => {
		const html = await render(<OrganizationDeletedTemplate {...mockProps} />);

		expect(html).toContain("All associated documents, data, projects, and member access has been deleted.");
	});

	it("includes a message about contacting support for errors", async () => {
		const html = await render(<OrganizationDeletedTemplate {...mockProps} />);

		expect(html).toContain(
			"If this action was taken in error or you have any questions, please contact our support team.",
		);
	});

	it("includes the Contact Us button with the correct href", async () => {
		const html = await render(<OrganizationDeletedTemplate {...mockProps} />);

		expect(html).toContain(`href="${mockProps.contactUsUrl}"`);
		expect(html).toContain("Contact Us");
	});

	it("includes the feedback request message", async () => {
		const html = await render(<OrganizationDeletedTemplate {...mockProps} />);

		expect(html).toContain("We&#x27;re sorry to see you go.");
		expect(html).toContain("contact@grantflow.ai");
	});

	it("includes the correct sign-off", async () => {
		const html = await render(<OrganizationDeletedTemplate {...mockProps} />);

		expect(html).toContain("Thank you for being part of GrantFlow.");
		expect(html).toContain("Warm regards,");
		expect(html).toContain("Vsphera Team");
	});

	it("includes GrantFlow branding in the header", async () => {
		const html = await render(<OrganizationDeletedTemplate {...mockProps} />);

		expect(html).toContain("GrantFlow");
		expect(html).toContain("By Vsphera");
	});

	it("includes the footer with preferences link", async () => {
		const html = await render(<OrganizationDeletedTemplate {...mockProps} />);

		expect(html).toContain("Want to change how you receive these emails?");
		expect(html).toContain("update your preferences");
	});

	it("generates a valid HTML structure", async () => {
		const html = await render(<OrganizationDeletedTemplate {...mockProps} />);

		expect(html).toContain("<!DOCTYPE html");
		expect(html).toContain("<html");
		expect(html).toContain("<body");
		expect(html).toContain("</body>");
		expect(html).toContain("</html>");
	});
});
