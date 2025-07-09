import { expect, test } from "./test-setup";

test.describe("Landing Page", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to landing page
		await page.goto("/");
	});

	test("should display hero banner", async ({ page }) => {
		// Check hero banner is visible
		await expect(page.locator('[data-testid="hero-banner"]')).toBeVisible();

		// Check main heading exists
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

		// Check primary CTA button exists
		await expect(page.getByRole("button", { name: /secure priority access/i })).toBeVisible();
	});

	test("should display benefits section", async ({ page }) => {
		// Check benefits section is visible
		await expect(page.locator('[data-testid="benefits-section"]')).toBeVisible();

		// Check section heading
		await expect(page.getByRole("heading", { name: /simplify grant applications/i })).toBeVisible();
	});

	test("should display early access section", async ({ page }) => {
		// Check early access section is visible
		await expect(page.locator('[data-testid="early-access-section"]')).toBeVisible();

		// Check for waitlist form
		await expect(page.locator('[data-testid="waitlist-form"]')).toBeVisible();
	});

	test("should display payment plans section", async ({ page }) => {
		// Check payment plans section is visible
		await expect(page.locator('[data-testid="payment-plans"]')).toBeVisible();

		// Check for pricing tabs
		await expect(page.locator('[data-testid="payment-tabs"]')).toBeVisible();
		await expect(page.locator('[data-testid="monthly-tab"]')).toBeVisible();
		await expect(page.locator('[data-testid="yearly-tab"]')).toBeVisible();
	});

	test("should display core features section", async ({ page }) => {
		// Check core features section is visible
		await expect(page.locator('[data-testid="core-features-section"]')).toBeVisible();

		// Check for feature containers
		await expect(page.locator('[data-testid="core-features-grid-container"]')).toBeVisible();
	});

	test("should display testimonials section", async ({ page }) => {
		// Check testimonials section is visible
		await expect(page.locator('[data-testid="testimonials-section"]')).toBeVisible();

		// Check for testimonial cards
		const testimonialCards = page.locator('[data-testid="mock-motion-article"]');
		await expect(testimonialCards.first()).toBeVisible();
	});

	test("should display CTA section", async ({ page }) => {
		// Check CTA section is visible
		await expect(page.locator('[data-testid="cta-section"]')).toBeVisible();

		// Check CTA heading
		await expect(page.getByText("Ready to Transform Your Grant Writing Process?")).toBeVisible();

		// Check contact button
		await expect(page.getByRole("link", { name: /contact us/i })).toBeVisible();

		// Check priority access button
		await expect(page.getByRole("button", { name: /secure priority access/i })).toBeVisible();
	});

	test("should handle waitlist form submission", async ({ page }) => {
		// Find the waitlist form
		const waitlistForm = page.locator('[data-testid="waitlist-form"]');
		await expect(waitlistForm).toBeVisible();

		// Fill in email
		const emailInput = waitlistForm.locator('input[type="email"]');
		await emailInput.fill("test@example.com");

		// Fill in name
		const nameInput = waitlistForm.locator('input[type="text"]');
		await nameInput.fill("Test User");

		// Wait for form to be valid
		const submitButton = waitlistForm.locator('button[type="submit"]');
		await expect(submitButton).toBeEnabled();

		// Submit form
		await submitButton.click();

		// Check for success message in the form
		await expect(waitlistForm.getByText(/thank you/i)).toBeVisible();
	});

	test("should navigate to login page", async ({ page }) => {
		// Look for login link/button in nav header
		const loginLink = page.getByRole("link", { name: /login/i });
		if (await loginLink.isVisible()) {
			// Click login link
			await loginLink.click();

			// Should navigate to login page
			await expect(page).toHaveURL(/\/login/);
		} else {
			// Skip if login link is not visible (might be hidden on mobile)
			test.skip();
		}
	});

	test("should handle scroll to sections", async ({ page }) => {
		// Check if scroll button exists
		const scrollButton = page.locator('[data-testid="scroll-button"]');
		if (await scrollButton.isVisible()) {
			await scrollButton.click();

			// Should scroll to target section
			await expect(page.locator('[data-testid="waitlist-form"]')).toBeInViewport();
		}
	});

	test("should be responsive", async ({ page }) => {
		// Test mobile viewport
		await page.setViewportSize({ height: 667, width: 375 });

		// Check hero banner is still visible
		await expect(page.locator('[data-testid="hero-banner"]')).toBeVisible();

		// Check navigation menu works on mobile
		const mobileMenu = page.locator('[data-testid="mobile-menu-trigger"]');
		if (await mobileMenu.isVisible()) {
			await mobileMenu.click();
			await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
		}
	});

	test("should have working contact link", async ({ page }) => {
		// Find contact link
		const contactLink = page.getByRole("link", { name: /contact us/i });
		await expect(contactLink).toBeVisible();

		// Check href attribute
		await expect(contactLink).toHaveAttribute("href", "mailto:contact@grantflow.ai");
	});

	test("should display all required sections", async ({ page }) => {
		// Check all major sections are present
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
