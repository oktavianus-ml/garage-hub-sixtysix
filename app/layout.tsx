import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AmbientWash } from "@/components/theme/ambient-wash";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: {
    default: "GarageHub",
    template: "%s · GarageHub",
  },
  description: "Mini ERP bengkel motor dan toko sparepart.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className={`${jakarta.className} min-h-full`}>
        <AmbientWash />
        <div className="relative z-10">
          <ThemeProvider>{children}</ThemeProvider>
        </div>
      </body>
    </html>
  );
}
