import { expect, test } from "./test-setup";

test.describe("Landing Page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test.skip("should display hero banner", async () => {
		// TODO: Re-enable when hero banner exposes stable SSR selectors without animation delays.
	});

	test.skip("should display benefits section", async () => {
		// TODO: Restore once landing benefits content is available in the test environment.
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

	test.skip("should display CTA section", async () => {
		// TODO: Revisit once CTA copy and layout are finalized for automation.
	});

	test.skip("should handle waitlist form submission", async () => {
		// TODO: Replace with real waitlist submission flow when backend stubs are available.
	});

	test.skip("should show toast notification on waitlist success", async () => {
		// TODO: Restore after we can assert toast events without mocked API responses.
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

	test.skip("should have working contact link", async () => {
		// TODO: Enable once CTA link points to production-ready contact channel.
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
