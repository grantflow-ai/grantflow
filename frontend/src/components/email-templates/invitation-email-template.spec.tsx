import { render } from "@react-email/render";
import InviteCollaboratorsEmailTemplate from "./invitation-email-template";

describe("InviteCollaboratorsEmailTemplate", () => {
	const mockProjectProps = {
		acceptInvitationUrl: "https://grantflow.ai/accept-invitation?token=test-token",
		inviterName: "Dr. Jane Smith",
		projectName: "Climate Change Research Grant",
	};

	const mockOrgProps = {
		acceptInvitationUrl: "https://grantflow.ai/accept-invitation?token=test-token",
		inviterName: "Dr. Jane Smith",
		organizationName: "Test Organization",
	};

	describe("Project invitation context", () => {
		it("renders email with all required props", async () => {
			const html = await render(<InviteCollaboratorsEmailTemplate {...mockProjectProps} />);

			expect(html).toContain("You&#x27;ve been invited to collaborate on Climate Change Research Grant");
			expect(html).toContain("Dear Researcher");
			expect(html).toContain("Dr. Jane Smith");
			expect(html).toContain("Climate Change Research Grant");
		});

		it("includes accept invitation button with correct href", async () => {
			const html = await render(<InviteCollaboratorsEmailTemplate {...mockProjectProps} />);

			expect(html).toContain(`href="${mockProjectProps.acceptInvitationUrl}"`);
			expect(html).toContain("Accept Invitation");
		});

		it("includes project name with proper formatting", async () => {
			const html = await render(<InviteCollaboratorsEmailTemplate {...mockProjectProps} />);

			expect(html).toContain(mockProjectProps.projectName);
			expect(html).toContain("&quot;");
		});

		it("includes information about GrantFlow platform", async () => {
			const html = await render(<InviteCollaboratorsEmailTemplate {...mockProjectProps} />);

			expect(html).toContain(
				"GrantFlow is designed to help research teams streamline and manage the grant application process",
			);
		});

		it("includes collaborator benefits description", async () => {
			const html = await render(<InviteCollaboratorsEmailTemplate {...mockProjectProps} />);

			expect(html).toContain("As a collaborator, you will gain access to the project workspace");
			expect(html).toContain("contribute to grant applications and related documentation");
		});

		it("includes preview text with project name", async () => {
			const html = await render(<InviteCollaboratorsEmailTemplate {...mockProjectProps} />);

			expect(html).toContain("You&#x27;ve been invited to collaborate on Climate Change Research Grant");
		});

		it("properly escapes special characters in project name", async () => {
			const propsWithSpecialChars = {
				...mockProjectProps,
				projectName: "Research & Development 'Test' Project",
			};
			const html = await render(<InviteCollaboratorsEmailTemplate {...propsWithSpecialChars} />);

			expect(html).toContain("Research &amp; Development &#x27;Test&#x27; Project");
		});
	});

	describe("Organization invitation context", () => {
		it("renders email with organization name", async () => {
			const html = await render(<InviteCollaboratorsEmailTemplate {...mockOrgProps} />);

			expect(html).toContain("You&#x27;ve been invited to join Test Organization");
			expect(html).toContain("Dr. Jane Smith");
			expect(html).toContain("Test Organization");
		});

		it("includes member benefits description", async () => {
			const html = await render(<InviteCollaboratorsEmailTemplate {...mockOrgProps} />);

			expect(html).toContain("As a member, you will gain access to the organization&#x27;s projects");
			expect(html).toContain("contribute to grant applications and related documentation");
		});

		it("includes correct invitation context for organization", async () => {
			const html = await render(<InviteCollaboratorsEmailTemplate {...mockOrgProps} />);

			expect(html).toContain("join the");
			expect(html).toContain("Test Organization");
			expect(html).toContain("organization within the GrantFlow platform");
		});
	});

	describe("Fallback invitation context", () => {
		it("uses fallback text when no organization or project name provided", async () => {
			const fallbackProps = {
				acceptInvitationUrl: "https://grantflow.ai/accept-invitation?token=test-token",
				inviterName: "Dr. Jane Smith",
			};
			const html = await render(<InviteCollaboratorsEmailTemplate {...fallbackProps} />);

			expect(html).toContain("join an organization created by Dr. Jane Smith");
			expect(html).toContain("join an organization within the GrantFlow platform");
		});
	});

	describe("Common elements", () => {
		it("includes sign-up process information", async () => {
			const html = await render(<InviteCollaboratorsEmailTemplate {...mockProjectProps} />);

			expect(html).toContain("If you do not yet have a GrantFlow account");
			expect(html).toContain("guided through a brief sign-up process");
		});

		it("includes proper footer with preferences link", async () => {
			const html = await render(<InviteCollaboratorsEmailTemplate {...mockProjectProps} />);

			expect(html).toContain("Want to change how you receive these emails?");
			expect(html).toContain("update your preferences");
		});

		it("includes GrantFlow branding", async () => {
			const html = await render(<InviteCollaboratorsEmailTemplate {...mockProjectProps} />);

			expect(html).toContain("GrantFlow");
			expect(html).toContain("By Vsphera");
		});

		it("includes warm sign-off", async () => {
			const html = await render(<InviteCollaboratorsEmailTemplate {...mockProjectProps} />);

			expect(html).toContain("We look forward to your participation");
			expect(html).toContain("Warm regards");
			expect(html).toContain("Vsphera Team");
		});

		it("generates valid HTML structure", async () => {
			const html = await render(<InviteCollaboratorsEmailTemplate {...mockProjectProps} />);

			expect(html).toContain("<!DOCTYPE html");
			expect(html).toContain("<html");
			expect(html).toContain("<body");
			expect(html).toContain("</body>");
			expect(html).toContain("</html>");
		});
	});
});
