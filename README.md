# Portfolio Manager

Sổ cái danh mục thuần tài sản (Asset-Only Ledger) + Trade T+.

- Original Capital chỉ đổi qua **Nạp / Rút vốn gốc** trên Dashboard
- NAV = DCDS + ETF + Stock + Crypto + Bank đang hiệu lực
- Trade T+ (Stock VPS/SSI, Crypto): khớp bán thủ công; lãi COMPLETED mới hạ giá vốn gốc
- Bank: nhiều sổ, tên tùy chọn, đáo hạn / tái tục
- UI tiếng Việt, từ khóa giữ nguyên: Dashboard, Stock, ETF, Crypto, DCDS, Bank, Buy, Sell

## Chạy local

```bash
npm install
npm run dev
```

Mở app tại cổng mà Vite in ra (mặc định 8080).

## Production

Cần `DATABASE_URL` (Postgres / Neon). Auth (Google, X, email) dùng biến môi trường Better Auth do nền tảng inject — không commit file `.env`.

```bash
npm run build
```

Sổ cái dùng chung cho mọi tài khoản đã đăng nhập. Không seed dữ liệu giả.

## Spec

Xem [attachments/PORTFOLIO_SPEC_new.md](attachments/PORTFOLIO_SPEC_new.md) (v3.0).
