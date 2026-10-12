import { ImageResponse } from "next/og";

export const alt = "BooksBox — ton journal de lecture";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          color: "#f4f1e8",
          background: "linear-gradient(135deg, #101923 0%, #090d12 70%)"
        }}
      >
        <div style={{ color: "#65e6bd", fontSize: 28, fontWeight: 800, letterSpacing: 8 }}>BOOKSBOX</div>
        <div style={{ marginTop: 28, maxWidth: 900, fontSize: 72, lineHeight: 1.05, fontWeight: 900 }}>
          Toutes tes lectures, une histoire à la fois.
        </div>
        <div style={{ marginTop: 34, fontSize: 30, color: "#aab5c0" }}>
          Journal de lecture · recommandations · communauté
        </div>
      </div>
    ),
    size
  );
}
