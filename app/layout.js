import "./globals.css";

export const metadata = {
  title: "墨韵智创——AI辅助书法生成艺术平台",
  description: "AI赋能书法知识学习、作品生成、装框预览与展示",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
