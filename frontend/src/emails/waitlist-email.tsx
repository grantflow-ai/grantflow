import { Body, Container, Head, Html, Img, Preview, Section, Text } from "@react-email/components";

interface WaitlistEmailProps {
	logoUrl?: string;
	name?: string;
}

export const WaitlistEmail = ({ logoUrl = "https://grantflow.ai/assets/logo-small.png", name }: WaitlistEmailProps) => {
	const userName = name?.trim() ?? "Researcher";

	return (
		<Html>
			<Head />
			<Preview>Welcome to the GrantFlow.ai Waitlist</Preview>
			<Body style={main}>
				<Container style={container}>
					<Section style={content}>
						<Text style={salutation}>Dear {userName},</Text>

						<Text style={paragraph}>
							Thank you for joining the waitlist for GrantFlow.ai. Your interest in our platform is
							greatly appreciated.
						</Text>

						<Text style={paragraph}>
							GrantFlow.ai is designed to streamline the research funding process. As a waitlist member,
							you will receive:
						</Text>

						<Section style={listContainer}>
							<Text style={listItem}>• Early access to the platform</Text>
							<Text style={listItem}>• Product updates and development insights</Text>
							<Text style={listItem}>• Priority notifications about our launch and special offers</Text>
						</Section>

						<Text style={paragraph}>
							We look forward to keeping you informed as we move closer to release. Should you have any
							questions or feedback in the meantime, please don&apos;t hesitate to reply to this message.
						</Text>

						<Text style={signature}>
							Warm regards,
							<br />
							GrantFlow.ai team
						</Text>

						<Section style={footer}>
							<Img alt="GrantFlow.ai Logo" height="40" src={logoUrl} style={logo} width="120" />
						</Section>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

WaitlistEmail.PreviewProps = {
	name: "John Researcher",
} as WaitlistEmailProps;

export default WaitlistEmail;

// Styles
const main = {
	backgroundColor: "#F6F9FC",
	color: "#232D36",
	fontFamily: "'Source Sans 3', Arial, Helvetica, sans-serif",
	lineHeight: "1.25",
};

const container = {
	margin: "0 auto",
	maxWidth: "600px",
	padding: "40px 20px",
};

const content = {
	backgroundColor: "white",
	borderRadius: "8px",
	boxShadow: "0 2px 5px rgba(0, 0, 0, 0.05)",
	padding: "30px",
};

const salutation = {
	fontWeight: "600",
	marginBottom: "15px",
	marginTop: "0",
};

const paragraph = {
	marginBottom: "20px",
	marginTop: "0",
};

const listContainer = {
	marginBottom: "20px",
	paddingLeft: "10px",
};

const listItem = {
	marginBottom: "5px",
	marginTop: "0",
};

const signature = {
	borderBottom: "1px solid rgba(33, 25, 104, 0.5)",
	fontWeight: "600",
	marginBottom: "40px",
	marginTop: "0",
	paddingBottom: "20px",
};

const footer = {
	borderTop: "1px solid rgba(238, 238, 238, 0.5)",
	paddingTop: "20px",
	textAlign: "left" as const,
};

const logo = {
	border: "0",
	display: "block",
};
