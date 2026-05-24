export const SEND_ORDER_CONFIRMATION_EMAIL_JOB = 'send-order-confirmation-email';

export interface SendOrderConfirmationEmailJobData {
  orderId: string;
  userId: number;
}
