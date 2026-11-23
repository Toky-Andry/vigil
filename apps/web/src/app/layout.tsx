import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vigil — Know before it breaks",
  description: "Monitoring de serveurs avec détection d'anomalies",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="bg-bg font-sans text-text antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
