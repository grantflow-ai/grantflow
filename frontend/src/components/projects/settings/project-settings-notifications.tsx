"use client";

import { useState } from "react";

interface NotificationSettings {
	collaborationActivity: boolean;
	deadlineReminders: boolean;
	emailNotifications: boolean;
}

interface ProjectSettingsNotificationsProps {
	projectId: string;
}

interface ToggleSwitchProps {
	checked: boolean;
	"data-testid"?: string;
	onChange: () => void;
}

export function ProjectSettingsNotifications({ projectId: _projectId }: ProjectSettingsNotificationsProps) {
	const [settings, setSettings] = useState<NotificationSettings>({
		collaborationActivity: true,
		deadlineReminders: true,
		emailNotifications: true,
	});

	const handleToggle = (key: keyof NotificationSettings) => {
		setSettings((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	};

	return (
		<div className="w-full" data-testid="project-settings-notifications">
			<div className="mb-8">
				<h2 className="text-[24px] font-medium text-text-primary font-heading mb-2">
					General Email Notifications
				</h2>
			</div>

			<div className="space-y-6">
				{}
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<h3 className="text-[16px] font-normal text-text-primary font-body mb-1">
							Receive important email notifications
						</h3>
						<p className="text-[14px] font-normal text-text-secondary font-body">
							Get notified about deadlines, collaborator activity, and grant updates.
						</p>
					</div>
					<ToggleSwitch
						checked={settings.emailNotifications}
						data-testid="email-notifications-toggle"
						onChange={() => {
							handleToggle("emailNotifications");
						}}
					/>
				</div>

				{}
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<h3 className="text-[16px] font-normal text-text-primary font-body mb-1">Deadline Reminders</h3>
						<p className="text-[14px] font-normal text-text-secondary font-body">
							Get notified 6 days and 1 day before a grant deadline.
						</p>
					</div>
					<ToggleSwitch
						checked={settings.deadlineReminders}
						data-testid="deadline-reminders-toggle"
						onChange={() => {
							handleToggle("deadlineReminders");
						}}
					/>
				</div>

				{}
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<h3 className="text-[16px] font-normal text-text-primary font-body mb-1">
							Collaboration Activity
						</h3>
						<div className="space-y-1">
							<p className="text-[14px] font-normal text-text-secondary font-body">
								Notify me when someone comments or edits
							</p>
							<p className="text-[14px] font-normal text-text-secondary font-body">
								Stay updated on changes and suggestions from your team.
							</p>
						</div>
					</div>
					<ToggleSwitch
						checked={settings.collaborationActivity}
						data-testid="collaboration-activity-toggle"
						onChange={() => {
							handleToggle("collaborationActivity");
						}}
					/>
				</div>
			</div>
		</div>
	);
}

function ToggleSwitch({ checked, "data-testid": dataTestId, onChange }: ToggleSwitchProps) {
	return (
		<button
			aria-checked={checked}
			className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
				checked ? "bg-primary" : "bg-app-gray-300"
			}`}
			data-testid={dataTestId}
			onClick={onChange}
			role="switch"
			type="button"
		>
			<span
				className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
					checked ? "translate-x-6" : "translate-x-1"
				}`}
			/>
		</button>
	);
}
