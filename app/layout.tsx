import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.scss";

import React95Provider from "./components/React95Provider";

export const metadata: Metadata = {
  title: "Ethan95",
  description: "A Windows 95 inspired portfolio website built with Next.js and React95.",
  icons: {
    icon: "/static/icons/w98_computer_explorer.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">
      <body>
        <React95Provider>
          {children}
        </React95Provider>
      </body>
    </html>
  );
}
