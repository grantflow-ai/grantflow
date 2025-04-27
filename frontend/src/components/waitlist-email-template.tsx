import { getEnv } from "@/utils/env";

const logoUrl = `${getEnv().NEXT_PUBLIC_SITE_URL}/logo.png`;

const emailColors = {
	background: "#F6F9FC",

	primary: "#211968",
	primaryRgba: "rgba(33, 25, 104, 0.5)",

	textPrimary: "#232D36",
};

export function getWaitlistEmailTemplateHtml(username: null | string): string {
	const bulletItem = (text: string) => `
    <tr>
        <td width="5" style="vertical-align: top; padding-top: 7px;">
            <div style="background-color: ${emailColors.textPrimary}; height: 4px; width: 4px; border-radius: 50%;"></div>
        </td>
        <td style="padding-left: 10px;">
            ${text}
        </td>
    </tr>
    `;

	return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to the GrantFlow.ai Waitlist</title>

          <!--[if mso]>
          <style>
            table {border-collapse: collapse; border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt;}
            td {padding: 0;}
            * {font-family: Arial, sans-serif !important;}
          </style>
          <![endif]-->

          <style>
            @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&display=swap');
          </style>
        </head>

        <body style="margin: 0; padding: 0; background-color: ${emailColors.background}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: 'Source Sans 3', Arial, Helvetica, sans-serif; color: ${emailColors.textPrimary}; line-height: 1.25;">
          <!-- Wrapper for Outlook -->
          <!--[if mso]>
          <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600">
          <tr>
          <td>
          <![endif]-->

          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 600px; margin: 0 auto;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);">
                  <tr>
                    <td style="padding: 30px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">

                        <!-- Salutation -->
                        <tr>
                          <td style="font-weight: 600; padding-bottom: 15px;">
                            Dear ${username?.trim() ? username : "Researcher"},
                          </td>
                        </tr>

                        <!-- Main message -->
                        <tr>
                          <td style="padding-bottom: 20px;">
                            Thank you for joining the waitlist for GrantFlow.ai. Your interest in our platform is greatly appreciated.
                          </td>
                        </tr>

                        <!-- Platform description -->
                        <tr>
                          <td>
                            GrantFlow.ai is designed to streamline the research funding process. As a waitlist member, you will receive:
                          </td>
                        </tr>

                        <!-- Benefits list -->
                        <tr style="margin-left: 10px;">
                          <td style="padding-bottom: 20px; padding-left: 10px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100% style="margin-left: 20px;">
                                ${bulletItem("Early access to the platform")}
                                ${bulletItem("Product updates and development insights")}
                                ${bulletItem("Priority notifications about our launch and special offers")}
                            </table>
                          </td>
                        </tr>

                        <!-- Final message -->
                        <tr>
                          <td style="padding-bottom: 40px;">
                            We look forward to keeping you informed as we move closer to release. Should you have any questions or feedback in the meantime, please don't hesitate to reply to this message.
                          </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                          <td style="font-weight: 600; padding-bottom: 20px; border-bottom: 0.5px solid; border-color: ${emailColors.primaryRgba};">
                            Warm regards,<br/>
                            GrantFlow.ai team
                          </td>
                        </tr>

                        <!-- Footer with logo -->
                        <tr>
                            <td style="padding-top: 20px; border-top: 1px solid rgba(238, 238, 238, 0.5); text-align: left;">
                                <a href="${getEnv().NEXT_PUBLIC_SITE_URL}" target="_blank" style="text-decoration: none; display: inline-block;">
                                    <img
                                        src="${logoUrl}"
                                        alt="GrantFlow.ai Logo"
                                        width="120"
                                        height="40"
                                        style="display: block; border: 0; -ms-interpolation-mode: bicubic;"
                                    />
                                </a>
                            </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!--[if mso]>
          </td>
          </tr>
          </table>
          <![endif]-->
        </body>
      </html>
    `;
}

export const waitlistEmailTemplateText = (username: null | string) => {
	return `
    Dear ${username?.trim() ? username : "Researcher"},

	Thank you for joining the waitlist for GrantFlow.ai. Your interest in our platform is greatly appreciated.

	GrantFlow.ai is designed to streamline the research funding process. As a waitlist member, you will receive:
	- Early access to the platform
	- Product updates and development insights
	- Priority notifications about our launch and special offers

	We look forward to keeping you informed as we move closer to release. Should you have any questions or feedback in the meantime, please don't hesitate to reply to this message.

	Warm regards,
	GrantFlow.ai team
    `;
};
