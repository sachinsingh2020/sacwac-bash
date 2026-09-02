import './globals.css';

export const metadata = {
  title: 'Birthday Bloom',
  description: 'A little universe made just for you.'
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
