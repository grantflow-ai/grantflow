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

export default function WelcomeEmailTemplate({
	acceptInvitationUrl,
	inviterName,
	projectName,
}: WelcomeEmailTemplateProps) {
	return (
		<Html>
			<Head>
				<meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
				<link
					href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap"
					rel="stylesheet"
				/>
				<style>
					{`
            @media (max-width: 600px) {
              .container {
                width: 100% !important;
                padding: 20px !important;
              }
              .content {
                padding: 20px !important;
              }
              .heading {
                font-size: 22px !important;
              }
              .paragraph {
                font-size: 16px !important;
                line-height: 24px !important;
              }
            }
          `}
				</style>
			</Head>
			<Preview>You&apos;ve been invited to collaborate on {projectName}</Preview>
			<Body style={main}>
				<Container style={container} className="container">
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

					<Section style={content} className="content">
						<Heading style={heading} className="heading">
							Dear Researcher
						</Heading>

						<Text style={paragraph} className="paragraph">
							You have been invited by <strong>{inviterName}</strong> to collaborate on the research
							project <strong style={projectNameStyle}>&quot;{projectName}&quot;</strong> within the
							GrantFlow platform.
							<br />
							GrantFlow is designed to help research teams streamline and manage the grant application
							process.
							<br />
							As a collaborator, you will gain access to the project workspace and will be able to
							contribute to grant applications and related documentation.
						</Text>

						<Text style={paragraph} className="paragraph">
							To accept the invitation, please click the link below:
						</Text>

						<Section style={buttonContainer}>
							<Button href={acceptInvitationUrl} style={button}>
								<span style={{ verticalAlign: "middle" }}>Accept Invitation</span>
								<span style={{ verticalAlign: "middle", display: "inline-block" }}>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="lucide lucide-chevron-right-icon lucide-chevron-right"
									>
										<title>Right Arrow Icon</title>
										<path d="m9 18 6-6-6-6" />
									</svg>
								</span>
							</Button>
						</Section>

						<Text style={paragraph} className="paragraph">
							If you do not yet have a GrantFlow account, you will be guided through a brief sign-up
							process before accessing the project.
						</Text>

						<Text style={paragraph} className="paragraph">
							We look forward to your participation.
						</Text>

						<Text style={paragraph} className="paragraph">
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

const projectNameStyle = {
	color: "#2e2d36",
	fontWeight: "600",
};

const buttonContainer = {
	margin: "32px 0",
	textAlign: "left" as const,
};

const button = {
	alignItems: "center",
	backgroundColor: "#1e13f8",
	border: "0",
	borderRadius: "4px",
	color: "#ffffff",
	display: "inline-flex",
	fontFamily: "'Sora', sans-serif",
	fontSize: "14px",
	fontWeight: "400",
	justifyContent: "center",
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
	fontFamily: "'Source Sans 3', sans-serif",
	fontSize: "14px",
	fontWeight: "400",
	lineHeight: "18px",
};

const footerLink = {
	color: "#2E2D36",
	textDecoration: "underline",
};
