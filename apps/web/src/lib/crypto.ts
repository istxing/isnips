/**
 * iSnips 端到端加密与密钥管理工具
 * 遵循 Master Key + Recovery Key 体系架构
 */
export class RecoveryKeyManager {
  /**
   * 生成 24 字符格式化的高熵恢复密钥 (Recovery Key)
   * 格式: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
   */
  public static generateRecoveryKey(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let raw = '';
    for (let i = 0; i < 24; i++) {
      const randIndex = Math.floor(Math.random() * chars.length);
      raw += chars[randIndex];
    }
    const chunks = raw.match(/.{1,4}/g) || [];
    return chunks.join('-');
  }

  /**
   * 校验 Recovery Key 格式合法性
   */
  public static validateRecoveryKey(key: string): boolean {
    const cleaned = key.replace(/[^A-Z0-9]/gi, '');
    return cleaned.length === 24;
  }

  /**
   * 客户端本地端到端加密展示/脱敏辅助函数
   */
  public static maskPrivateContent(content: string): string {
    return `🔒 [端到端加密密文 - 长度 ${content.length} 字节 - 需 Master Key 解密]`;
  }
}
