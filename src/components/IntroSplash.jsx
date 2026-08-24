import React from 'react';


// Wordmark intro over the navy field. One authored moment: the Eanes rule draws
// itself between the two halves of the name, then the overlay lifts.
export default function IntroSplash() {
  return (
    <div
      className="intro-splash navy-field fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden px-8"
      aria-hidden="true"
    >
      <h1
        className="intro-word font-heading text-5xl sm:text-6xl lg:text-display font-semibold text-on-navy text-center"
      >
        Chap Connect
      </h1>

      <span
        aria-hidden="true"
        className="intro-rule mt-8 block h-0.5 w-40 bg-accent-navy"
      />

      <p
        className="intro-tag mt-8 text-on-navy-muted"
      >
        The Westlake network
      </p>
    </div>
  );
}
