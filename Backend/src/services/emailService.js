import { emailTemplates } from "../utils/emailTemplates.js";
import { sendGridMail, emailConfig } from "../config/email.js";

class EmailService {
  constructor() {
    this.sgMail = sendGridMail;
  }


  // Send email verification
  async sendEmailVerification(user, verificationToken) {
    try {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const verificationLink = `${baseUrl}/api/auth/verify-email/${verificationToken}`;

      const template = emailTemplates.emailVerification(verificationLink, user.firstName);
      
      const mailOptions = {
        to: user.email,
        from: {
          email: emailConfig.fromEmail,
          name: emailConfig.fromName
        },
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      const result = await this.sgMail.send(mailOptions);
      console.log('✅ Email verification sent via SendGrid');
      
      return {
        success: true,
        messageId: result[0].headers['x-message-id'],
        message: 'Email verification sent successfully'
      };
    } catch (error) {
      console.error('❌ Failed to send email verification via SendGrid:', error);
      
      // SendGrid provides detailed error information
      if (error.response) {
        console.error('SendGrid Error Details:', error.response.body);
      }
      
      throw new Error('Failed to send email verification');
    }
  }

  // Send password reset email
  async sendPasswordReset(user, resetToken) {
    try {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetLink = `${baseUrl}/reset-password/${resetToken}`;

      const template = emailTemplates.passwordReset(resetLink, user.firstName);
      
      const mailOptions = {
        to: user.email,
        from: {
          email: emailConfig.fromEmail,
          name: emailConfig.fromName
        },
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      const result = await this.sgMail.send(mailOptions);
      console.log('✅ Password reset email sent via SendGrid');
      
      return {
        success: true,
        messageId: result[0].headers['x-message-id'],
        message: 'Password reset email sent successfully'
      };
    } catch (error) {
      console.error('❌ Failed to send password reset email via SendGrid:', error);
      
      // SendGrid provides detailed error information
      if (error.response) {
        console.error('SendGrid Error Details:', error.response.body);
      }
      
      throw new Error('Failed to send password reset email');
    }
  }
}

export default new EmailService();