export interface SmtpConfig {
  on?: boolean,
  host?: string
  port?: string
  username?: string
  password?: string
  sender?: string
  newsletterSender?: string
  senderName?: string
}

export const GLOBAL_SETTINGS_SMTP_BOOLEAN_MAPPING = {
  on: "SMTP_ON"
}

export const GLOBAL_SETTINGS_SMTP_STRING_MAPPING = {
  host: "SMTP_HOST",
  port: "SMTP_PORT",
  username: "SMTP_USERNAME",
  password: "SMTP_PASSWORD",
  sender: "SMTP_SENDER",
  newsletterSender: "SMTP_NEWSLETTER_SENDER",
  senderName: "SMTP_SENDER_NAME",
}
