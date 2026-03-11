import { ImageResponse } from "next/og"

export const size = {
  width: 180,
  height: 180,
}
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 140,
          background: "#121212",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 36,
          position: "relative",
        }}
      >
        <span
          style={{
            color: "#ffffff",
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          H
        </span>
        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 24,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#1db954",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
