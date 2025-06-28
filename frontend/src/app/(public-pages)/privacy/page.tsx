import { NavHeader } from "@/components/layout/navigation/nav-header";
import {
	LegalPageContainer,
	TitledLegalSection,
	UntitledLegalSection,
} from "@/components/shared/info-legal-page-components";

const terms = [
	{
		clause: (
			<p>
				Your privacy is important to <strong>GrantFlow</strong> (&quot;GrantFlow,&quot; &quot;we,&quot;
				&quot;us,&quot; or &quot;our&quot;). This Privacy Policy outlines how we collect, use, protect, and
				manage your personal information.
			</p>
		),
	},
	{
		clause: (
			<div>
				<span>We may collect personal information, including your email address, when you:</span>
				<ul>
					<li>· Sign up for early access.</li>
					<li>· Contact us directly.</li>
				</ul>
			</div>
		),
		title: "Information We Collect",
	},
	{
		clause: (
			<div>
				<span>We use the information collected to:</span>
				<ul>
					<li>· Provide updates and information about early access and product features.</li>
					<li>· Improve our website, products, and services.</li>
					<li>· Send occasional emails regarding our services and promotional information.</li>
				</ul>
			</div>
		),
		title: "Use of Your Information",
	},
	{
		clause: (
			<p>
				We securely store your personal data and implement appropriate measures to protect it from unauthorized
				access, disclosure, alteration, or destruction.
			</p>
		),
		title: "Data Security and Storage",
	},
	{
		clause: (
			<p>
				We do not sell, rent, or trade your personal information. We may utilize trusted third-party services
				for analytics or email communications. These third parties are obligated to protect your data and are
				prohibited from using it for any other purposes.
			</p>
		),
		title: "Third-Party Services",
	},
	{
		clause: (
			<p>
				GrantFlow will not train or refine the AI models it uses on your personal data or uploaded content
				without your explicit consent.
			</p>
		),
		title: "No Model Training on User Data",
	},
	{
		clause: (
			<p>
				You have the right to access, update, correct, or delete your personal information at any time. To
				exercise these rights, please contact us at{" "}
				<strong>
					<a className="underline" href="mailto:contact@grantflow.ai">
						contact@grantflow.ai
					</a>
				</strong>
				.
			</p>
		),
		title: "Your Rights",
	},
	{
		clause: (
			<p>
				Our website may use cookies to enhance your user experience. You have control over cookies through your
				browser settings and may disable them if preferred.
			</p>
		),
		title: "Cookies",
	},
	{
		clause: (
			<p>
				<strong>GrantFlow</strong> reserves the right to update or modify this Privacy Policy at any time. Any
				changes will be posted prominently on this page, and we encourage you to review our Privacy Policy
				regularly for updates.
			</p>
		),
		title: "Changes to This Privacy Policy",
	},
	{
		clause: (
			<p>
				For questions or concerns about our Privacy Policy or your personal data, please contact us at{" "}
				<strong>
					<a className="underline" href="mailto:contact@grantflow.ai">
						contact@grantflow.ai
					</a>
				</strong>
			</p>
		),
		title: "Contact Information",
	},
];

export default function PrivacyPolicyPage() {
	return (
		<div className="flex min-h-screen w-full flex-col bg-white">
			<NavHeader />
			<LegalPageContainer title="Privacy Policy">
				{terms.map((term, index) =>
					term.title ? (
						<TitledLegalSection clause={term.clause} key={index} title={term.title} />
					) : (
						<UntitledLegalSection clause={term.clause} key={index} />
					),
				)}
			</LegalPageContainer>
		</div>
	);
}
