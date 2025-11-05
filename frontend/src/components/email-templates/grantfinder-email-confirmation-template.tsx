import { Body, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from "@react-email/components";

interface GrantfinderEmailConfirmationTemplateProps {
	activityCodes: string;
	careerStage: string;
	emailForAlerts: string;
	institutionLocation: string;
	keywords: string;
}

export default function GrantfinderEmailConfirmationTemplate({
	activityCodes,
	careerStage,
	emailForAlerts,
	institutionLocation,
	keywords,
}: GrantfinderEmailConfirmationTemplateProps) {
	return (
		<Html>
			<Head>
				<meta content="text/html; charset=UTF-8" httpEquiv="Content-Type" />
				<meta content="width=device-width, initial-scale=1" name="viewport" />
				<link href="https://fonts.googleapis.com" rel="preconnect" />
				<link crossOrigin="anonymous" href="https://fonts.gstatic.com" rel="preconnect" />
				{/* eslint-disable-next-line @next/next/no-page-custom-font */}
				<link
					href="https://fonts.googleapis.com/css2?family=Cabin:ital,wght@0,400..700;1,400..700&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap"
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
			<Preview>Verify your email to complete your GrantFlow registration</Preview>
			<Body style={main}>
				<Container className="container" style={container}>
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
								alt="GrantFlow Logo"
								height={31}
								src="https://staging.grantflow.ai/assets/grantflow.svg"
								style={logo}
								width={79}
							/>
							<Text style={logoSubtext}>By Vsphera</Text>
						</div>
					</Section>

					<Section className="content" style={content}>
						<Text className="paragraph" style={{ ...paragraph, marginBottom: "16px" }}>
							Thank you for subscribing to Vsphera’s Grant Finder alerts. <br /> From now on, you’ll
							receive notifications the moment an NIH funding opportunity matches your research profile,
							ensuring you never miss the right call.
						</Text>

						<Section style={{ ...outerSummarySection, marginBottom: "16px" }}>
							<Section className="summary" style={summary}>
								<Heading className="heading" style={heading}>
									Your search summary
								</Heading>
								<Text className="paragraph" style={{ ...paragraph, marginBottom: "16px" }}>
									Looking forward to helping you simplify your grant applications,
								</Text>
								<div style={{ marginBottom: "10px" }}>
									<Text style={summaryParagraphwithMarginBottom}>Keywords</Text>
									<Text style={summaryParagraph}>{keywords}</Text>
								</div>
								<div style={{ marginBottom: "10px" }}>
									<Text style={summaryParagraphwithMarginBottom}>Activity codes</Text>
									<Text style={summaryParagraph}>{activityCodes}</Text>
								</div>
								<div style={{ marginBottom: "10px" }}>
									<Text style={summaryParagraphwithMarginBottom}>Institution location</Text>
									<Text style={summaryParagraph}>{institutionLocation}</Text>
								</div>
								<div style={{ marginBottom: "10px" }}>
									<Text style={summaryParagraphwithMarginBottom}>Career stage</Text>
									<Text style={summaryParagraph}>{careerStage}</Text>
								</div>
								<div>
									<Text style={summaryParagraphwithMarginBottom}>Email for alerts</Text>
									<Text style={summaryParagraph}>{emailForAlerts}</Text>
								</div>
							</Section>
						</Section>

						<Text className="paragraph" style={{ ...paragraph, marginBottom: "16px" }}>
							If you need any help, feel free to reach out!
						</Text>

						<Text className="paragraph" style={paragraph}>
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
							If you need any help, feel free to reach out!
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
	fontFamily:
		"'Cabin', 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
	margin: "12px 0 0",
	padding: 0,
};

const container = {
	backgroundColor: "#ffffff",
	border: "1px solid #dddddd",
	margin: "0 auto",
	maxWidth: "592px",
};
const heading = {
	color: "#2e2d36",
	fontSize: "16px",
	fontWeight: "600",
	lineHeight: "22px",
	marginBottom: "8px",
};
const header = {
	padding: "32px 20px 0",
	textAlign: "left" as const,
};

const headerContent = {
	textAlign: "center" as const,
	width: "79px",
};

const logo = {
	margin: "0 auto",
	maxWidth: "150px",
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

const paragraph = {
	color: "#636170",
	fontSize: "16px",
	fontWeight: "400",
	lineHeight: "20px",
};
const summaryParagraphwithMarginBottom = {
	color: "#636170",
	fontSize: "14px",
	fontWeight: "400",
	lineHeight: "20px",
	marginBottom: "8px",
};
const summaryParagraph = {
	color: "#2E2D36",
	fontFamily: "'Source Sans 3', sans-serif",
	fontSize: "14px",
	fontWeight: "400",
	lineHeight: "20px",
	marginBottom: "0px",
};

const summary = {
	background: "#FAF9FB",

	border: "1px solid #E1DFEB",
	borderRadius: "8px",
	paddingBottom: "24px",
	paddingLeft: "25px",
	paddingRight: "25px",
	paddingTop: "24px",
};

const outerSummarySection = {
	backgroundColor: "#ffffff",
	paddingBottom: "24px",
	paddingLeft: "32px",
	paddingRight: "32px",
	paddingTop: "24px",
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
