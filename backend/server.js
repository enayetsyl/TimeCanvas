require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cron = require("node-cron");
const nodemailer = require("nodemailer");
const quotes = require("./quote");


const app = express();
app.use(express.json());

// Connect to MongoDB using Mongoose
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define the User schema and model
const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  dob: { type: Date, required: true },
  lifeExpectancy: { type: Number, required: true },
  subscribed: { type: Boolean, default: true },
});

const User = mongoose.model("User", userSchema);

// API endpoint to register user info
app.post("/api/register", async (req, res) => {
  try {
    const { email, dob, lifeExpectancy } = req.body;
    const user = new User({ email, dob, lifeExpectancy, subscribed: true });
    await user.save();
    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // Example using Gmail; change as needed
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper function to calculate user stats
function calculateStats(dob, lifeExpectancy) {
  const birthDate = new Date(dob);
  const now = new Date();
  const diffMs = now - birthDate;
  const weeksLived = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));

  // Calculate the final expected date and remaining time
  const finalDate = new Date(birthDate);
  finalDate.setFullYear(finalDate.getFullYear() + lifeExpectancy);
  const diffSec = Math.floor((finalDate - now) / 1000);

  let statsText = "";
  if (diffSec <= 0) {
    statsText = "You have reached or exceeded your expected lifespan.";
  } else {
    const secondsInYear = 365.25 * 24 * 60 * 60;
    const secondsInMonth = 30.4375 * 24 * 60 * 60;
    const secondsInWeek = 7 * 24 * 60 * 60;
    const secondsInHour = 3600;
    const secondsInMinute = 60;

    let remainder = diffSec;

    const years = Math.floor(remainder / secondsInYear);
    remainder -= years * secondsInYear;

    const months = Math.floor(remainder / secondsInMonth);
    remainder -= months * secondsInMonth;

    const weeks = Math.floor(remainder / secondsInWeek);
    remainder -= weeks * secondsInWeek;

    const hours = Math.floor(remainder / secondsInHour);
    remainder -= hours * secondsInHour;

    const minutes = Math.floor(remainder / secondsInMinute);
    remainder -= minutes * secondsInMinute;

    const seconds = remainder;

    statsText = `Weeks lived: ${weeksLived}\nTime remaining: ${years} years, ${months} months, ${weeks} weeks, ${hours} hours, ${minutes} minutes, ${seconds} seconds.`;
  }
  return statsText;
}

// Add this route to your Express app (e.g., in server.js)
// Add this route to your Express app (e.g., in server.js)
app.get("/api/test-email", async (req, res) => {
  try {
    // Fake sample data
    const fakeUserData = {
      email: "infoicpasyl@gmail.com",
      lifeExpectancy: 80,
      timeRemaining: "10 years, 2 months, 3 weeks, 5 days, 12 hours, 30 minutes, 15 seconds"
    };

    const randomIndex = Math.floor(Math.random() * quotes.length);
    const randomQuote = quotes[randomIndex];

    // Compose email content as specified
    const emailText = `Hello, you have lived another day on earth.
If you expect to live ${fakeUserData.lifeExpectancy} years then you have ${fakeUserData.timeRemaining}.
Spend it wisely.
Here is a quote for you:
"${randomQuote.quote}" - ${randomQuote.source}
`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: fakeUserData.email,
      subject: "Test Email from Your Life App with Daily Quote",
      text: emailText,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Test email sent to ${fakeUserData.email}`);
    res.json({ success: true, message: `Test email sent to ${fakeUserData.email}` });
  } catch (error) {
    console.error("Error sending test email:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// Daily cron job to send emails at 8:00 AM server time
cron.schedule("0 8 * * *", async () => {
  try {
    const users = await User.find({ subscribed: true });
    for (const user of users) {
      const stats = calculateStats(user.dob, user.lifeExpectancy);

      // Pick a random quote from the array
      const randomIndex = Math.floor(Math.random() * quotes.length);
      const randomQuote = quotes[randomIndex];

       // Compose the email content in the specified format
       const emailText = `Hello, you have lived another day on earth.
       If you expect to live ${user.lifeExpectancy} years, then you have only:
       ${stats} remaining.
       Spend it wisely.
       Here is a quote for you:
       "${randomQuote.quote}" - ${randomQuote.source}`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Your Daily Life Stats",
        text: emailText,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${user.email}`);
    }
  } catch (error) {
    console.error("Error sending daily emails:", error);
  }
});

// Start the Express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
