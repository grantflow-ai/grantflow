import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Img,
	Link,
	Preview,
	Section,
	Text,
} from "@react-email/components";

interface WelcomeEmailTemplateProps {
	acceptInvitationUrl: string;
	inviterName: string;
	projectName: string;
}

export function WelcomeEmailTemplate({ acceptInvitationUrl, inviterName, projectName }: WelcomeEmailTemplateProps) {
	return (
		<Html>
			<Head />
			<Preview>You&apos;ve been invited to collaborate on {projectName}</Preview>
			<Body style={main}>
				<Container style={container}>
					<Section style={header}>
						<Img
							alt="GrantFlow Logo"
							height={31}
							src={`${process.env.NEXT_PUBLIC_SITE_URL}/assets/logo-horizontal.svg`}
							style={logo}
							width={100}
						/>
						<div>
							<Text style={logoText}>GrantFlow</Text>
							<Text style={logoSubtext}>By Vsphera</Text>
						</div>
					</Section>

					<Section style={content}>
						<Heading style={heading}>Dear Researcher</Heading>

						<Text style={paragraph}>
							You have been invited by <strong>{inviterName}</strong> to collaborate on the research
							project <strong style={projectNameStyle}>&quot;{projectName}&quot;</strong> within the
							GrantFlow platform.
						</Text>

						<Text style={paragraph}>
							GrantFlow is designed to help research teams streamline and manage the grant application
							process.
						</Text>

						<Text style={paragraph}>
							As a collaborator, you will gain access to the project workspace and will be able to
							contribute to grant applications and related documentation.
						</Text>

						<Text style={paragraph}>To accept the invitation, please click the link below:</Text>

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

						<Text style={paragraph}>Warm regards,</Text>

						<Text style={paragraph}>Vsphera Team</Text>
					</Section>

					<Section style={footer}>
						<Img
							alt="LinkedIn"
							height={27}
							src="https://static.cdnlogo.com/logos/l/78/linkedin-icon.svg"
							style={socialIcon}
							width={32}
						/>
						<Text style={footerText}>
							Want to change how you receive these emails?
							<br />
							You can{" "}
							<Link href="#" style={footerLink}>
								update your preferences
							</Link>
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

const main = {
	backgroundColor: "#f6f6f6",
	fontFamily: "'Cabin', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
	margin: "12px 0 0",
	padding: 0,
};

const container = {
	backgroundColor: "#ffffff",
	border: "1px solid #dddddd",
	margin: "0 auto",
	maxWidth: "592px",
};

const header = {
	padding: "32px 20px 0",
	textAlign: "left" as const,
};

const logo = {
	maxWidth: "150px",
};

const logoText = {
	color: "#211962",
	fontSize: "14px",
	fontWeight: "500",
	margin: 0,
};

const logoSubtext = {
	color: "#211962",
	fontSize: "10px",
	fontWeight: "500",
	margin: 0,
	textAlign: "center" as const,
};

const content = {
	color: "#505050",
	fontSize: "16px",
	lineHeight: "150%",
	padding: "32px 24px",
	textAlign: "left" as const,
};

const heading = {
	color: "#2e2d36",
	fontSize: "24px",
	fontWeight: "600",
	lineHeight: "22px",
	marginBottom: "16px",
};

const paragraph = {
	color: "#2e2d36",
	fontSize: "16px",
	fontWeight: "400",
	lineHeight: "20px",
	marginBottom: "16px",
};

const projectNameStyle = {
	color: "#2e2d36",
	fontWeight: "600",
};

const buttonContainer = {
	margin: "32px 0",
	textAlign: "center" as const,
};

const button = {
	backgroundColor: "#1e13f8",
	border: "0",
	borderRadius: "4px",
	color: "#ffffff",
	display: "inline-block",
	fontFamily: "'Sora', sans-serif",
	fontSize: "14px",
	fontWeight: "400",
	padding: "8px 12px",
	textDecoration: "none",
	width: "167px",
};

const footer = {
	borderTop: "1px solid #E1DFEB",
	padding: "24px 24px 32px",
	textAlign: "center" as const,
};

const socialIcon = {
	display: "block",
	margin: "0 auto",
};

const footerText = {
	color: "#2E2D36",
	fontFamily: "'Cabin', sans-serif",
	fontSize: "14px",
	fontWeight: "400",
	lineHeight: "18px",
};

const footerLink = {
	color: "#2E2D36",
	textDecoration: "underline",
};
