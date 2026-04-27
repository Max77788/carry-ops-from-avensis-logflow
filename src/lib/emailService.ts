/**
 * Email Service
 * Handles sending emails via Resend API
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  attachmentUrl?: string;
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Vercel Serverless Function (which calls Resend API)
 * This avoids CORS issues by calling Resend from the backend
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResponse> {
  try {
    console.log(`📧 Sending email to: ${params.to}`);
    console.log(`📝 Subject: ${params.subject}`);

    // Call our Vercel serverless function instead of Resend directly
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: params.to,
        subject: params.subject,
        html: params.html,
        from: params.from,
        attachmentUrl: params.attachmentUrl,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Email API error:", data);
      return {
        success: false,
        error: data.error || `Failed to send email: ${response.status}`,
      };
    }

    console.log(`✅ Email sent successfully! Message ID: ${data.messageId}`);

    return {
      success: data.success,
      messageId: data.messageId,
    };
  } catch (error: any) {
    console.error("❌ Error sending email:", error);
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
  }
}

/**
 * Generate HTML template for access enabled email
 */
export function generateAccessEnabledEmailHTML(params: {
  companyName: string;
  username: string;
  password: string;
  loginUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portal Access Enabled - Avensis LogFlow</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #10b981; margin-bottom: 20px;">🎉 Your Portal Access is Now Active!</h1>

    <p style="font-size: 16px; margin-bottom: 15px;">Dear ${params.companyName},</p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      Great news! Your account has been activated and you now have full access to the Avensis LogFlow platform.
    </p>

    <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
      <h2 style="color: #10b981; margin-top: 0; font-size: 18px;">Access Your Portal</h2>
      <p style="margin: 10px 0;">
        <strong>Click here to log in automatically:</strong><br>
        <a href="${params.loginUrl}" style="display: inline-block; margin-top: 10px; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Access Portal Now</a>
      </p>
      <p style="margin: 20px 0 10px 0; font-size: 14px; color: #666;">Or use these credentials to log in manually:</p>
      <p style="margin: 10px 0;"><strong>Username:</strong> ${params.username}</p>
      <p style="margin: 10px 0;"><strong>Password:</strong> ${params.password}</p>
      <p style="margin: 10px 0;"><strong>Login URL:</strong><br>
        <a href="${params.loginUrl}" style="color: #10b981; text-decoration: none; font-size: 14px; word-break: break-all;">${params.loginUrl}</a>
      </p>
    </div>

    <h3 style="color: #10b981; font-size: 16px; margin-top: 25px;">What You Can Do Now:</h3>
    <ul style="font-size: 15px; line-height: 1.8;">
      <li>Access your complete company profile</li>
      <li>Manage your fleet and drivers</li>
      <li>View and track tickets</li>
      <li>Update company information</li>
      <li>Monitor logistics operations in real-time</li>
    </ul>

    <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
      <p style="margin: 0; font-size: 14px;">
        <strong>💡 Need Help?</strong> If you have any questions or need assistance, please contact <a href="mailto:onboarding@primalfreight.com" style="color: #2563eb; text-decoration: none;">onboarding@primalfreight.com</a>.
      </p>
    </div>

    <p style="font-size: 15px; margin-top: 25px;">
      Thank you for being part of Avensis LogFlow!
    </p>

    <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      Best regards,<br>
      <strong>The Avensis LogFlow Team</strong>
    </p>
  </div>
</body>
</html>
`;
}

/**
 * Generate HTML template for onboarding email
 */
export function generateOnboardingEmailHTML(params: {
  companyName: string;
  username: string;
  tempPassword: string;
  loginUrl: string;
  onboardingUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the e-Ticketing - Vendor Onboarding Required</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 650px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; padding: 35px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <h1 style="color: #1f2937; margin-bottom: 25px; font-size: 24px;">Welcome to the e-Ticketing - Vendor Onboarding Required</h1>

    <p style="font-size: 16px; margin-bottom: 15px;">Hi <strong>${
      params.companyName
    }</strong>,</p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      Primal Material and Avensis Energy has partnered with AI FusionIQ Labs to launch the <strong>e-Ticketing App</strong>,
      a new digital platform that replaces paper tickets and manual reporting with a simple, mobile-first app. You're receiving
      this email because your company is an approved transportation partner for Avensis Energy and will now manage load activity
      through FleetGate.
    </p>

    <h2 style="color: #2563eb; font-size: 20px; margin-top: 30px; margin-bottom: 15px;">Why This Matters</h2>
    <p style="font-size: 16px; margin-bottom: 15px;">
      Beginning <strong>Dec 1 2025</strong>, all Avensis Energy loads will be tracked and verified using the e-Ticketing App. The system will:
    </p>
    <ul style="font-size: 16px; line-height: 1.8; margin-bottom: 20px;">
      <li>Eliminate paper tickets and phone-based updates.</li>
      <li>Provide instant proof of pickup & delivery with e-signatures and GPS validation.</li>
      <li>Give you real-time visibility into your loads and payout summaries.</li>
      <li>Get paid on time and reduce delays, and ticket reconciliation issues.</li>
    </ul>

    <h2 style="color: #2563eb; font-size: 20px; margin-top: 30px; margin-bottom: 15px;">What You Need to Do</h2>
    <p style="font-size: 16px; margin-bottom: 15px;">
      To activate your company in the e-Ticketing App, please complete the vendor onboarding form linked below.
      It should take about <strong>15 minutes</strong> to fill out.
    </p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
      <p style="margin: 10px 0; font-size: 16px;"><strong>Onboarding Portal:</strong><br>
        <a href="${
          params.onboardingUrl
        }" style="color: #2563eb; text-decoration: none; font-size: 15px; word-break: break-all;">${
    params.onboardingUrl
  }</a>
      </p>
      <p style="margin: 10px 0; font-size: 16px;"><strong>User name:</strong> ${
        params.username
      }</p>
      <p style="margin: 10px 0; font-size: 16px;"><strong>Password:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px;">${
        params.tempPassword
      }</code></p>
    </div>

    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-size: 15px;">
        <strong>💡 Recommendation:</strong> We recommend changing the password after the onboarding process is complete through the portal.
        Link to the portal will be sent after the onboarding.
      </p>
    </div>

    <h2 style="color: #2563eb; font-size: 20px; margin-top: 30px; margin-bottom: 15px;">What to Expect</h2>
    <ol style="font-size: 16px; line-height: 1.8; margin-bottom: 20px;">
      <li><strong>Terms of Agreement:</strong> Open the link, review and accept the terms of use before moving forward.</li>
      <li><strong>Complete Onboarding:</strong> Fill out required details – company info, Fleet and Drivers.</li>
      <li><strong>Submit & Confirmation:</strong> You'll receive an acknowledgment email once your information has been verified.</li>
    </ol>

    <div style="text-align: center; margin: 35px 0;">
      <a href="${params.onboardingUrl}"
         style="display: inline-block; background-color: #2563eb; color: #fff; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
        Complete Onboarding Now
      </a>
    </div>

    <h2 style="color: #2563eb; font-size: 20px; margin-top: 30px; margin-bottom: 15px;">Need Help?</h2>
    <p style="font-size: 16px; margin-bottom: 15px;">
      If you have any questions or need support during onboarding, please contact our implementation team at
      <a href="mailto:onboarding@primalfreight.com" style="color: #2563eb; text-decoration: none;">onboarding@primalfreight.com</a>
    </p>

    <p style="font-size: 16px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      We appreciate your partnership and look forward to working together through the e-Ticketing app.
    </p>

    <p style="font-size: 16px; margin-top: 25px;">
      Best regards,<br>
      <strong>Support Team</strong><br>
      <strong>AI FusionIQ LABS</strong>
    </p>
  </div>

  <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
    <p>© ${new Date().getFullYear()} AI FusionIQ LABS. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML template for driver application form email
 */
export function generateDriverApplicationFormEmailHTML(params: {
  driverName: string;
  formUrl: string;
  positionType: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Driver Application - Primal Materials</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; max-width: 650px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; padding: 35px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #10b981; margin: 0; font-size: 28px;">🚛 Complete Your Driver Application</h1>
    </div>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Dear ${params.driverName},
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Thank you for your interest in joining our team at <strong>Primal Materials</strong>! We're excited to move forward with your application for the <strong>${
        params.positionType
      }</strong> position.
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      To continue with your application, please complete our online driver application form. This form will collect important information including:
    </p>

    <ul style="font-size: 16px; margin-bottom: 25px; line-height: 2;">
      <li>Personal and contact information</li>
      <li>Driver's license details</li>
      <li>Driving experience and safety record</li>
      <li>Employment history</li>
      <li>Required document uploads</li>
    </ul>

    <div style="background-color: #f3f4f6; padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #10b981; text-align: center;">
      <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">Click the button below to access your application form:</p>
      <a href="${
        params.formUrl
      }" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 10px 0;">Complete Application Form</a>
      <p style="margin: 15px 0 0 0; font-size: 13px; color: #666;">
        Or copy and paste this link into your browser:<br>
        <span style="word-break: break-all; color: #2563eb;">${
          params.formUrl
        }</span>
      </p>
    </div>

    <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
      <p style="margin: 0; font-size: 15px;">
        <strong>⏱️ Important:</strong> Please complete this form at your earliest convenience. Your application will be reviewed once all information is submitted.
      </p>
    </div>

    <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-size: 15px;">
        <strong>📋 What You'll Need:</strong>
      </p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 15px;">
        <li>Driver's License (for upload)</li>
        <li>Social Security Card (for upload)</li>
        <li>Medical Card (if applicable)</li>
        <li>Employment history</li>
        <li>Accident and violation history (past 3 years)</li>
      </ul>
    </div>

    <p style="font-size: 16px; margin-top: 25px;">
      The form will save your progress automatically, so you can complete it in multiple sessions if needed.
    </p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; font-size: 15px;">
        <strong>💡 Need Help?</strong> If you have any questions or need assistance, please contact us at <a href="mailto:support@avensisenergy.com" style="color: #2563eb; text-decoration: none;">support@avensisenergy.com</a>.
      </p>
    </div>

    <p style="font-size: 16px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      We look forward to reviewing your application!
    </p>

    <p style="font-size: 16px; margin-top: 25px;">
      Best regards,<br>
      <strong>HR Team</strong><br>
      <strong>Primal Materials</strong>
    </p>
  </div>

  <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
    <p>© ${new Date().getFullYear()} Primal Materials. All rights reserved.</p>
    <p style="margin-top: 10px;">This is an automated message. Please do not reply to this email.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML template for driver application received email (Stage 1 - Success)
 */
export function generateDriverApplicationReceivedEmailHTML(params: {
  driverName: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Application Has Been Received</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <h1 style="color: #10b981; margin-bottom: 20px; font-size: 24px;">Your Application Has Been Received</h1>

    <p style="font-size: 16px; margin-bottom: 15px;">Hi ${params.driverName},</p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      We received your application and everything looks good on our end. You're now moving to the next step in the process.
    </p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      We'll send you another update once that part is done.
    </p>

    <p style="font-size: 16px; margin-top: 25px;">
      Thank you,<br>
      <strong>Primal Team</strong>
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML template for MVR check completed email (Stage 2 - Success)
 */
export function generateDriverMVRCompletedEmailHTML(params: {
  driverName: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MVR Check Completed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <h1 style="color: #10b981; margin-bottom: 20px; font-size: 24px;">MVR Check Completed</h1>

    <p style="font-size: 16px; margin-bottom: 15px;">Hi ${params.driverName},</p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      Your MVR check is complete. Thank you for your patience. You're now cleared to move to the next step.
    </p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      We'll update you again once the next stage is finished.
    </p>

    <p style="font-size: 16px; margin-top: 25px;">
      Thank you,<br>
      <strong>Primal Team</strong>
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML template for drug test completed email (Stage 3 - Success)
 */
export function generateDriverDrugTestCompletedEmailHTML(params: {
  driverName: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Drug Test Completed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <h1 style="color: #10b981; margin-bottom: 20px; font-size: 24px;">Drug Test Completed</h1>

    <p style="font-size: 16px; margin-bottom: 15px;">Hi ${params.driverName},</p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      Your drug test results are in and everything is complete. You're now ready for the final step.
    </p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      We'll reach out again once orientation is scheduled.
    </p>

    <p style="font-size: 16px; margin-top: 25px;">
      Thank you,<br>
      <strong>Primal Team</strong>
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML template for cleared for orientation email (Stage 4 - Success)
 */
export function generateDriverClearedForOrientationEmailHTML(params: {
  driverName: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Cleared for Orientation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <h1 style="color: #10b981; margin-bottom: 20px; font-size: 24px;">You're Cleared for Orientation</h1>

    <p style="font-size: 16px; margin-bottom: 15px;">Hi ${params.driverName},</p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      You've completed all the required steps. Your final step is to meet our superintendent at the yard for orientation.
    </p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      We'll send the time and address shortly.
    </p>

    <p style="font-size: 16px; margin-top: 25px;">
      Welcome aboard,<br>
      <strong>Primal Team</strong>
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML template for application not approved email (Stage 1 - Failure)
 */
export function generateDriverApplicationNotApprovedEmailHTML(params: {
  driverName: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Update on Your Application</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <h1 style="color: #6b7280; margin-bottom: 20px; font-size: 24px;">Update on Your Application</h1>

    <p style="font-size: 16px; margin-bottom: 15px;">Hi ${params.driverName},</p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      Thanks for applying. After reviewing your information, we're not able to move forward at this time.
    </p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      If anything changes in the future, you're welcome to apply again.
    </p>

    <p style="font-size: 16px; margin-top: 25px;">
      Thank you,<br>
      <strong>Avensis Team</strong>
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML template for MVR not cleared email (Stage 2 - Failure)
 */
export function generateDriverMVRNotClearedEmailHTML(params: {
  driverName: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MVR Review Result</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <h1 style="color: #6b7280; margin-bottom: 20px; font-size: 24px;">MVR Review Result</h1>

    <p style="font-size: 16px; margin-bottom: 15px;">Hi ${params.driverName},</p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      We completed your MVR review. Based on the results, we're not able to move forward with your application at this time.
    </p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      You're welcome to reapply in the future if your driving record improves.
    </p>

    <p style="font-size: 16px; margin-top: 25px;">
      Thank you,<br>
      <strong>Avensis Team</strong>
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML template for drug test not cleared email (Stage 3 - Failure)
 */
export function generateDriverDrugTestNotClearedEmailHTML(params: {
  driverName: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Drug Test Result</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <h1 style="color: #6b7280; margin-bottom: 20px; font-size: 24px;">Drug Test Result</h1>

    <p style="font-size: 16px; margin-bottom: 15px;">Hi ${params.driverName},</p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      We received your drug test results. At this time, we're not able to continue with the hiring process.
    </p>

    <p style="font-size: 16px; margin-bottom: 15px;">
      If you complete all required steps in the future and meet DOT standards, you may reapply.
    </p>

    <p style="font-size: 16px; margin-top: 25px;">
      Thank you,<br>
      <strong>Avensis Team</strong>
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML template for orientation scheduled email
 */
export function generateDriverOrientationScheduledEmailHTML(params: {
  driverName: string;
  orientationDate: string;
  supervisorName: string;
  yardName: string;
  yardAddress?: string;
  notes?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orientation Scheduled - Primal Materials</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <h1 style="color: #10b981; margin-bottom: 20px; font-size: 24px;">🎉 Your Orientation is Scheduled!</h1>

    <p style="font-size: 16px; margin-bottom: 15px;">Hi ${
      params.driverName
    },</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Great news! Your orientation has been scheduled. Please review the details below and make sure to arrive on time.
    </p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
      <h2 style="color: #10b981; margin-top: 0; font-size: 18px; margin-bottom: 15px;">Orientation Details</h2>

      <p style="margin: 10px 0; font-size: 16px;">
        <strong>📅 Date & Time:</strong><br>
        ${params.orientationDate}
      </p>

      <p style="margin: 10px 0; font-size: 16px;">
        <strong>👤 Supervisor:</strong><br>
        ${params.supervisorName}
      </p>

      <p style="margin: 10px 0; font-size: 16px;">
        <strong>📍 Location:</strong><br>
        ${params.yardName}${
    params.yardAddress ? `<br>${params.yardAddress}` : ""
  }
      </p>

      ${
        params.notes
          ? `
      <p style="margin: 10px 0; font-size: 16px;">
        <strong>📝 Additional Notes:</strong><br>
        ${params.notes}
      </p>
      `
          : ""
      }
    </div>

    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-size: 15px;">
        <strong>⏰ Important:</strong> Please arrive 10-15 minutes early to allow time for check-in.
      </p>
    </div>

    <p style="font-size: 16px; margin-top: 25px;">
      If you have any questions or need to reschedule, please contact us at <a href="mailto:support@avensisenergy.com" style="color: #2563eb; text-decoration: none;">support@avensisenergy.com</a>.
    </p>

    <p style="font-size: 16px; margin-top: 25px;">
      We look forward to seeing you!<br>
      <strong>Primal Team</strong>
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML template for drug test order email
 */
export function generateDriverDrugTestOrderEmailHTML(params: {
  driverName: string;
  provider: string;
  site: string;
  scheduledDate: string;
}): string {
  // Calculate expiry date (3 days from scheduled date)
  const scheduledDateObj = new Date(params.scheduledDate);
  const expiryDateObj = new Date(scheduledDateObj);
  expiryDateObj.setDate(expiryDateObj.getDate() + 3);
  const expiryDate = expiryDateObj.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Drug Test Order Created - Avensis Energy</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
    <h1 style="color: #10b981; margin-bottom: 20px; font-size: 24px;">Drug Test Order Created</h1>

    <p style="font-size: 16px; margin-bottom: 15px;">Hi ${params.driverName},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Your drug test order has been created. Please review the details below and follow the instructions in the attached work order.
    </p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
      <h2 style="color: #10b981; margin-top: 0; font-size: 18px; margin-bottom: 15px;">Drug Test Details</h2>

      <p style="margin: 10px 0; font-size: 16px;">
        <strong>Provider:</strong><br>
        ${params.provider}
      </p>

      <p style="margin: 10px 0; font-size: 16px;">
        <strong>Test Site:</strong><br>
        ${params.site}
      </p>

      <p style="margin: 10px 0; font-size: 16px;">
        <strong>Scheduled Date:</strong><br>
        ${params.scheduledDate}
      </p>
    </div>

    <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
      <h3 style="color: #3b82f6; margin-top: 0; font-size: 16px; margin-bottom: 10px;">📎 Work Order Instructions</h3>
      <p style="margin: 10px 0; font-size: 15px;">
        Please see the attached work order document for detailed instructions and requirements. You can walk in anytime during clinic working hours within the time window specified below.
      </p>
    </div>

    <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
      <h3 style="color: #f59e0b; margin-top: 0; font-size: 16px; margin-bottom: 10px;">⏰ Time Window for Completion</h3>
      <p style="margin: 10px 0; font-size: 15px;">
        <strong>You have 3 days to complete your drug test.</strong> The work order expires on <strong>${expiryDate}</strong>.
      </p>
      <p style="margin: 10px 0; font-size: 15px;">
        You can walk in anytime during the clinic's working hours within this 3-day window. No appointment is required - simply bring your work order and a valid photo ID.
      </p>
    </div>

    <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ef4444;">
      <p style="margin: 0; font-size: 15px;">
        <strong>⚠️ Important:</strong> The work order expires 3 days from the scheduled test date (${expiryDate}). Please complete your drug test before this date.
      </p>
    </div>

    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; font-size: 15px;">
        <strong>📋 What to Bring:</strong>
      </p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 15px;">
        <li>Valid photo ID (Driver's License or State ID)</li>
        <li>Work order document (attached to this email)</li>
      </ul>
    </div>

    <p style="font-size: 16px; margin-top: 25px;">
      If you have any questions or need assistance, please contact us at <a href="mailto:support@avensisenergy.com" style="color: #2563eb; text-decoration: none;">support@avensisenergy.com</a>.
    </p>

    <p style="font-size: 16px; margin-top: 25px;">
      Thank you,<br>
      <strong>HR Team</strong><br>
      <strong>Avensis Energy</strong>
    </p>
  </div>
</body>
</html>
  `.trim();
}
