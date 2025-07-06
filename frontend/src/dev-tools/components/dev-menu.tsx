"use client";

import { Bug, Settings, Shuffle, Wifi, WifiOff, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RouteSpecificTools, StoreInspector, ToastTestButton, ToastTestPanel } from "@/dev-tools";
import { getMockAPIClient, isMockAPIEnabled } from "@/dev-tools/mock-api/client";
import { clearAllMockStores } from "@/dev-tools/mock-api/handlers";
import { getScenario, scenarios } from "@/dev-tools/mock-api/scenarios";
import { useApplicationStore } from "@/stores/application-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useProjectStore } from "@/stores/project-store";
import { useUserStore } from "@/stores/user-store";
import { useWizardStore } from "@/stores/wizard-store";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger";

interface ApiConfigPanelProps {
	errorRate: number;
	mockEnabled: boolean;
	networkDelay: number;
	setErrorRate: (rate: number) => void;
	setMockEnabled: (enabled: boolean) => void;
	setNetworkDelay: (delay: number) => void;
	setWsConnected: (connected: boolean) => void;
	wsConnected: boolean;
}

interface ScenariosPanelProps {
	loadScenario: (scenarioName: string) => void;
	selectedScenario: string;
}

export function DevMenu() {
	const [isOpen, setIsOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<"api" | "routes" | "scenarios" | "stores" | "toast">("api");
	const [mockEnabled, setMockEnabled] = useState(isMockAPIEnabled());
	const [selectedScenario, setSelectedScenario] = useState(() =>
		isMockAPIEnabled() ? getMockAPIClient().getCurrentScenarioName() : "minimal",
	);
	const [networkDelay, setNetworkDelay] = useState(300);
	const [errorRate, setErrorRate] = useState(0);
	const [wsConnected, setWsConnected] = useState(false);
	const [toastTestingEnabled, setToastTestingEnabled] = useState(false);
	const pathname = usePathname();
	const router = useRouter();

	// Keyboard shortcut to toggle menu
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "d") {
				e.preventDefault();
				setIsOpen(!isOpen);
			}
		};

		globalThis.addEventListener("keydown", handleKeyDown);
		return () => {
			globalThis.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen]);

	const clearAllStores = () => {
		useApplicationStore.setState({ application: null });
		useNotificationStore.getState().clearAllNotifications();
		useProjectStore.setState({ projects: [] });
		useWizardStore.getState().reset();
	};

	const loadScenario = (scenarioName: string) => {
		const scenario = getScenario(scenarioName);
		if (!scenario) {
			log.error("Scenario not found", { scenarioName });
			return;
		}

		log.info("Loading scenario", { scenarioName });

		if (isMockAPIEnabled()) {
			getMockAPIClient().setScenario(scenarioName);
			// Clear the global mock stores so they use the new scenario data
			clearAllMockStores();
		}

		clearAllStores();
		setSelectedScenario(scenarioName);

		log.info("Clearing user session and redirecting to /projects");
		useUserStore.setState({ user: null });

		setIsOpen(false);
		router.push("/projects");

		log.info("Scenario loaded successfully", { scenarioName });
	};

	// Hide in production
	if (process.env.NODE_ENV === "production") {
		return null;
	}

	const renderTabContent = () => {
		switch (activeTab) {
			case "api": {
				return (
					<ApiConfigPanel
						errorRate={errorRate}
						mockEnabled={mockEnabled}
						networkDelay={networkDelay}
						setErrorRate={setErrorRate}
						setMockEnabled={setMockEnabled}
						setNetworkDelay={setNetworkDelay}
						setWsConnected={setWsConnected}
						wsConnected={wsConnected}
					/>
				);
			}
			case "routes": {
				return <RouteSpecificTools pathname={pathname} />;
			}
			case "scenarios": {
				return <ScenariosPanel loadScenario={loadScenario} selectedScenario={selectedScenario} />;
			}
			case "stores": {
				return <StoreInspector />;
			}
			case "toast": {
				return <ToastTestPanel enabled={toastTestingEnabled} onToggle={setToastTestingEnabled} />;
			}
		}
	};

	return (
		<>
			{/* Floating Action Button */}
			<button
				className={`fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg transition-all hover:bg-purple-700 ${
					mockEnabled ? "ring-2 ring-purple-400 ring-offset-2" : ""
				}`}
				onClick={() => {
					setIsOpen(true);
				}}
				title="Open Dev Menu (Cmd+Shift+D)"
				type="button"
			>
				<Settings className="h-6 w-6" />
				{mockEnabled && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500" />}
			</button>

			{/* Toast Test Button */}
			<ToastTestButton enabled={toastTestingEnabled} />

			{/* Dev Menu Panel */}
			{isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="relative h-[80vh] w-[90vw] max-w-4xl overflow-hidden rounded-lg bg-gray-900 text-white shadow-2xl">
						{/* Header */}
						<div className="flex items-center justify-between border-b border-gray-700 p-4">
							<div className="flex items-center gap-3">
								<Bug className="h-6 w-6 text-purple-400" />
								<h2 className="text-xl font-bold">Developer Tools</h2>
								{mockEnabled && (
									<span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400">
										Mock API Active
									</span>
								)}
							</div>
							<button
								className="rounded p-1 hover:bg-gray-800"
								onClick={() => {
									setIsOpen(false);
								}}
								type="button"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						{/* Tabs */}
						<div className="flex border-b border-gray-700">
							{(["api", "stores", "routes", "scenarios", "toast"] as const).map((tab) => (
								<button
									className={`px-6 py-3 capitalize transition-colors ${
										activeTab === tab
											? "border-b-2 border-purple-400 text-purple-400"
											: "text-gray-400 hover:text-white"
									}`}
									key={tab}
									onClick={() => {
										setActiveTab(tab);
									}}
									type="button"
								>
									{tab}
								</button>
							))}
						</div>

						{/* Content */}
						<div className="h-[calc(100%-8rem)] overflow-y-auto p-6">{renderTabContent()}</div>

						{/* Footer */}
						<div className="absolute bottom-0 left-0 right-0 border-t border-gray-700 bg-gray-800 p-3">
							<div className="flex items-center justify-between text-sm text-gray-400">
								<span>Current Route: {pathname}</span>
								<span>Environment: {getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL}</span>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

function ApiConfigPanel({
	errorRate,
	mockEnabled,
	networkDelay,
	setErrorRate,
	setMockEnabled,
	setNetworkDelay,
	setWsConnected,
	wsConnected,
}: ApiConfigPanelProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="mb-4 text-lg font-semibold">API Configuration</h3>
				<div className="space-y-4">
					<div className="flex items-center justify-between rounded-lg bg-gray-800 p-4">
						<div>
							<h4 className="font-medium">Mock API Mode</h4>
							<p className="text-sm text-gray-400">Use local mock data instead of real backend</p>
						</div>
						<button
							className={`relative h-6 w-11 rounded-full transition-colors ${
								mockEnabled ? "bg-purple-600" : "bg-gray-600"
							}`}
							onClick={() => {
								setMockEnabled(!mockEnabled);
								// Mock API toggle logged via structured logger
							}}
							type="button"
						>
							<span
								className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
									mockEnabled ? "translate-x-5" : "translate-x-0.5"
								}`}
							/>
						</button>
					</div>

					{mockEnabled && (
						<>
							<div className="rounded-lg bg-gray-800 p-4">
								<h4 className="mb-2 font-medium">Network Delay (ms)</h4>
								<input
									className="w-full"
									max="3000"
									min="0"
									onChange={(e) => {
										setNetworkDelay(Number(e.target.value));
									}}
									type="range"
									value={networkDelay}
								/>
								<span className="text-sm text-gray-400">{networkDelay}ms</span>
							</div>

							<div className="rounded-lg bg-gray-800 p-4">
								<h4 className="mb-2 font-medium">Error Rate (%)</h4>
								<input
									className="w-full"
									max="100"
									min="0"
									onChange={(e) => {
										setErrorRate(Number(e.target.value));
									}}
									type="range"
									value={errorRate}
								/>
								<span className="text-sm text-gray-400">{errorRate}%</span>
							</div>
						</>
					)}
				</div>
			</div>

			<div>
				<h3 className="mb-4 text-lg font-semibold">WebSocket Status</h3>
				<div className="flex items-center gap-3 rounded-lg bg-gray-800 p-4">
					{wsConnected ? (
						<WifiOff className="h-5 w-5 text-green-400" />
					) : (
						<Wifi className="h-5 w-5 text-red-400" />
					)}
					<span>{wsConnected ? "Connected" : "Disconnected"}</span>
					{mockEnabled && (
						<button
							className="ml-auto rounded bg-purple-600 px-3 py-1 text-sm hover:bg-purple-700"
							onClick={() => {
								setWsConnected(!wsConnected);
							}}
							type="button"
						>
							Toggle Connection
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

function ScenariosPanel({ loadScenario, selectedScenario }: ScenariosPanelProps) {
	return (
		<div className="space-y-6">
			<h3 className="text-lg font-semibold">Data Scenarios</h3>
			<div className="grid gap-4 md:grid-cols-2">
				{scenarios.map((scenario) => (
					<button
						className={`rounded-lg p-4 text-left transition-colors ${
							selectedScenario === scenario.name ? "bg-purple-600" : "bg-gray-800 hover:bg-gray-700"
						}`}
						key={scenario.name}
						onClick={() => {
							loadScenario(scenario.name);
						}}
						type="button"
					>
						<div className="mb-1 flex items-center justify-between">
							<h4 className="font-medium">{scenario.name}</h4>
							{selectedScenario === scenario.name && <Shuffle className="h-4 w-4" />}
						</div>
						<p className="text-sm text-gray-300">{scenario.description}</p>
					</button>
				))}
			</div>
		</div>
	);
}
