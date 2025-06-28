export function getInvitationEmailTemplateHtml(
	inviterName: string,
	projectName: string,
	acceptInvitationUrl: string,
): string {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation to Collaborate - GrantFlow</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            background-color: #1e13f8;
            padding: 30px;
            text-align: center;
        }
        .header img {
            max-width: 150px;
            height: auto;
        }
        .content {
            padding: 40px 30px;
        }
        h1 {
            color: #1e13f8;
            font-size: 24px;
            margin-bottom: 20px;
        }
        p {
            margin-bottom: 20px;
            line-height: 1.8;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #1e13f8;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #1710d4;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            font-size: 14px;
            color: #666;
        }
        .project-name {
            font-weight: bold;
            color: #1e13f8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="cid:logo.png" alt="GrantFlow Logo">
        </div>
        <div class="content">
            <h1>Invitation to Collaborate on a Research Project in GrantFlow</h1>

            <p>Dear Researcher,</p>

            <p>You have been invited to collaborate on the research project <span class="project-name">"${projectName}"</span> within the GrantFlow platform.</p>

            <p>GrantFlow is designed to help research teams streamline and manage the grant application process.</p>

            <p>As a collaborator, you will gain access to the project workspace and will be able to contribute to grant applications and related documentation.</p>

            <p>To accept the invitation, please click the link below:</p>

            <div style="text-align: center;">
                <a href="${acceptInvitationUrl}" class="button">Accept Invitation</a>
            </div>

            <p>If you do not yet have a GrantFlow account, you will be guided through a brief sign-up process before accessing the project.</p>

            <p>We look forward to your participation.</p>

            <p>Sincerely,<br>
            The GrantFlow Team</p>
        </div>
        <div class="footer">
            <p>This invitation was sent by ${inviterName} from GrantFlow.</p>
            <p>If you received this email by mistake, you can safely ignore it.</p>
            <p>&copy; 2025 GrantFlow. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;
}

export function invitationEmailTemplateText(
	inviterName: string,
	projectName: string,
	acceptInvitationUrl: string,
): string {
	return `
Subject: Invitation to Collaborate on a Research Project in GrantFlow

Dear Researcher,

You have been invited to collaborate on the research project "${projectName}" within the GrantFlow platform.

GrantFlow is designed to help research teams streamline and manage the grant application process.

As a collaborator, you will gain access to the project workspace and will be able to contribute to grant applications and related documentation.

To accept the invitation, please click the link below:

[Accept Invitation]
${acceptInvitationUrl}

If you do not yet have a GrantFlow account, you will be guided through a brief sign-up process before accessing the project.

We look forward to your participation.

Sincerely,
The GrantFlow Team

---
This invitation was sent by ${inviterName} from GrantFlow.
If you received this email by mistake, you can safely ignore it.

© 2025 GrantFlow. All rights reserved.
`;
}
