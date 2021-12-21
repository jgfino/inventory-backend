import nodemailer from "nodemailer";
import ErrorResponse from "../error/ErrorResponse";
import HttpError from "../error/ErrorResponse";
import { EmailTemplate } from "./templates.nodemailer";

/**
 * Sends an email with the given template to the given recipient
 * @param to The receipient's email.
 * @param template The email template to use.
 */
export const sendMail = async (to: string, template: EmailTemplate) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.NODEMAIL_EMAIL,
      pass: process.env.NODEMAIL_PASSWORD,
    },
  });

  const options = {
    from: process.env.NODEMAIL_EMAIL,
    to: to,
    ...template,
  };

  transporter.sendMail(options, (err, info) => {
    if (err) {
      return Promise.reject(
        new ErrorResponse(
          "nodemailer/error",
          500,
          `Error sending email to ${to}`
        )
      );
    }
  });
};
