import { render } from "@react-email/render";
import InviteCollaboratorsEmailTemplate from "./invitation-email-template";

describe("InviteCollaboratorsEmailTemplate", () => {
	const mockProps = {
		acceptInvitationUrl: "https://grantflow.ai/accept-invitation?token=test-token",
		inviterName: "Dr. Jane Smith",
		projectName: "Climate Change Research Grant",
	};

	it("renders email with all required props", async () => {
		const html = await render(<InviteCollaboratorsEmailTemplate {...mockProps} />);

		expect(html).toContain("You&#x27;ve been invited to collaborate on Climate Change Research Grant");
		expect(html).toContain("Dear Researcher");
		expect(html).toContain("Dr. Jane Smith");
		expect(html).toContain("Climate Change Research Grant");
	});

	it("includes accept invitation button with correct href", async () => {
		const html = await render(<InviteCollaboratorsEmailTemplate {...mockProps} />);

		expect(html).toContain(`href="${mockProps.acceptInvitationUrl}"`);
		expect(html).toContain("Accept Invitation");
	});

	it("includes project name with proper formatting", async () => {
		const html = await render(<InviteCollaboratorsEmailTemplate {...mockProps} />);

		expect(html).toContain(mockProps.projectName);
		expect(html).toContain("&quot;");
	});

	it("includes information about GrantFlow platform", async () => {
		const html = await render(<InviteCollaboratorsEmailTemplate {...mockProps} />);

		expect(html).toContain(
			"GrantFlow is designed to help research teams streamline and manage the grant application process",
		);
	});

	it("includes collaborator benefits description", async () => {
		const html = await render(<InviteCollaboratorsEmailTemplate {...mockProps} />);

		expect(html).toContain("As a collaborator, you will gain access to the project workspace");
		expect(html).toContain("contribute to grant applications and related documentation");
	});

	it("includes sign-up process information", async () => {
		const html = await render(<InviteCollaboratorsEmailTemplate {...mockProps} />);

		expect(html).toContain("If you do not yet have a GrantFlow account");
		expect(html).toContain("guided through a brief sign-up process");
	});

	it("includes proper footer with preferences link", async () => {
		const html = await render(<InviteCollaboratorsEmailTemplate {...mockProps} />);

		expect(html).toContain("Want to change how you receive these emails?");
		expect(html).toContain("update your preferences");
	});

	it("includes GrantFlow branding", async () => {
		const html = await render(<InviteCollaboratorsEmailTemplate {...mockProps} />);

		expect(html).toContain("GrantFlow");
		expect(html).toContain("By Vsphera");
	});

	it("includes warm sign-off", async () => {
		const html = await render(<InviteCollaboratorsEmailTemplate {...mockProps} />);

		expect(html).toContain("We look forward to your participation");
		expect(html).toContain("Warm regards");
		expect(html).toContain("Vsphera Team");
	});

	it("generates valid HTML structure", async () => {
		const html = await render(<InviteCollaboratorsEmailTemplate {...mockProps} />);

		expect(html).toContain("<!DOCTYPE html");
		expect(html).toContain("<html");
		expect(html).toContain("<body");
		expect(html).toContain("</body>");
		expect(html).toContain("</html>");
	});

	it("includes preview text with project name", async () => {
		const html = await render(<InviteCollaboratorsEmailTemplate {...mockProps} />);

		expect(html).toContain("You&#x27;ve been invited to collaborate on Climate Change Research Grant");
	});

	it("properly escapes special characters in project name", async () => {
		const propsWithSpecialChars = {
			...mockProps,
			projectName: "Research & Development 'Test' Project",
		};
		const html = await render(<InviteCollaboratorsEmailTemplate {...propsWithSpecialChars} />);

		expect(html).toContain("Research &amp; Development &#x27;Test&#x27; Project");
	});
});
