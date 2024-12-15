import { getOtp } from "@/app/actions/api";
import { getEnv } from "@/utils/env";
import { logError } from "@/utils/logging";
import { toast } from "sonner";
import { useCallback, useState } from "react";
import ChatContainer from "@/components/workspaces/detail/applications/detail/chat-container";
import { ApplicationDraft } from "@/types/api-types";
import { Card } from "gen/ui/card";
import { PlateEditor } from "gen/components/editor/plate-editor";

const createWebsocketUrl = async (workspaceId: string, applicationId: string) => {
	try {
		const { otp } = await getOtp();

		return new URL(
			`workspaces/${workspaceId}/applications/${applicationId}/chat-room?otp=${otp}`,
			getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL.replace("http", "ws"),
		).toString();
	} catch (error) {
		logError({ error, identifier: "getOtp" });
		toast.error("Failed to authenticate websocket connection");
	}
};

export function ApplicationWorkspace({ workspaceId, applicationId }: { workspaceId: string; applicationId: string }) {
	const [applicationDraft, setApplicationDraft] = useState<ApplicationDraft | null>(null);

	const getUrl = useCallback(
		async () => (await createWebsocketUrl(workspaceId, applicationId)) ?? "",
		[workspaceId, applicationId],
	);

	return (
		<div className="flex gap-4" data-testid="application-workspace">
			<div className="w-1/2" data-testid="chat-container-wrapper">
				<ChatContainer getUrl={getUrl} onContent={setApplicationDraft} />
			</div>
			<div className="w-1/2" data-testid="code-editor-wrapper">
				<Card className="h-[600px] shadow-md" data-testid="code-editor-container">
					<div className="p-4 border-b">
						<h2 className="text-2xl font-bold">Code Editor</h2>
					</div>
					<div className="p-4" data-testid="code-editor-placeholder">
						{applicationDraft?.content}
						<PlateEditor />
					</div>
				</Card>
			</div>
		</div>
	);
}
