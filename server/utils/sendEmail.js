const nodemailer = require("nodemailer");

/**
 * Send email using nodemailer
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content (optional)
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    // Validate required environment variables
    if (!process.env.MAIL_HOST || !process.env.MAIL_PORT || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
      throw new Error("Email configuration missing. Please check environment variables.");
    }

    // Create transporter with SMTP configuration
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT),
      secure: process.env.MAIL_PORT === "465", // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // Email options
    const mailOptions = {
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to,
      subject,
      text,
      html: html || text, // Use HTML if provided, otherwise fallback to text
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log("Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email sending failed:", error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = sendEmail;