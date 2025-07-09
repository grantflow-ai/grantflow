import type { Page } from "@playwright/test";

export async function dismissWelcomeModal(page: Page) {
	try {
		// Check for the modal dialog element
		const modalDialog = page.locator('div[role="dialog"]').filter({ hasText: "Welcome to GrantFlow!" });
		const laterButton = page.getByRole("button", { name: "Later" });

		// Wait a bit to see if modal appears
		const isModalVisible = await modalDialog.isVisible({ timeout: 3000 }).catch(() => false);

		if (isModalVisible) {
			// Force click the Later button even if something is covering it
			await laterButton.click({ force: true });

			// Wait for modal to be removed from DOM
			await modalDialog.waitFor({ state: "detached", timeout: 5000 });

			// Add a delay to ensure animations complete
			await page.waitForTimeout(1000);
		}

		// Double-check no dialog is blocking
		const anyDialog = page.locator('div[role="dialog"]');
		if ((await anyDialog.count()) > 0) {
			// If there's still a dialog, try to close it
			const closeButton = page.getByRole("button", { name: /close|later|cancel/i });
			if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
				await closeButton.click({ force: true });
				await page.waitForTimeout(500);
			}
		}
	} catch {
		// If modal is not found or already dismissed, continue silently
	}
}
