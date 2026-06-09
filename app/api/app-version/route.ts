import { NextResponse } from "next/server";

function getAppVersion() {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_DEPLOYMENT_ID ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID ??
    "dev"
  );
}

export async function GET() {
  return NextResponse.json(
    { version: getAppVersion() },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    },
  );
}
