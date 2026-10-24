import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareProof - client-ready website care reports",
  description:
    "Prove your website care retainers with branded, client-ready reports. Point-in-time checks: uptime, SSL, security headers, links and more for every client site, any stack, no plugin.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "CareProof - client-ready website care reports",
    description:
      "Point-in-time health checks and branded client reports for web agencies. Any stack, no plugin.",
    url: "https://careproof-tau.vercel.app",
    siteName: "CareProof",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

const themeBoot = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t="light";}document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
