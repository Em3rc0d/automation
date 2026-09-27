export const metadata = {
  title: "CASE-001 Quote Assistant",
  description: "Private pilot surface for SAP snapshot import and quote automation health.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#f6f7f9", color: "#14171a" }}>
        {children}
      </body>
    </html>
  );
}
