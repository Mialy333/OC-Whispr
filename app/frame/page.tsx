import { Suspense } from 'react';
import type { Metadata } from 'next';
import FrameClient from './FrameClient';

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim();

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; severity?: string }>;
}): Promise<Metadata> {
  const { ref, severity } = await searchParams;

  const launchUrl =
    ref === 'cast' && severity
      ? `${appUrl}/frame?ref=cast&severity=${severity}`
      : `${appUrl}/frame`;

  return {
    other: {
      'fc:frame': JSON.stringify({
        version: 'next',
        imageUrl: `${appUrl}/icon.png`,
        button: {
          title: 'Open Alpha Whispr',
          action: {
            type: 'launch_frame',
            name: 'Alpha Whispr',
            url: launchUrl,
            splashImageUrl: `${appUrl}/splash.png`,
            splashBackgroundColor: '#F2ECDF',
          },
        },
      }),
    },
  };
}

export default function FramePage() {
  return (
    <Suspense>
      <FrameClient />
    </Suspense>
  );
}
