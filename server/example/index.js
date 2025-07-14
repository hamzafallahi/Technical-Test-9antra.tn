const express = require("express");
const bodyParser = require("body-parser");
const CalendarsRouter = require("./routes/calendars.route");
const WorkingSlotsRouter = require("./routes/workingslots.route");
const ProviderRouter = require("./routes/providers.route");
const UserRouter = require("./routes/users.route");
//const UserRouter = require("./routes/users.route");
const AppointmentRouter = require("./routes/appointments.route");
const AttendeeRouter = require("./routes/attendees.route");
const { httpPort } = require("./config/app-config");
const path = require("path");
const cors = require("cors"); // Import the cors package
const app = express();
const setupSwagger = require("./config/swagger");
const ErrorHandlerModule = require("./error/handler/errorHandler");
// Import the RabbitMQ consumer to initialize it
const rabbitMQConsumer = require("./middlewares/rabbitmq.consumer");

require("dotenv").config();
// Enable CORS for all routes
// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token', 'x-add-meet','x-accept-language','x-www-form-urlencoded','provider-id',"Access-Control-Allow-Origin"],
  exposedHeaders: ['Content-Length', 'Content-Disposition']
}));

// let's have documentation at the root
app.use(express.static("doc"));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.get("/docs", function (req, res) {
  res.sendFile(path.join(__dirname + "/doc/index.html"));
});

// it will be good to move below two imports to top of the file

//calendars api routes
app.use("/api/v1/calendars/users", UserRouter);
app.use("/api/v1/calendars/providers", ProviderRouter);
app.use("/api/v1/calendars", CalendarsRouter);
app.use("/api/v1/calendars", WorkingSlotsRouter);
//app.use("/api/v1", UserRouter);
// Now, /api/providers will work
app.use("/api/v1/calendars", AppointmentRouter);
app.use("/api/v1/calendars", AttendeeRouter);

app.use(ErrorHandlerModule.errorHandler);

// custom error handlers
// this will also catch async errors since we are usign express-async-errors
// eslint-disable-next-line no-unused-vars

if (process.env.NODE_ENV !== "production") {
  setupSwagger(app);
}

app.listen(httpPort, () => {
  console.log(`Calendars-ms API app listening on port ${httpPort}!`);
  console.log("RabbitMQ consumer initialized for data synchronization");
});