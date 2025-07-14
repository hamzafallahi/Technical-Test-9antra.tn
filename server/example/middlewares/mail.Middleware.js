const nodemailer = require("nodemailer");

console.log('Initializing mail middleware...');

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "hamzafallahi7@gmail.com",
    pass: "rmyz vqsv vqhj cnwr",
  },
});

console.log('Email transporter created:', transporter ? 'Success' : 'Failed');

const sendEmail = async ({ receipients, subject, message }) => {
  console.log(`[EMAIL DEBUG] Attempting to send email:`);
  console.log(`[EMAIL DEBUG] - From: ${process.env.MAIL_SENDER_DEFAULT || "hamzafallahi7@gmail.com"}`);
  console.log(`[EMAIL DEBUG] - To: ${receipients}`);
  console.log(`[EMAIL DEBUG] - Subject: ${subject}`);
  
  try {
    const result = await transporter.sendMail({
      from: process.env.MAIL_SENDER_DEFAULT || "hamzafallahi7@gmail.com", // Use default if environment variable isn't set
      to: receipients, // list of receivers
      subject: subject, // Subject line
      text: message, // plain text body
      html: message, // valid text body
    });
    
    console.log(`[EMAIL DEBUG] Email sent successfully!`);
    console.log(`[EMAIL DEBUG] Message ID: ${result.messageId}`);
    console.log(`[EMAIL DEBUG] Response: ${JSON.stringify(result.response)}`);
    return result;
  } catch (error) {
    console.error(`[EMAIL DEBUG] Failed to send email:`);
    console.error(`[EMAIL DEBUG] Error name: ${error.name}`);
    console.error(`[EMAIL DEBUG] Error message: ${error.message}`);
    console.error(`[EMAIL DEBUG] Full error:`, error);
    throw error;
  }
};

module.exports = { sendEmail };
