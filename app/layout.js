import { Fredoka, Caveat, Inter } from "next/font/google";
import TrackVisit from "../components/TrackVisit";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "Magic Moments",
  description: "A little universe made just for you.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ffd6e1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${fredoka.variable} ${caveat.variable} ${inter.variable}`}>
        <TrackVisit />
        {children}
      </body>
    </html>
  );
}
