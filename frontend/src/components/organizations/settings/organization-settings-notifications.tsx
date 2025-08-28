"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface NotificationSettings {
	collaborationActivity: boolean;
	deadlineReminders: boolean;
	emailNotifications: boolean;
}

interface OrganizationSettingsNotificationsProps {
	organizationId: string;
}

export function OrganizationSettingsNotifications({
	organizationId: _organizationId,
}: OrganizationSettingsNotificationsProps) {
	const [settings, setSettings] = useState<NotificationSettings>({
		collaborationActivity: true,
		deadlineReminders: true,
		emailNotifications: true,
	});

	const handleToggle = (key: keyof NotificationSettings) => {
		setSettings((prev) => {
			const isEnabled = !prev[key];
			if (isEnabled) {
				toast.success("Notifications enabled successfully");
			} else {
				toast.success("Notifications disabled successfully");
			}
			return { ...prev, [key]: isEnabled };
		});
	};

	return (
		<div className="w-[660px] gap-8 flex flex-col" data-testid="organization-settings-notifications">
			<div className="">
				<h2 className="text-base font-cabin font-semibold text-app-black">General Email Notifications</h2>
			</div>

			<div className="flex flex-col gap-6">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<h3 className="text-base font-sans font-normal text-app-black mb-1">
							Receive important email notifications
						</h3>
						<p className="text-sm font-sans font-normal text-app-gray-500">
							Get notified about deadlines, collaborator activity, and grant updates.
						</p>
					</div>
					<Switch
						checked={settings.emailNotifications}
						data-testid="organization-email-notifications-toggle"
						onCheckedChange={() => {
							handleToggle("emailNotifications");
						}}
					/>
				</div>

				<div className="flex items-start justify-between">
					<div className="flex-1">
						<h3 className="text-base font-sans font-normal text-app-black mb-1">Deadline Reminders</h3>
						<p className="text-sm font-sans font-normal text-app-gray-500">
							Get notified 6 days and 1 day before a grant deadline.
						</p>
					</div>

					<Switch
						checked={settings.deadlineReminders}
						data-testid="organization-deadline-reminders-toggle"
						onCheckedChange={() => {
							handleToggle("deadlineReminders");
						}}
					/>
				</div>

				<div className="flex items-start justify-between">
					<div className="flex-1">
						<h3 className="text-base font-sans font-normal text-app-black mb-1">Collaboration Activity</h3>
						<div className="space-y-1">
							<p className="text-sm font-sans font-normal text-app-gray-500">
								Notify me when someone comments or edits
							</p>
							<p className="text-sm font-sans font-normal text-app-gray-500">
								Stay updated on changes and suggestions from your team.
							</p>
						</div>
					</div>

					<Switch
						checked={settings.collaborationActivity}
						data-testid="organization-collaboration-activity-toggle"
						onCheckedChange={() => {
							handleToggle("collaborationActivity");
						}}
					/>
				</div>
			</div>
		</div>
	);
}
