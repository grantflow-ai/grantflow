import { expect, test } from "./test-setup";

test.describe("Landing Page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("should display hero banner", async ({ page }) => {
		await expect(page.locator('[data-testid="hero-banner"]')).toBeVisible();

		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

		await expect(page.getByRole("button", { name: /secure priority access/i })).toBeVisible();
	});

	test("should display benefits section", async ({ page }) => {
		await expect(page.locator('[data-testid="benefits-section"]')).toBeVisible();

		await expect(page.getByRole("heading", { name: /simplify grant applications/i })).toBeVisible();
	});

	test("should display early access section", async ({ page }) => {
		await expect(page.locator('[data-testid="early-access-section"]')).toBeVisible();

		await expect(page.locator('[data-testid="waitlist-form"]')).toBeVisible();
	});

	test("should display payment plans section", async ({ page }) => {
		await expect(page.locator('[data-testid="payment-plans"]')).toBeVisible();

		await expect(page.locator('[data-testid="payment-tabs"]')).toBeVisible();
		await expect(page.locator('[data-testid="monthly-tab"]')).toBeVisible();
		await expect(page.locator('[data-testid="yearly-tab"]')).toBeVisible();
	});

	test("should display core features section", async ({ page }) => {
		await expect(page.locator('[data-testid="core-features-section"]')).toBeVisible();

		await expect(page.locator('[data-testid="core-features-grid-container"]')).toBeVisible();
	});

	test("should display testimonials section", async ({ page }) => {
		await expect(page.locator('[data-testid="testimonials-section"]')).toBeVisible();

		const testimonialCards = page.locator('[data-testid="mock-motion-article"]');
		await expect(testimonialCards.first()).toBeVisible();
	});

	test("should display CTA section", async ({ page }) => {
		await expect(page.locator('[data-testid="cta-section"]')).toBeVisible();

		await expect(page.getByText("Ready to Transform Your Grant Writing Process?")).toBeVisible();

		await expect(page.getByRole("link", { name: /contact us/i })).toBeVisible();

		await expect(page.getByRole("button", { name: /secure priority access/i })).toBeVisible();
	});

	test("should handle waitlist form submission", async ({ page }) => {
		const waitlistForm = page.locator('[data-testid="waitlist-form"]');
		await expect(waitlistForm).toBeVisible();

		const emailInput = waitlistForm.locator('[data-testid="test-form-input-email"]');
		await emailInput.fill("test@example.com");

		const nameInput = waitlistForm.locator('[data-testid="test-form-input-name"]');
		await nameInput.fill("Test User");

		const submitButton = waitlistForm.locator('[data-testid="waitlist-form-submit-button"]');
		await expect(submitButton).toBeEnabled();

		await submitButton.click();

		await expect(waitlistForm.locator('[data-testid="waitlist-form-message"]')).toBeVisible();
		await expect(waitlistForm.locator('[data-testid="waitlist-form-message"]')).toContainText(/thank you/i);

		await expect(page.locator("[data-sonner-toast]")).toBeVisible();
		await expect(page.locator("[data-sonner-toast]")).toContainText(/thank you/i);
	});

	test("should show toast notification on waitlist success", async ({ page }) => {
		const waitlistForm = page.locator('[data-testid="waitlist-form"]');
		await expect(waitlistForm).toBeVisible();

		await waitlistForm.locator('[data-testid="test-form-input-email"]').fill("success@example.com");
		await waitlistForm.locator('[data-testid="test-form-input-name"]').fill("Success User");

		const submitButton = waitlistForm.locator('[data-testid="waitlist-form-submit-button"]');
		await expect(submitButton).toBeEnabled();
		await submitButton.click();

		await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10_000 });
		await expect(page.locator("[data-sonner-toast]")).toContainText(/thank you/i);
	});

	test("should show error message on form validation failure", async ({ page }) => {
		const waitlistForm = page.locator('[data-testid="waitlist-form"]');
		await expect(waitlistForm).toBeVisible();

		await waitlistForm.locator('[data-testid="test-form-input-email"]').fill("invalid-email");
		await waitlistForm.locator('[data-testid="test-form-input-name"]').fill("Test User");

		const submitButton = waitlistForm.locator('[data-testid="waitlist-form-submit-button"]');
		await expect(submitButton).toBeDisabled();

		await waitlistForm.locator('[data-testid="test-form-input-email"]').clear();

		await expect(submitButton).toBeDisabled();

		await waitlistForm.locator('[data-testid="test-form-input-email"]').fill("test@example.com");
		await waitlistForm.locator('[data-testid="test-form-input-name"]').clear();

		await expect(submitButton).toBeDisabled();
	});

	test("should navigate to login page", async ({ page }) => {
		const loginLink = page.getByRole("link", { name: /login/i });
		if (await loginLink.isVisible()) {
			await loginLink.click();

			await expect(page).toHaveURL(/\/login/);
		} else {
			await page.goto("/login");
			await expect(page).toHaveURL(/\/login/);
		}
	});

	test("should handle scroll to sections", async ({ page }) => {
		const scrollButton = page.locator('[data-testid="scroll-button"]');
		if (await scrollButton.isVisible()) {
			await scrollButton.click();

			await expect(page.locator('[data-testid="waitlist-form"]')).toBeInViewport();
		}
	});

	test("should be responsive", async ({ page }) => {
		await page.setViewportSize({ height: 667, width: 375 });

		await expect(page.locator('[data-testid="hero-banner"]')).toBeVisible();

		const mobileMenu = page.locator('[data-testid="mobile-menu-trigger"]');
		if (await mobileMenu.isVisible()) {
			await mobileMenu.click();
			await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
		}
	});

	test("should have working contact link", async ({ page }) => {
		const contactLink = page.getByRole("link", { name: /contact us/i });
		await expect(contactLink).toBeVisible();

		await expect(contactLink).toHaveAttribute("href", "mailto:contact@grantflow.ai");
	});

	test("should display all required sections", async ({ page }) => {
		const sections = [
			"hero-banner",
			"benefits-section",
			"early-access-section",
			"payment-plans",
			"core-features-section",
			"testimonials-section",
			"cta-section",
		];

		for (const section of sections) {
			await expect(page.locator(`[data-testid="${section}"]`)).toBeVisible();
		}
	});
});
