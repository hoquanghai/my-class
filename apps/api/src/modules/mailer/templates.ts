export interface MailContent {
  subject: string;
  html: string;
  text: string;
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="vi"><body style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;color:#0f172a">
    <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
    ${bodyHtml}
    <p style="font-size:12px;color:#64748b;margin-top:32px">Email tự động từ Lớp Học. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
  </div></body></html>`;
}

function button(link: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${link}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">${label}</a></p>
  <p style="font-size:13px;color:#475569">Hoặc dán liên kết này vào trình duyệt:<br>${link}</p>`;
}

export function verifyEmailTemplate(name: string, link: string): MailContent {
  return {
    subject: 'Xác thực email cho Lớp Học',
    html: layout(
      `Chào ${name},`,
      `<p>Cảm ơn bạn đã đăng ký Lớp Học. Nhấn nút bên dưới để xác thực email (liên kết có hiệu lực 24 giờ).</p>${button(link, 'Xác thực email')}`,
    ),
    text: `Chào ${name},\n\nXác thực email cho Lớp Học bằng liên kết sau (hiệu lực 24 giờ):\n${link}\n`,
  };
}

export function resetPasswordTemplate(name: string, link: string): MailContent {
  return {
    subject: 'Đặt lại mật khẩu Lớp Học',
    html: layout(
      `Chào ${name},`,
      `<p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu. Liên kết có hiệu lực 1 giờ.</p>${button(link, 'Đặt lại mật khẩu')}`,
    ),
    text: `Chào ${name},\n\nĐặt lại mật khẩu Lớp Học bằng liên kết sau (hiệu lực 1 giờ):\n${link}\n`,
  };
}
