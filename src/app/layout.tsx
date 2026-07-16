import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CommandPalette } from "@/components/CommandPalette";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VibeCraft | AI Image Enhancement Studio",
  description: "A hybrid architecture AI studio utilizing WebGPU local inference, Cloudflare Edge, and Hugging Face CPU spaces.",
  metadataBase: new URL('https://vibecraft.vercel.app'), // Replace with actual domain when deployed
  openGraph: {
    title: "VibeCraft | AI Image Enhancement Studio",
    description: "A hybrid architecture AI studio utilizing WebGPU local inference, Cloudflare Edge, and Hugging Face CPU spaces.",
    url: "https://vibecraft.vercel.app",
    siteName: "VibeCraft",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "VibeCraft AI Studio",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeCraft | AI Image Enhancement Studio",
    description: "A hybrid architecture AI studio utilizing WebGPU local inference, Cloudflare Edge, and Hugging Face CPU spaces.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} bg-[#06060e] text-slate-200 min-h-screen flex flex-col antialiased`}>
        <Navbar />
        <CommandPalette />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                if ('${process.env.NODE_ENV}' === 'production') {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                } else {
                  // Unregister any stale service workers in development
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for(let registration of registrations) {
                      registration.unregister();
                    }
                  });
                }
              });
            }
          `
        }} />
      </body>
    </html>
  );
}
