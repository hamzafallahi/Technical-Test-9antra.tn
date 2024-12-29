import React from "react";

const Hero = () => {
  return (
    <header className="relative h-[600px] bg-gradient-to-r from-gray-900 to-gray-800 text-white">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
          alt="Students learning"
          className="w-full h-full object-cover opacity-20"
        />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Improve your skills on your own
          </h1>
          <p className="mt-4 text-xl text-gray-300">
            To prepare for a better future
          </p>
          <button className="mt-8 bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-md text-lg font-semibold">
            REGISTER NOW
          </button>
        </div>
      </div>
    </header>
  );
};

export default Hero;
