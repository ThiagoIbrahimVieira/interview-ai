import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "InterviewAI - AI Interview Training Platform",
  description: "AI-powered interview training platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#09090B" />
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
