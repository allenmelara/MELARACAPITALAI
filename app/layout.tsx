import "./globals.css";

export const metadata = {
  title: "Melara Capital AI",
  description: "AI-powered finance analysis workspace"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
