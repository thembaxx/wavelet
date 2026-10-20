import Link from 'next/link';

export default function NotFound() {
  return <main className="app-message"><h1>This groove goes nowhere.</h1><p>Head back to your studio and start a fresh set.</p><Link href="/" className="app-home-link">Back to Wavelet</Link></main>;
}
