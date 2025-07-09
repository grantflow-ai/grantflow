import type { Page } from "@playwright/test";

export async function dismissWelcomeModal(page: Page) {
	try {
		// Check if welcome modal is visible
		const welcomeModal = page.getByText("Welcome to GrantFlow!");
		const laterButton = page.getByRole("button", { name: "Later" });

		// Wait a bit to see if modal appears
		const isModalVisible = await welcomeModal.isVisible({ timeout: 2000 }).catch(() => false);

		if (isModalVisible) {
			// Click the Later button to dismiss
			await laterButton.click();

			// Wait for modal to disappear
			await welcomeModal.waitFor({ state: "hidden", timeout: 5000 });

			// Add a small delay to ensure modal animation completes
			await page.waitForTimeout(500);
		}
	} catch {
		// If modal is not found or already dismissed, continue silently
	}
}
