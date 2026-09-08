import Link from 'next/link';

export const metadata = { title: 'Chính sách bảo mật – Lớp Học' };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-800">
      <Link href="/" className="text-sm text-brand-700 hover:underline">
        ← Trang chủ
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Chính sách bảo mật</h1>
      <p className="mt-2 text-sm text-slate-500">Bản nháp – sẽ hoàn thiện trước khi phát hành.</p>
      <div className="mt-6 space-y-4 text-slate-700">
        <p>
          Dữ liệu học sinh là dữ liệu của trẻ em. Hệ thống chỉ lưu tên, lớp, trạng thái điểm danh và
          điểm số; không thu thập email, số điện thoại hay thông tin định danh khác của học sinh. Số
          điện thoại phụ huynh (nếu giáo viên nhập) được lưu nhưng chưa dùng cho bất kỳ tính năng
          nào.
        </p>
        <p>
          Dữ liệu được lưu trữ tại máy chủ đặt ở Singapore. Giáo viên có thể xóa lớp và toàn bộ dữ
          liệu liên quan bất kỳ lúc nào trong mục Cài đặt lớp.
        </p>
        <p>
          Chúng tôi dùng cookie chỉ để duy trì phiên đăng nhập và ghi nhận thiết bị của học sinh khi
          tham gia lớp.
        </p>
      </div>
    </main>
  );
}
