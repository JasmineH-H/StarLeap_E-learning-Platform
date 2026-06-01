import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendGridMail = sgMail;

export const emailConfig = {
  fromEmail: process.env.SENDGRID_FROM_EMAIL || "anranlyu@gmail.com",
  fromName: process.env.APP_NAME || "StarLeap",
};
