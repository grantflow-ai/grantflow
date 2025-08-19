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

interface PersonalAccountDeletionTemplateProps {
	contactUsUrl: string;
}

export default function PersonalAccountDeletionTemplate({
	contactUsUrl,
}: PersonalAccountDeletionTemplateProps) {
	return (
		<Html>
			<Head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
				<link
					href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap"
					rel="stylesheet"
				/>
			</Head>
			<Preview>Your GrantFlow Account Is Scheduled for Deletion</Preview>
			<Body style={main}>
				<Container style={container}>
					<Section style={header}>
						<div style={headerContent}>
							<Img
								alt="GrantFlow Logo"
								height={59}
								src="https://staging.grantflow.ai/assets/logo-horizontal.svg"
								style={logo}
								width={58}
							/>
							<Img
								alt="GrantFlow Logo Text"
								height={31}
								src="https://staging.grantflow.ai/assets/grantflow.svg"
								style={logo}
								width={79}
							/>

							<Text style={logoSubtext}>By Vsphera</Text>
						</div>
					</Section>

					<Section style={content}>
						<Heading style={heading}>Dear Researcher</Heading>

						<Text style={paragraph}>
							We confirm that your GrantFlow account has been scheduled for deletion, as requested. All associated data including research projects, applications, and personal information will be permanently removed from our system in 10 days.
						</Text>

						<Text style={paragraph}>
							If you change your mind or would like to recover your account before deletion is finalized, simply reply to this email or contact our support team at 
						</Text>

						<Section style={buttonContainer}>
							<Button href={contactUsUrl} style={button}>
								<span style={{ marginRight: "6px" }}>Contact Us</span>

								
<svg
									xmlns="http://www.w3.org/2000/svg"
									width="13"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<title>Right Arrow Icon</title>
									<path d="m9 18 6-6-6-6" />
								</svg>
							</Button>
						</Section>

						<Text style={paragraph}>
							We're sorry to see you go. If you have any feedback or suggestions about how we could improve, we’d love to hear from you.
						</Text>

						<Text style={paragraph}>Thank you for being part of GrantFlow.</Text>

						<Text style={paragraph}>
							Warm regards,
							<br />
							Vsphera Team
						</Text>
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
	fontFamily: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
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
	width: "100%",
};

const headerContent = {
	textAlign: "center" as const,
	width: "79px",
};

const logo = {
	display: "block",
	margin: "0 auto",
};

const logoSubtext = {
	color: "#211962",
	fontSize: "10px",
	fontWeight: "500",
	margin: "-8px 0 0 0",
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
	textAlign: "left" as const,
};

const button = {
	backgroundColor: "#1e13f8",
	border: "0",
	borderRadius: "4px",
	color: "#ffffff",
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	fontFamily: "'Sora', sans-serif",
	fontSize: "14px",
	fontWeight: "400",
	padding: "4px 12px",
	textDecoration: "none",
	width: "124px",
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
	fontFamily: "'Source Sans 3', sans-serif",
	fontSize: "14px",
	fontWeight: "400",
	lineHeight: "18px",
};

const footerLink = {
	color: "#2E2D36",
	textDecoration: "underline",
};
