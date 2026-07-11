import "./globals.css";
import SiteAssistant from "@/components/SiteAssistant";

export const metadata = {
  title: "Melara Capital AI",
  description: "AI-powered finance analysis workspace"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <SiteAssistant />
      </body>
    </html>
  );
}
