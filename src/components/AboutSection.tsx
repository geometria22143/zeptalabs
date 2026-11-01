import React from 'react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="w-full pt-6 pb-12 border-t border-neutral-200 scroll-mt-20">
      <div className="pb-3 border-b border-neutral-200 mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
          About
        </h2>
      </div>

      <div className="max-w-2xl text-neutral-700 text-sm sm:text-base leading-relaxed space-y-4">
        <p>
          Welcome to ZeptaLabs News &amp; Updates.
        </p>
        <p>
          We created this page to share our latest news, notices, and important updates directly
          with our community. Whenever there is something new to announce, you will find it here first.
        </p>
        <p>
          Thank you for visiting, and feel free to check back regularly.
        </p>
      </div>
    </section>
  );
};
