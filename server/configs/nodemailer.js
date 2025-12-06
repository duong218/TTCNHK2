/*
import nodemailer from 'nodemailer';

// Create a transporter object using the SMTP settings
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com', 
    port: 587, 
    auth: {
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS,
    },
});

// Export the transporter
export default transporter;
*/

// Fake transporter để bỏ qua việc gửi email
const transporter = {
    sendMail: async (options) => {
        console.log("📨 Email sending skipped (DISABLED MODE)");
        console.log("Mail options:", options);
        return {
            accepted: [options?.to || "example@example.com"],
            messageId: "fake-message-id",
        };
    }
};

export default transporter;
