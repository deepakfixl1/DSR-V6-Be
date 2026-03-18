import nodemailer from "nodemailer";
import { config } from "#api/config/env.js";
import { logger } from "#api/utils/logger.js";

export const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass
  }
});

export const verifyEmailTransport = async () => {
  await transporter.verify();
  logger.info("SMTP transport verified");
};

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) {
    logger.error({ to, subject }, "sendEmail called without recipient");
    throw new Error("No recipient defined");
  }

  logger.info({ to, subject }, "Sending email");

  const info = await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    html,
    text
  });

  logger.info(
    {
      to,
      subject,
      messageId: info.messageId
    },
    "Email sent successfully"
  );

  return info;
};

export const emailProvider = {
  send: sendEmail
};
