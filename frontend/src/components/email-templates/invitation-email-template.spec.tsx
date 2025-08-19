import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import InvitationEmailTemplate from "./invitation-email-template";


describe("InvitationEmailTemplate", () => {
	const mockInviterName = "John Doe";
	const mockProjectName = "Climate Research Grant";
	const mockRole = "Collaborator";
	const mockAcceptInvitationUrl = "https://example.com/accept-invitation?token=abc123";

	it("renders email with all required props", async () => {
		const html = await render(
			<InvitationEmailTemplate
				acceptInvitationUrl={mockAcceptInvitationUrl}
				inviterName={mockInviterName}
				projectName={mockProjectName}
				role={mockRole}
			/>,
		);

		expect(html).toContain("You&#x27;ve been invited to collaborate on Climate Research Grant");
		expect(html).toContain("Invitation to Collaborate on a Research Project");
		expect(html).toContain(mockInviterName);
		expect(html).toContain(mockProjectName);
		expect(html).toContain(mockRole);
		expect(html).toContain(mockAcceptInvitationUrl);
	});

	it("renders email preview correctly", async () => {
		const html = await render(
			<InvitationEmailTemplate
				acceptInvitationUrl={mockAcceptInvitationUrl}
				inviterName={mockInviterName}
				projectName={mockProjectName}
				role={mockRole}
			/>,
		);

		expect(html).toContain("You&#x27;ve been invited to collaborate on Climate Research Grant");
	});

	it("includes GrantFlow branding", async () => {
		const html = await render(
			<InvitationEmailTemplate
				acceptInvitationUrl={mockAcceptInvitationUrl}
				inviterName={mockInviterName}
				projectName={mockProjectName}
				role={mockRole}
			/>,
		);

		expect(html).toContain("GrantFlow");
		expect(html).toContain("The GrantFlow Team");
	});

	it("renders accept invitation button with correct URL", async () => {
		const html = await render(
			<InvitationEmailTemplate
				acceptInvitationUrl={mockAcceptInvitationUrl}
				inviterName={mockInviterName}
				projectName={mockProjectName}
				role={mockRole}
			/>,
		);

		expect(html).toContain(`href="${mockAcceptInvitationUrl}"`);
		expect(html).toContain("Accept Invitation");
	});

	it("includes project context information", async () => {
		const html = await render(
			<InvitationEmailTemplate
				acceptInvitationUrl={mockAcceptInvitationUrl}
				inviterName={mockInviterName}
				projectName={mockProjectName}
				role={mockRole}
			/>,
		);

		expect(html).toContain("You have been invited by");
		expect(html).toContain("to collaborate on the research project");
		expect(html).toContain(mockRole);
	});

	it("includes onboarding information", async () => {
		const html = await render(
			<InvitationEmailTemplate
				acceptInvitationUrl={mockAcceptInvitationUrl}
				inviterName={mockInviterName}
				projectName={mockProjectName}
				role={mockRole}
			/>,
		);

		expect(html).toContain("If you do not yet have a GrantFlow account");
		expect(html).toContain("you will be guided through a brief sign-up process");
	});

	it("includes footer with privacy information", async () => {
		const html = await render(
			<InvitationEmailTemplate
				acceptInvitationUrl={mockAcceptInvitationUrl}
				inviterName={mockInviterName}
				projectName={mockProjectName}
				role={mockRole}
			/>,
		);

		expect(html).toContain(mockInviterName);
		expect(html).toContain("from GrantFlow");
		expect(html).toContain("If you received this email by mistake, you can safely ignore it");
		expect(html).toContain("2025 GrantFlow. All rights reserved");
	});

	it("formats project name with special styling", async () => {
		const html = await render(
			<InvitationEmailTemplate
				acceptInvitationUrl={mockAcceptInvitationUrl}
				inviterName={mockInviterName}
				projectName={mockProjectName}
				role={mockRole}
			/>,
		);

		expect(html).toContain("Climate Research Grant");
	});

	it("includes proper email structure", async () => {
		const html = await render(
			<InvitationEmailTemplate
				acceptInvitationUrl={mockAcceptInvitationUrl}
				inviterName={mockInviterName}
				projectName={mockProjectName}
				role={mockRole}
			/>,
		);

		expect(html).toContain("<!DOCTYPE html");
		expect(html).toContain("<html");
		expect(html).toContain("<head");
		expect(html).toContain("<body");
		expect(html).toContain("</html>");
	});

	it("handles special characters in project name", async () => {
		const specialProjectName = "Research & Development: AI/ML Project";
		const html = await render(
			<InvitationEmailTemplate
				acceptInvitationUrl={mockAcceptInvitationUrl}
				inviterName={mockInviterName}
				projectName={specialProjectName}
				role={mockRole}
			/>,
		);

		expect(html).toContain("Research &amp; Development: AI/ML Project");
	});
});
