import { getWaitlistEmailTemplateHtml } from "@/components/waitlist-email-template";

export default function EmailPreviewPage() {
	const emailHtml = getWaitlistEmailTemplateHtml("Varun");

	return (
		<div className="p-4">
			<h1 className="mb-4 text-xl font-bold">Email Template Preview</h1>
			<div className="rounded-md border bg-white p-4">
				<iframe className="border-0" height="600px" srcDoc={emailHtml} title="Email Preview" width="100%" />
			</div>
			<div className="mt-4">
				<h2 className="mb-2 text-lg font-semibold">HTML Source</h2>
				<pre className="overflow-x-auto rounded-md bg-gray-100 p-4 text-black">{emailHtml}</pre>
			</div>
		</div>
	);
}
