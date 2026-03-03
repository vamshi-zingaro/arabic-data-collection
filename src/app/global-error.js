"use client";

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>Something went wrong</h2>
        <p>{error?.message}</p>
        <button onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
