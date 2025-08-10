import React from 'react';

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-10">
      <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Task Manager — Built with React and Node.</p>
      </div>
    </footer>
  );
}

export default Footer;