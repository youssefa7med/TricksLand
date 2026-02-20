import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import { RecoveryRedirect } from '@/components/auth/RecoveryRedirect';
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TricksLand Steam Academy",
  description: "Session tracking and invoicing system for TricksLand Steam Academy coaches",
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Ensure locale is valid or fallback? Middleware handles verification mostly.

  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const fontClass = locale === 'ar' ? cairo.variable : inter.variable;

  return (
    <html lang={locale} dir={dir} className={fontClass}>
      <body className="bg-animated-gradient min-h-screen">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <RecoveryRedirect />
          {children}
        </NextIntlClientProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
