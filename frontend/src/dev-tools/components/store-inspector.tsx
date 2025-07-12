"use client";

import { ChevronDown, ChevronRight, RefreshCw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useApplicationStore } from "@/stores/application-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useProjectStore } from "@/stores/project-store";
import { useUserStore } from "@/stores/user-store";
import { useWizardStore } from "@/stores/wizard-store";

export function StoreInspector() {
	const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
	const [selectedStore, setSelectedStore] = useState<string>("application");

	const stores = {
		application: useApplicationStore.getState(),
		notification: useNotificationStore.getState(),
		project: useProjectStore.getState(),
		user: useUserStore.getState(),
		wizard: useWizardStore.getState(),
	};

	const toggleNode = (path: string) => {
		const newExpanded = new Set(expandedNodes);
		if (newExpanded.has(path)) {
			newExpanded.delete(path);
		} else {
			newExpanded.add(path);
		}
		setExpandedNodes(newExpanded);
	};

	const renderPrimitive = (value: unknown): ReactNode => {
		return <span className="text-green-400">{typeof value === "string" ? `"${value}"` : String(value)}</span>;
	};

	const renderObject = (value: object, path: string, depth: number, isArray: boolean): ReactNode => {
		const isExpanded = expandedNodes.has(path);
		const entries = isArray
			? (value as unknown[]).map((v, i) => [i, v])
			: Object.entries(value).filter(([key]) => typeof value[key as keyof typeof value] !== "function");

		if (entries.length === 0) {
			return <span className="text-gray-500">{isArray ? "[]" : "{}"}</span>;
		}

		return (
			<div className={depth > 0 ? "ml-4" : ""}>
				<button
					className="flex items-center gap-1 text-sm hover:text-purple-400"
					onClick={() => {
						toggleNode(path);
					}}
					type="button"
				>
					{isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
					<span className="text-gray-400">
						{isArray ? `Array(${(value as unknown[]).length})` : "Object"}
					</span>
				</button>
				{isExpanded && (
					<div className="ml-4 mt-1 space-y-1">
						{entries.map(([key, val]) => {
							const childPath = `${path}.${key}`;
							return (
								<div className="flex items-start gap-2" key={childPath}>
									<span className="text-purple-400">{String(key)}:</span>
									{renderValue(val, childPath, depth + 1)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		);
	};

	const renderValue = (value: unknown, path: string, depth = 0): ReactNode => {
		if (value === null || typeof value !== "object") {
			return renderPrimitive(value);
		}
		return renderObject(value, path, depth, Array.isArray(value));
	};

	const clearStore = (storeName: string) => {
		switch (storeName) {
			case "application": {
				useApplicationStore.setState({ application: null });
				break;
			}
			case "notification": {
				useNotificationStore.getState().clearAllNotifications();
				break;
			}
			case "project": {
				useProjectStore.setState({ projects: [] });
				break;
			}
			case "wizard": {
				useWizardStore.getState().reset();
				break;
			}
		}

		setExpandedNodes(new Set());
	};

	const refreshStores = () => {
		setExpandedNodes(new Set());
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">Zustand Store Inspector</h3>
				<button
					className="flex items-center gap-2 rounded bg-purple-600 px-3 py-1 text-sm hover:bg-purple-700"
					onClick={refreshStores}
					type="button"
				>
					<RefreshCw className="h-4 w-4" />
					Refresh
				</button>
			</div>

			<div className="flex gap-4">
				{}
				<div className="w-48 space-y-2">
					{Object.keys(stores).map((storeName) => (
						<button
							className={`w-full rounded-lg px-4 py-2 text-left transition-colors ${
								selectedStore === storeName
									? "bg-purple-600 text-white"
									: "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
							}`}
							key={storeName}
							onClick={() => {
								setSelectedStore(storeName);
							}}
							type="button"
						>
							{storeName}
						</button>
					))}
				</div>

				{}
				<div className="flex-1 rounded-lg bg-gray-800 p-4">
					<div className="mb-4 flex items-center justify-between">
						<h4 className="font-medium capitalize">{selectedStore} Store</h4>
						<button
							className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs hover:bg-red-700"
							onClick={() => {
								clearStore(selectedStore);
							}}
							title="Clear store"
							type="button"
						>
							<Trash2 className="h-3 w-3" />
							Clear
						</button>
					</div>
					<div className="font-mono text-sm">
						{renderValue(stores[selectedStore as keyof typeof stores], selectedStore)}
					</div>
				</div>
			</div>

			<div className="rounded-lg bg-gray-800 p-4">
				<h4 className="mb-2 font-medium">Quick Actions</h4>
				<div className="flex flex-wrap gap-2">
					<button
						className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-700"
						onClick={() => {
							useUserStore.getState().setUser({
								displayName: "Dev User",
								email: "dev@example.com",
								emailVerified: true,
								photoURL: null,
								uid: "dev-user-123",
							});
						}}
						type="button"
					>
						Set Dev User
					</button>
					<button
						className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-700"
						onClick={() => {
							useProjectStore.setState({
								projects: [
									{
										applications_count: 0,
										description: "Development test project",
										id: "dev-project-1",
										logo_url: null,
										members: [
											{
												display_name: "Dev User",
												email: "dev@example.com",
												firebase_uid: "dev-user-1",
												photo_url: null,
												role: "OWNER" as const,
											},
										],
										name: "Dev Project",
										role: "OWNER" as const,
									},
								],
							});
						}}
						type="button"
					>
						Add Dev Project
					</button>
					<button
						className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-700"
						onClick={() => {
							useNotificationStore.getState().addNotification({
								message: "Test notification from dev tools",
								projectName: "Dev Project",
								title: "Test Notification",
								type: "info",
							});
						}}
						type="button"
					>
						Add Test Notification
					</button>
				</div>
			</div>
		</div>
	);
}
