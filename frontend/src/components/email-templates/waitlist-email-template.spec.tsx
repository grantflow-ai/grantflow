import { mockEnv } from "::testing/global-mocks";
import {
	getWaitlistEmailTemplateHtml,
	waitlistEmailTemplateText,
} from "@/components/email-templates/waitlist-email-template";
import { getEnv } from "@/utils/env";

vi.mock("@/utils/env", () => ({
	getEnv: () => mockEnv,
}));

describe("Email Template Tests", () => {
	const testUsername = "John Doe";

	it("should correctly include logo URL in the HTML template", () => {
		const expectedLogoUrl = `${getEnv().NEXT_PUBLIC_SITE_URL}/logo.png`;
		const htmlTemplate = getWaitlistEmailTemplateHtml(testUsername);
		expect(htmlTemplate).toContain(`src="${expectedLogoUrl}"`);
	});

	it("should correctly include site URL in the HTML template", () => {
		const htmlTemplate = getWaitlistEmailTemplateHtml(testUsername);
		expect(htmlTemplate).toContain(`href="${getEnv().NEXT_PUBLIC_SITE_URL}"`);
	});

	it("should return HTML string with proper formatting", () => {
		const htmlTemplate = getWaitlistEmailTemplateHtml(testUsername);

		expect(htmlTemplate).toContain("<!DOCTYPE html>");
		expect(htmlTemplate).toContain("<html>");
		expect(htmlTemplate).toContain("</html>");
		expect(htmlTemplate).toContain("<head>");
		expect(htmlTemplate).toContain("</head>");
		expect(htmlTemplate).toContain('<meta charset="utf-8">');
		expect(htmlTemplate).toContain('<meta name="viewport"');
		expect(htmlTemplate).toContain("<style>");
		expect(htmlTemplate).toContain("</style>");
		expect(htmlTemplate).toContain("<body");
		expect(htmlTemplate).toContain("</body>");
		expect(typeof htmlTemplate).toBe("string");
	});

	it("should correctly incorporate username in HTML template", () => {
		const htmlTemplate = getWaitlistEmailTemplateHtml(testUsername);
		expect(htmlTemplate).toContain(`Dear ${testUsername},`);
	});

	it("should return plain text string with proper formatting", () => {
		const textTemplate = waitlistEmailTemplateText(testUsername);
		expect(textTemplate.split("\n").length).toBeGreaterThan(1);
		expect(typeof textTemplate).toBe("string");
	});

	it("should correctly incorporate username in text template", () => {
		const textTemplate = waitlistEmailTemplateText(testUsername);
		expect(textTemplate).toContain(`Dear ${testUsername},`);
	});

	it("should include essential email compatibility elements", () => {
		const htmlTemplate = getWaitlistEmailTemplateHtml(testUsername);
		expect(htmlTemplate).toContain("<!--[if mso]>");
		expect(htmlTemplate).toContain("<![endif]-->");
		expect(htmlTemplate).toContain('<table role="presentation"');
		expect(htmlTemplate).toContain("max-width:");
		expect(htmlTemplate).toContain('width="100%"');
	});

	it("should handle empty username gracefully in HTML template", () => {
		const htmlTemplate = getWaitlistEmailTemplateHtml("");

		expect(htmlTemplate).toContain("Dear Researcher,");
		expect(htmlTemplate).toContain("<!DOCTYPE html>");
		expect(htmlTemplate).toContain("<body");
		expect(htmlTemplate).toContain("</body>");
	});

	it("should handle usernames with special characters in HTML template", () => {
		const specialUsername = '<script>alert("XSS")</script>';
		const htmlTemplate = getWaitlistEmailTemplateHtml(specialUsername);

		expect(htmlTemplate).toContain(`Dear ${specialUsername},`);
	});

	it("should handle very long usernames", () => {
		const longUsername = "A".repeat(100);
		const htmlTemplate = getWaitlistEmailTemplateHtml(longUsername);
		const textTemplate = waitlistEmailTemplateText(longUsername);

		expect(htmlTemplate).toContain(`Dear ${longUsername},`);
		expect(textTemplate).toContain(`Dear ${longUsername},`);
	});

	it('should replace empty username with "Researcher" in HTML template', () => {
		const htmlTemplate = getWaitlistEmailTemplateHtml("");
		expect(htmlTemplate).toContain("Dear Researcher,");
	});

	it('should replace null username with "Researcher" in HTML template', () => {
		const htmlTemplate = getWaitlistEmailTemplateHtml(null);
		expect(htmlTemplate).toContain("Dear Researcher,");
	});

	it('should replace empty username with "Researcher" in text template', () => {
		const textTemplate = waitlistEmailTemplateText("");
		expect(textTemplate).toContain("Dear Researcher,");
	});

	it('should replace null username with "Researcher" in text template', () => {
		const textTemplate = waitlistEmailTemplateText(null);
		expect(textTemplate).toContain("Dear Researcher,");
	});
});