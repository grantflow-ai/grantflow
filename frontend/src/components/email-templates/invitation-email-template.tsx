import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";

interface InvitationEmailTemplateProps {
	acceptInvitationUrl: string;
	inviterName: string;
	projectName: string;
	role: string;
}

export default function InvitationEmailTemplate({
	acceptInvitationUrl,
	inviterName,
	projectName,
	role,
}: InvitationEmailTemplateProps) {
	return (
		<Html>
			<Head />
			<Preview>You&apos;ve been invited to collaborate on {projectName}</Preview>
			<Body style={main}>
				<Container style={container}>
					<Section style={header}>
						<Heading style={headerTitle}>GrantFlow</Heading>
					</Section>

					<Section style={content}>
						<Heading style={title}>Invitation to Collaborate on a Research Project</Heading>

						<Text style={paragraph}>Dear Researcher,</Text>

						<Text style={paragraph}>
							You have been invited by <strong>{inviterName}</strong> to collaborate on the research
							project <strong style={projectNameStyle}>&ldquo;{projectName}&rdquo;</strong> as a{" "}
							<strong>{role}</strong> within the GrantFlow platform.
						</Text>

						<Text style={paragraph}>
							GrantFlow is designed to help research teams streamline and manage the grant application
							process.
						</Text>

						<Text style={paragraph}>
							As a collaborator, you will gain access to the project workspace and will be able to
							contribute to grant applications and related documentation.
						</Text>

						<Text style={paragraph}>To accept the invitation, please click the button below:</Text>

						<Section style={buttonContainer}>
							<Button href={acceptInvitationUrl} style={button}>
								Accept Invitation
							</Button>
						</Section>

						<Text style={paragraph}>
							If you do not yet have a GrantFlow account, you will be guided through a brief sign-up
							process before accessing the project.
						</Text>

						<Text style={paragraph}>We look forward to your participation.</Text>

						<Text style={paragraph}>
							Sincerely,
							<br />
							The GrantFlow Team
						</Text>
					</Section>

					<Section style={footer}>
						<Text style={footerText}>This invitation was sent by {inviterName} from GrantFlow.</Text>
						<Text style={footerText}>If you received this email by mistake, you can safely ignore it.</Text>
						<Text style={footerText}>&copy; 2025 GrantFlow. All rights reserved.</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

const main = {
	backgroundColor: "#f4f4f4",
	color: "#333",
	fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
	lineHeight: 1.6,
	margin: 0,
	padding: 0,
};

const container = {
	backgroundColor: "#ffffff",
	boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
	margin: "0 auto",
	maxWidth: "600px",
};

const header = {
	backgroundColor: "#1e13f8",
	padding: "30px",
	textAlign: "center" as const,
};

const headerTitle = {
	color: "white",
	fontSize: "32px",
	fontWeight: "bold",
	margin: 0,
};

const content = {
	padding: "40px 30px",
};

const title = {
	color: "#1e13f8",
	fontSize: "24px",
	marginBottom: "20px",
	marginTop: "0px",
};

const paragraph = {
	fontSize: "16px",
	lineHeight: 1.8,
	marginBottom: "20px",
};

const projectNameStyle = {
	color: "#1e13f8",
	fontWeight: "bold",
};

const buttonContainer = {
	margin: "30px 0",
	textAlign: "center" as const,
};

const button = {
	backgroundColor: "#1e13f8",
	borderRadius: "5px",
	color: "#ffffff",
	display: "inline-block",
	fontSize: "16px",
	fontWeight: "bold",
	padding: "12px 30px",
	textDecoration: "none",
};

const footer = {
	backgroundColor: "#f8f9fa",
	padding: "30px",
	textAlign: "center" as const,
};

const footerText = {
	color: "#666",
	fontSize: "14px",
	margin: "5px 0",
};
