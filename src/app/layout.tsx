import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "OPC x AI - 基于AI拟真验证的双边OPC能力匹配平台",
  description:
    "首个OPC供需匹配平台。立足真实业务场景，筛选全球AI超级个体。",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <Providers>{children}</Providers>
        <footer className="text-center pt-2 pb-2" style={{ color: "#666", fontSize: "14px" }}>
          © 2026 OPCXAI.COM |{" "}
          <a
            href="https://beian.miit.gov.cn"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#666" }}
          >
            苏ICP备2026013372号
          </a>
        </footer>
      </body>
    </html>
  );
}
