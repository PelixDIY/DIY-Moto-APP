import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  async notifyOrderReady(orderId: string, clientId: string) {
    console.log(`[Notifications] Notified client ${clientId} that order ${orderId} is READY.`);
    // TODO: WhatsApp integration later
  }

  async notifyOrderCompleted(orderId: string, clientId: string) {
    console.log(`[Notifications] Notified client ${clientId} that order ${orderId} is COMPLETED.`);
    // TODO: WhatsApp integration later
  }
}
