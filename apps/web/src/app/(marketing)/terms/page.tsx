import Link from 'next/link';

export const metadata = { title: 'Điều khoản sử dụng – Lớp Học' };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-800">
      <Link href="/" className="text-sm text-brand-700 hover:underline">
        ← Trang chủ
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Điều khoản sử dụng</h1>
      <p className="mt-2 text-sm text-slate-500">Bản nháp – sẽ hoàn thiện trước khi phát hành.</p>
      <div className="prose mt-6 space-y-4 text-slate-700">
        <p>
          Lớp Học là dịch vụ miễn phí dành cho giáo viên để quản lý lớp, điểm danh và kiểm tra đầu
          giờ. Khi tạo tài khoản, bạn đồng ý sử dụng dịch vụ đúng mục đích giáo dục và chịu trách
          nhiệm về dữ liệu học sinh mà bạn đưa vào hệ thống.
        </p>
        <p>
          Bạn xác nhận đã có sự đồng ý của phụ huynh hoặc học sinh khi nhập tên học sinh vào danh
          sách lớp. Hệ thống chỉ lưu tên, lớp, điểm danh và điểm số của học sinh.
        </p>
        <p>
          Chúng tôi có thể thay đổi giới hạn gói miễn phí và tính năng; các thay đổi sẽ được thông
          báo trong ứng dụng.
        </p>
      </div>
    </main>
  );
}
