import { getWaitlistEmailTemplateHtml } from "@/components/waitlist-email-template";

export default function EmailPreviewPage() {
	const emailHtml = getWaitlistEmailTemplateHtml("Varun");

	return (
		<div className="p-4">
			<h1 className="text-xl font-bold mb-4">Email Template Preview</h1>
			<div className="border rounded-md p-4 bg-white">
				<iframe className="border-0" height="600px" srcDoc={emailHtml} title="Email Preview" width="100%" />
			</div>
			<div className="mt-4">
				<h2 className="text-lg font-semibold mb-2">HTML Source</h2>
				<pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-black">{emailHtml}</pre>
			</div>
		</div>
	);
}
