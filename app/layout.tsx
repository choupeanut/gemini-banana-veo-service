import type { Metadata } from "next";
import { Manrope, Source_Code_Pro } from "next/font/google";

import "./globals.css";

// Google Font
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-code-pro",
});

export const metadata: Metadata = {
  title: "Gemini API Studio",
  description: "A quickstart for the Gemini API with Veo 3",
  icons: {
    icon: "/imgs/gemini_icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark"> 
      <body className={`${manrope.variable} ${sourceCodePro.variable} min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary`}>
          <main className="min-h-screen relative overflow-hidden">
             {/* Background Effects */}
             <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[120px]" />
             </div>
             {children}
          </main>
      </body>
    </html>
  );
}