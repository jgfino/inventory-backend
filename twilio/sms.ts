import twilioClient from "twilio";
import { SMSTemplate } from "./templates.twilio";

const twilio = twilioClient(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendSMS = async (to: string, template: SMSTemplate) => {
  await twilio.messages.create({
    from: process.env.TWILIO_NUMBER,
    to: to,
    ...template,
  });
};
