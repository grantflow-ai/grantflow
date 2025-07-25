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

interface EmailVerificationTemplateProps {
	verificationUrl: string;
}

export function EmailVerificationTemplate({ verificationUrl }: EmailVerificationTemplateProps) {
	return (
		<Html>
			<Head />
			<Preview>Verify your email to complete your GrantFlow registration</Preview>
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
							Thanks for signing up! To complete your registration, please verify your email address by
							clicking the button below:
						</Text>

						<Section style={buttonContainer}>
							<Button href={verificationUrl} style={button}>
								<span style={buttonIcon}>✓</span>
								Verify My Email
							</Button>
						</Section>

						<Text style={paragraph}>
							If the button doesn&apos;t work, you can copy and paste the following link into your
							browser:{" "}
							<Link href={verificationUrl} style={link}>
								{verificationUrl}
							</Link>
						</Text>

						<Text style={paragraph}>
							This link will expire in 24 hours for security reasons.
							<br />
							If you didn&apos;t create an account, you can safely ignore this email.
						</Text>

						<Text style={paragraph}>Looking forward to helping you simplify your grant applications,</Text>

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

const buttonContainer = {
	margin: "32px 0",
	textAlign: "center" as const,
};

const button = {
	backgroundColor: "#1e13f8",
	border: "0",
	borderRadius: "4px",
	color: "#ffffff",
	display: "inline-flex",
	fontFamily: "'Sora', sans-serif",
	fontSize: "14px",
	fontWeight: "400",
	gap: "8px",
	padding: "8px 12px",
	textDecoration: "none",
};

const buttonIcon = {
	fontSize: "16px",
};

const link = {
	color: "#1e13f8",
	textDecoration: "underline",
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
