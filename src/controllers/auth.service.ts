import * as nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD
  }
});

async function sendMail(to: string, subject: string, text: string) {
  await transporter.sendMail({
    from: `"NYC2025" <${process.env.MAIL_FROM_ADDRESS}>`,
    to,
    subject,
    text
  });
  console.log('Email sent successfully!');
}
