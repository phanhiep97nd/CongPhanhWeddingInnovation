import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <main className="landing">
      <nav className="topbar" aria-label="Điều hướng chính">
        <Link className="brand" to="/">Thiệp Cưới
        </Link>
        <div>
          <Link to="/login" aria-label="Đăng nhập tài khoản">Đăng nhập
          </Link>
          <Link className="button" to="/register">Tạo thiệp miễn phí
          </Link>
        </div>
      </nav>
      <section className="landing-hero">
        <div className="landing-copy">
          <h1>Một lời mời dành riêng cho từng người thương
          </h1>
          <p>Kể câu chuyện của hai bạn bằng ảnh và lời riêng. Gửi đường dẫn có tên từng khách, nhận xác nhận tham dự và cùng lưu ảnh sau ngày vui.
          </p>
          <div className="actions">
            <Link className="button" to="/register">Tạo thiệp miễn phí
            </Link>
            <Link className="text-button" to="/login">Đăng nhập
            </Link>
          </div>
        </div>
        <div className="landing-preview" aria-label="Bản xem trước thiệp cưới">
          <img src="/images/DSCF7944.jpg" alt="Ảnh cưới trong bản xem trước thiệp" />
          <div className="landing-preview-copy">
            <p>Trân trọng kính mời chị Thu Hà
            </p>
            <h2>Phương Anh
              <span>&amp;
              </span> Minh Công
            </h2>
            <p>03 · 04 · 2026
            </p>
          </div>
        </div>
      </section>
      <section className="landing-story">
        <h2>Thiệp đi cùng ngày cưới
        </h2>
        <div>
          <p>
            <strong>Mời đúng người.
            </strong> Mỗi khách có một liên kết riêng và nhìn thấy tên mình ngay khi mở thiệp.
          </p>
          <p>
            <strong>Biết ai sẽ đến.
            </strong> Khách xác nhận tham dự trên thiệp; danh sách được cập nhật cho hai bạn.
          </p>
          <p>
            <strong>Giữ trọn khoảnh khắc.
            </strong> Bật hoặc ẩn từng phần của thiệp, rồi đón ảnh khách gửi vào cùng một nơi.
          </p>
        </div>
      </section>
    </main>
  );
}
