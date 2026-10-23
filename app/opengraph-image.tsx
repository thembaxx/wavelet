import { renderSocialImage } from "@/lib/social-image";

export const alt = "Wavelet. Little clips. Big music energy. The music guessing game.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderSocialImage();
}
