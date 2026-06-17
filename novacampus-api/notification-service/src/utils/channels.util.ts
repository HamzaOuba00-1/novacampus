/**
 * utils/channels.util.ts
 * ---------------------------------------------------------------
 * Implémentations des canaux d'envoi de notifications.
 *
 * En développement : simulation par logs console.
 * En production    : remplacer les fonctions par les vrais SDKs :
 *   – Email : Nodemailer + SMTP, SendGrid, Brevo
 *   – SMS   : Twilio, OVH SMS, Vonage
 *   – Push  : Firebase Cloud Messaging (FCM)
 *
 * L'interface commune (sendEmail, sendSms) garantit que le
 * NotificationService peut appeler ces fonctions sans connaître
 * le fournisseur sous-jacent.
 * ---------------------------------------------------------------
 */

// ---------------------------------------------------------------
// EMAIL
// ---------------------------------------------------------------

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

/**
 * Envoie un email de notification.
 * En dev : log console. En prod : appel SMTP réel.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { NODE_ENV, SMTP_HOST, EMAIL_FROM } = process.env;

  if (NODE_ENV !== 'prod') {
    // Simulation développement
    console.log(`[Email SIMULATION]`);
    console.log(`  From    : ${EMAIL_FROM ?? 'no-reply@novacampus.fr'}`);
    console.log(`  To      : ${options.to}`);
    console.log(`  Subject : ${options.subject}`);
    console.log(`  Body    : ${options.body.substring(0, 120)}...`);
    return true;
  }

  // ── Production : remplacer par Nodemailer ──────────────────
  // const transporter = nodemailer.createTransport({ host: SMTP_HOST, ... });
  // await transporter.sendMail({ from: EMAIL_FROM, ...options });
  console.warn('[Email] SMTP non configuré en production.');
  return false;
}

// ---------------------------------------------------------------
// SMS
// ---------------------------------------------------------------

export interface SmsOptions {
  to: string;       // Numéro E.164 : +33612345678
  message: string;
}

/**
 * Envoie un SMS de notification.
 * En dev : log console. En prod : appel Twilio/OVH réel.
 */
export async function sendSms(options: SmsOptions): Promise<boolean> {
  const { NODE_ENV, SMS_FROM } = process.env;

  if (NODE_ENV !== 'prod') {
    console.log(`[SMS SIMULATION]`);
    console.log(`  From    : ${SMS_FROM ?? 'NOVACAMPUS'}`);
    console.log(`  To      : ${options.to}`);
    console.log(`  Message : ${options.message.substring(0, 160)}`);
    return true;
  }

  // ── Production : remplacer par Twilio ──────────────────────
  // const client = twilio(TWILIO_SID, TWILIO_TOKEN);
  // await client.messages.create({ from: SMS_FROM, to: options.to, body: options.message });
  console.warn('[SMS] Twilio non configuré en production.');
  return false;
}

// ---------------------------------------------------------------
// PUSH (FCM – Firebase Cloud Messaging)
// ---------------------------------------------------------------

export interface PushOptions {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Envoie une notification push via FCM.
 * En dev : log console. En prod : appel Firebase Admin SDK.
 */
export async function sendPush(options: PushOptions): Promise<boolean> {
  const { NODE_ENV } = process.env;

  if (NODE_ENV !== 'prod') {
    console.log(`[Push SIMULATION]`);
    console.log(`  userId : ${options.userId}`);
    console.log(`  Title  : ${options.title}`);
    console.log(`  Body   : ${options.body}`);
    return true;
  }

  // ── Production : remplacer par Firebase Admin SDK ──────────
  // await admin.messaging().send({ token: fcmToken, notification: { title, body } });
  console.warn('[Push] Firebase Admin non configuré en production.');
  return false;
}
