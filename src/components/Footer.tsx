import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-neutral-200 bg-white py-8 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-900">ZeptaLabs</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <nav className="flex items-center space-x-6 text-neutral-600">
            <a href="#news" className="hover:text-black transition-colors">
              News
            </a>
            <a href="#updates" className="hover:text-black transition-colors">
              Updates
            </a>
            <a href="#about" className="hover:text-black transition-colors">
              About
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
};
