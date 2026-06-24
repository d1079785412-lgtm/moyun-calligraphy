import "./globals.css";

export const metadata = {
  title: "墨韵智创——书法生成艺术平台",
  description: "书法知识学习、作品生成与作品展示",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
