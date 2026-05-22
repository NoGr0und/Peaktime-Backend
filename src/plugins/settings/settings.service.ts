import { prisma } from '../../lib/prisma.js';

export const SettingsService = {
  async registerPushToken(userId: string, token: string) {
    return prisma.pushToken.upsert({
      where: { token },
      update: { userId },
      create: { userId, token }
    });
  },

  async sendNotification(userId: string, title: string, body: string, data?: any) {
    const tokens = await prisma.pushToken.findMany({ where: { userId } });
    if (tokens.length === 0) return;

    const messages = tokens.map(t => ({
      to: t.token,
      sound: 'default',
      title,
      body,
      data
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  }
};
