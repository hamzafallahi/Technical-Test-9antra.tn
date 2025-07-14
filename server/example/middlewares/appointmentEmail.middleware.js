const { sendEmail } = require("./mail.Middleware");
const { Calendar, Provider } = require("../db");
const moment = require("moment");

/**
 * Middleware to send appointment confirmation emails to attendees
 * This middleware sends an HTML email with appointment details after an appointment is created
 */
const sendAppointmentEmail = async (req, res, next) => {
  console.log("[APPOINTMENT EMAIL] Middleware initialized");

  // The appointment information is in the response body
  const originalSend = res.send;

  res.send = function (body) {
    console.log(
      "[APPOINTMENT EMAIL] Response intercepted, status code:",
      res.statusCode
    );

    // Only execute for successful appointment creation (status 201)
    if (res.statusCode === 201 && body) {
      try {
        console.log("[APPOINTMENT EMAIL] Parsing response body");
        const appointmentData = JSON.parse(body);
        console.log("[APPOINTMENT EMAIL] Response body parsed successfully");

        // Make sure we have appointment data and attendees
        if (
          appointmentData?.data?.attributes &&
          appointmentData?.included &&
          Array.isArray(appointmentData.included)
        ) {
          console.log(
            "[APPOINTMENT EMAIL] Valid appointment data structure found"
          );

          // Process the response asynchronously so we don't delay the response to the client
          (async () => {
            try {
              // Extract appointment details
              const appointment = appointmentData.data.attributes;
              console.log(
                "[APPOINTMENT EMAIL] Appointment details:",
                JSON.stringify(appointment)
              );

              // Find the calendar details
              const calendarIncluded = appointmentData.included.find(
                (item) => item.type === "calendar"
              );
              console.log(
                "[APPOINTMENT EMAIL] Calendar found in included data:",
                calendarIncluded ? "Yes" : "No"
              );

              // Get the provider details from the calendar
              let providerName = "Service Provider";
              if (calendarIncluded) {
                const calendarId = calendarIncluded.id;
                console.log(
                  "[APPOINTMENT EMAIL] Looking up calendar with ID:",
                  calendarId
                );

                const calendar = await Calendar.findByPk(calendarId);
                if (calendar) {
                  console.log(
                    "[APPOINTMENT EMAIL] Calendar found, provider_id:",
                    calendar.provider_id
                  );

                  const provider = await Provider.findByPk(
                    calendar.provider_id
                  );
                  if (provider) {
                    providerName = `${provider.first_name} ${provider.last_name}`;
                    console.log(
                      "[APPOINTMENT EMAIL] Provider found:",
                      providerName
                    );
                  } else {
                    console.log(
                      "[APPOINTMENT EMAIL] Provider not found for ID:",
                      calendar.provider_id
                    );
                  }
                } else {
                  console.log(
                    "[APPOINTMENT EMAIL] Calendar not found for ID:",
                    calendarId
                  );
                }
              }

              // Find attendees
              const attendees = appointmentData.included.filter(
                (item) => item.type === "Attendees"
              );
              console.log(
                "[APPOINTMENT EMAIL] Found",
                attendees.length,
                "attendees"
              );

              // Format date and time for email
              const appointmentDate = moment(appointment.date).format(
                "dddd, MMMM D, YYYY"
              );
              const startTime = moment(
                appointment.start_time,
                "HH:mm:ss"
              ).format("h:mm A");
              const endTime = moment(appointment.end_time, "HH:mm:ss").format(
                "h:mm A"
              );
              console.log(
                "[APPOINTMENT EMAIL] Formatted date and time:",
                appointmentDate,
                startTime,
                endTime
              );

              // For each attendee, send an email
              for (const attendee of attendees) {
                const attendeeEmail = attendee.attributes.email;
                const attendeeName = attendee.attributes.first_name
                  ? `${attendee.attributes.first_name} ${
                      attendee.attributes.last_name || ""
                    }`
                  : "Valued Customer";

                console.log(
                  "[APPOINTMENT EMAIL] Preparing email for attendee:",
                  attendeeName,
                  "(",
                  attendeeEmail,
                  ")"
                );

                // Create HTML email content
                const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      line-height: 1.6;
                      color: #333;
                    }
                    .container {
                      max-width: 600px;
                      margin: 0 auto;
                      padding: 20px;
                      border: 1px solid #eee;
                      border-radius: 5px;
                    }
                    .header {
                      background-color: #4A90E2;
                      color: white;
                      padding: 15px;
                      text-align: center;
                      border-radius: 5px 5px 0 0;
                    }
                    .content {
                      padding: 20px;
                      background-color: #f9f9f9;
                    }
                    .appointment-details {
                      margin: 20px 0;
                      padding: 15px;
                      background-color: white;
                      border-left: 4px solid #4A90E2;
                    }
                    .footer {
                      text-align: center;
                      margin-top: 20px;
                      font-size: 12px;
                      color: #777;
                    }
                    .button {
                      display: inline-block;
                      background-color: #4A90E2;
                      color: white;
                      padding: 10px 20px;
                      text-decoration: none;
                      border-radius: 5px;
                      margin-top: 15px;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h2>Appointment Confirmation</h2>
                    </div>
                    <div class="content">
                      <p>Hello ${attendeeName},</p>
                      <p>Your appointment with ${providerName} has been successfully scheduled.</p>
                      
                      <div class="appointment-details">
                        <h3>Appointment Details</h3>
                        <p><strong>Date:</strong> ${appointmentDate}</p>
                        <p><strong>Time:</strong> ${startTime} to ${endTime}</p>
                        <p><strong>Status:</strong> ${appointment.status}</p>
                        ${
                          appointment.meeting_link
                            ? `<p><strong>Meeting Link:</strong> <a href="${appointment.meeting_link}">${appointment.meeting_link}</a></p>`
                            : ""
                        }
                      </div>
                      
                      <p>If you need to cancel or reschedule your appointment, please contact us as soon as possible.</p>
                      
                      <p>Thank you for using our service!</p>
                    </div>
                    <div class="footer">
                      <p>© ${new Date().getFullYear()} AppointNet. All rights reserved.</p>
                    </div>
                  </div>
                </body>
                </html>
                `;

                console.log(
                  "[APPOINTMENT EMAIL] Email HTML template created, attempting to send email"
                );

                try {
                  // Send the email
                  const emailResult = await sendEmail({
                    receipients: attendeeEmail,
                    subject: "Your Appointment Confirmation",
                    message: emailHtml,
                  });

                  console.log(
                    `[APPOINTMENT EMAIL] Email sent successfully to ${attendeeEmail}`,
                    emailResult
                  );
                } catch (emailError) {
                  console.error(
                    `[APPOINTMENT EMAIL] Failed to send email to ${attendeeEmail}:`,
                    emailError
                  );
                }
              }
            } catch (error) {
              console.error(
                "[APPOINTMENT EMAIL] Error in async processing:",
                error
              );
              // We don't throw here as it shouldn't affect the API response
            }
          })();
        } else {
          console.log(
            "[APPOINTMENT EMAIL] Invalid appointment data structure, cannot send emails"
          );
        }
      } catch (error) {
        console.error(
          "[APPOINTMENT EMAIL] Error parsing appointment response:",
          error
        );
      }
    } else {
      console.log(
        "[APPOINTMENT EMAIL] Not a successful appointment creation or no body, status:",
        res.statusCode,
        "body exists:",
        !!body
      );
    }

    // Continue with the original response
    console.log("[APPOINTMENT EMAIL] Continuing with original response");
    return originalSend.call(this, body);
  };

  console.log("[APPOINTMENT EMAIL] Middleware setup complete, calling next()");
  next();
};

module.exports = sendAppointmentEmail;
