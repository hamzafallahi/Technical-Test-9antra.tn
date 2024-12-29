import express from "express";
import { google } from "googleapis";
import nodemailer from "nodemailer";

const router = express.Router();

router.post("/", async (req, res) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.FROM_EMAIL_GMAIL,
      pass: process.env.FROM_EMAIL_PASSWORD,
    },
  });

  // Ensure these variables are defined before use
  const { name, email, message } = req.body;
  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL_GMAIL,
      to: email,
      subject: "9antra The Bridge - you will be contacted soon",
      html: `<!DOCTYPE html>
              <html lang="en">
              <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>9antra Email Template</title>
              </head>
              <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif; color: #333;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px;">
                      <tr>
                          <td align="center">
                              <!-- Main Email Container -->
                              <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                                  <!-- Header Section -->
                                  <tr>
                                      <td align="center" style="background-color: #0078d7; padding: 20px;">
                                          <img src="https://media.discordapp.net/attachments/1322668786070847608/1322701061462425741/TheBridgeLogo.png?ex=6771d4db&is=6770835b&hm=cd23400717c8dbeeb79309db7a20831138fc166757f52dc3feb1ddb0162758bb&=&format=webp&quality=lossless" alt="9antra Logo" style="display: block; width: 150px; height: auto;">
                                      </td>
                                  </tr>
                                  <!-- Banner Image -->
                                  <tr>
                                      <td align="center" style="padding: 0;">
                                          <img src="https://images.unsplash.com/photo-1611242320536-f12d3541249b?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8ZWR1Y2F0aW9ufGVufDB8fDB8fHww" alt="E-learning Banner" style="width: 100%; display: block; height: 20px;">
                                      </td>
                                  </tr>
                                  <!-- Main Content Section -->
                                  <tr>
                                      <td style="padding: 20px 30px; text-align: left;">
                                          <h1 style="color: #0078d7; font-size: 24px; margin: 0;">Welcome to 9antra - The Bridge</h1>
                                          <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                              Dear ${name},
                                              <br><br>
                                              We are excited to welcome you to 9antra, Tunisia's premier e-learning platform. Our mission is to connect learners and educators through engaging courses and resources tailored to your success.
                                          </p>
                                          <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                              Explore our wide range of courses, quizzes, and certifications to enhance your knowledge and skills. Together, we aim to bridge the gap between education and opportunity.
                                          </p>
                                          <div style="margin-top: 20px; background: #f4f7fa; padding: 20px; border-radius: 5px;">
                                              <p style="font-size: 16px; margin: 0; margin-top: 10px;"><strong>Message:</strong></p>
                                              <p style="font-size: 16px; margin: 0; color: #555;">${message}</p>
                                          </div>
                                          <a href="https://9antra.tn" style="display: inline-block; padding: 12px 20px; background-color: #0078d7; color: #ffffff; text-decoration: none; font-size: 16px; border-radius: 4px; margin-top: 10px;">
                                              Visit Our Platform
                                          </a>
                                      </td>
                                  </tr>
                                  <!-- Footer Section -->
                                  <tr>
                                      <td style="background-color: #0078d7; padding: 20px; text-align: center; color: #ffffff; font-size: 14px;">
                                          <p style="margin: 0;">&copy; 2024 9antra - The Bridge. All Rights Reserved.</p>
                                          <p style="margin: 5px 0;">Tunisia | Empowering Learning Everywhere</p>
                                          <a href="https://9antra.tn" style="color: #ffffff; text-decoration: underline;">Visit our website</a> | 
                                          <a href="mailto:support@9antra.tn" style="color: #ffffff; text-decoration: underline;">Contact Support</a>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>
                  </table>
              </body>
              </html>


    `,
    };

    await transporter.sendMail(mailOptions);
    /*  const body = req.body; // Access the body directly in Express.js
        console.log(body);
    
        const { name, email, message } = body;*/

    // Authenticate with Google APIs
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\n/g, "\n"), // Ensure newline is properly handled
      },
      scopes: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/spreadsheets",
      ],
    });

    const sheets = google.sheets({ auth, version: "v4" });

    const range = "A1:C1"; // Specify the range in the spreadsheet
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Append data to Google Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[name, email, message]],
      },
    });

    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error occurred while writing to Google Sheets:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
