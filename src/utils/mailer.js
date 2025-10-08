const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD
  }
});

async function sendMail(to, subject, text, attachments = []) {
  try {
    await transporter.sendMail({
      from: `"Masjid App" <${process.env.MAIL_FROM_ADDRESS}>`,
      to,
      subject,
      text,
      attachments
    });
    console.log('Email sent successfully!');
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

module.exports = sendMail;
