import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { TenantProvider } from "@/lib/TenantContext";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "PS CAFE PRO",
  description: "Advanced PlayStation Cafe Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased text-foreground bg-background">
        <LanguageProvider>
          <TenantProvider>
            <ThemeProvider>
              <AppShell>{children}</AppShell>
            </ThemeProvider>
          </TenantProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
