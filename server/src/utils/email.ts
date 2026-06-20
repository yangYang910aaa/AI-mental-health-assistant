import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.qq.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true, // 465 端口用 SSL
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

/**
 * 发送密码重置验证码
 * @param to    收件人邮箱
 * @param code  6 位数字验证码
 */
export async function sendResetEmail(to: string, code: string): Promise<void> {
  const html = `
    <div style="max-width: 480px; margin: 0 auto; font-family: sans-serif;">
      <h2 style="color: #2c3e2d;">AI 心理健康助手 — 重置密码</h2>
      <p style="color: #374151;">你申请了密码重置，验证码如下：</p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="display: inline-block; padding: 14px 36px; background: #f0ede6; color: #2c3e2d;
                     font-size: 28px; font-weight: 700; letter-spacing: 8px; border-radius: 10px;
                     border: 1px dashed #c4bfb4;">
          ${code}
        </span>
      </div>
      <p style="color: #9ca3af; font-size: 13px;">此验证码 15 分钟内有效，请勿转发给他人。</p>
    </div>`
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: 'AI 心理健康助手 — 重置密码',
    html,
  })
}
