import "./globals.css";

export const metadata = {
  title: "Ways Tamvanz | Payment Gateway",
  description: "QRIS Dinamis & Withdrawal Gateway by Ways Tamvanz",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen">
        <div className="max-w-md mx-auto min-h-screen px-4 py-8">
          {children}
        </div>
      </body>
    </html>
  );
}
