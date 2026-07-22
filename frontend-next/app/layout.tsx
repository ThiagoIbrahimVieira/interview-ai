import type { Metadata } from "next";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "InterviewAI - AI Interview Training Platform",
  description: "AI-powered interview training platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <StoreProvider>
          <ToastProvider>
            <div id="app">{children}</div>
          </ToastProvider>
        </StoreProvider>
        <script src="https://js.puter.com/v2/" defer></script>
      </body>
    </html>
  );
}
