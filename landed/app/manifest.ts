import type { MetadataRoute } from "next";

// Installable on a phone home screen; also what web push (price alerts) needs.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "到手價 Landed — 真正送到你門口嘅最平價",
    short_name: "到手價",
    description: "Compare the delivered-to-Hong-Kong price across online shops and HK supermarkets.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#047857",
    lang: "zh-HK",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "超市格價", url: "/supermarket" },
      { name: "我的購物籃", url: "/basket" },
    ],
  };
}
