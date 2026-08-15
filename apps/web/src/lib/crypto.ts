export class RecoveryKeyManager {
  static generateRecoveryKey(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const blocks: string[] = [];
    for (let i = 0; i < 4; i++) {
      let block = '';
      for (let j = 0; j < 4; j++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        block += chars[randomIndex];
      }
      blocks.push(block);
    }
    return `ISNIP-${blocks.join('-')}`;
  }

  static validateFormat(key: string): boolean {
    return /^ISNIP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key);
  }
}
