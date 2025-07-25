import type { Page } from "@playwright/test";

export async function dismissWelcomeModal(page: Page) {
	try {
		const modalDialog = page.locator('div[role="dialog"]').filter({ hasText: "Welcome to GrantFlow!" });
		const laterButton = page.getByRole("button", { name: "Later" });

		const isModalVisible = await modalDialog.isVisible({ timeout: 3000 }).catch(() => false);

		if (isModalVisible) {
			await laterButton.click({ force: true });

			await modalDialog.waitFor({ state: "detached", timeout: 5000 });

			await page.waitForTimeout(1000);
		}

		const anyDialog = page.locator('div[role="dialog"]');
		if ((await anyDialog.count()) > 0) {
			const closeButton = page.getByRole("button", { name: /close|later|cancel/i });
			if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
				await closeButton.click({ force: true });
				await page.waitForTimeout(500);
			}
		}
	} catch {
		// ~keep: If modal is not found or already dismissed, continue silently
	}
}
