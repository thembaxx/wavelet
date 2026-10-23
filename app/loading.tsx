import Image from "next/image";

export default function Loading() {
  return (
    <main className="app-loading" aria-busy="true" aria-label="Loading Wavelet">
      <div className="loading-wordmark">
        <Image src="/brand/wavelet-icon-96.webp" alt="" width={44} height={44} unoptimized />
        <span>wavelet.</span>
      </div>
      <div className="loading-center">
        <div className="loading-record" />
        <p role="status">Getting your studio ready…</p>
      </div>
      <div className="loading-dock">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
