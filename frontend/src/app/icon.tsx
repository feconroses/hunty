import { ImageResponse } from "next/og"

export const size = {
  width: 32,
  height: 32,
}
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: "#121212",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
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
            bottom: 4,
            right: 4,
            width: 7,
            height: 7,
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
