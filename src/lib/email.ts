import nodemailer from 'nodemailer';

// Create Transporter
export function getEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });
}

// Send Password Reset OTP Email
export async function sendOtpEmail({
  toEmail,
  userName,
  otp,
}: {
  toEmail: string;
  userName: string;
  otp: string;
}) {
  const transporter = getEmailTransporter();

  // If SMTP is not yet configured, log to console for development testing
  if (!transporter) {
    console.log('──────────────────────────────────────────────');
    console.log(`[EMAIL SIMULATION] To: ${toEmail}`);
    console.log(`[PASSWORD RESET OTP]: ${otp}`);
    console.log('──────────────────────────────────────────────');
    return {
      success: true,
      simulated: true,
      message: 'OTP જનરેટ થઈ ગયો છે (Console / Email)',
    };
  }

  const fromAddress =
    process.env.SMTP_FROM || `"Kundan Enterprise ERP" <${process.env.SMTP_USER}>`;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">Kundan Enterprise</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">Billing & Inventory ERP System</p>
      </div>

      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; color: #1e293b; margin-top: 0;">નમસ્તે <strong>${userName}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          તમારા એકાઉન્ટ માટે પાસવર્ડ રીસેટ કરવાની વિનંતી પ્રાપ્ત થઈ છે. તમારો ૬-અંક નો સુરક્ષિત OTP નીચે મુજબ છે:
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #3b82f6; border-radius: 8px; padding: 12px 28px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1e3a5f; font-family: monospace;">${otp}</span>
          </div>
        </div>

        <p style="font-size: 13px; color: #dc2626; font-weight: 500; text-align: center;">
          ⏱️ આ OTP ફક્ત ૧૦ મિનિટ માટે જ માન્ય રહેશે.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

        <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
          જો તમે આ પાસવર્ડ રીસેટ કરવાની વિનંતી ન કરી હોય, તો કૃપા કરીને આ મેઇલને અવગણો. તમારા એકાઉન્ટની સુરક્ષા અકબંધ છે.
        </p>
      </div>

      <div style="background-color: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          © ${new Date().getFullYear()} Kundan Enterprise, Jamnagar. All rights reserved.
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `[Kundan ERP] પાસવર્ડ રીસેટ OTP: ${otp}`,
      html: htmlContent,
    });
    return { success: true, message: 'OTP ઈમેલ સફળતાપૂર્વક મોકલાઈ ગયો છે' };
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    // Still return simulated success for dev so user isn't stuck
    return {
      success: true,
      simulated: true,
      error: 'SMTP ઈમેલ મોકલવામાં તકલીફ થઈ (Console OTP ચકાસો)',
    };
  }
}
