import React from "react";
import { IoMdMenu } from "react-icons/io";
import { motion } from "framer-motion";


const Navbar = () => {
  return (
    <nav className="relative z-20 h-25">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="container py-10 flex justify-between items-center"
      >
        {/* Logo section */}
        <div>
          <img
          src="https://media.discordapp.net/attachments/1322668786070847608/1322701061462425741/TheBridgeLogo.png?ex=6771d4db&is=6770835b&hm=cd23400717c8dbeeb79309db7a20831138fc166757f52dc3feb1ddb0162758bb&=&format=webp&quality=lossless"
          alt="9antra the bridge"
          className="w-60 h-20 object-cover "
        />
        </div>
        {/* Menu section */}
        <div className="hidden lg:block">

        </div>
        {/* Mobile Hamburger menu section */}
        <div className="lg:hidden">
          <IoMdMenu className="text-4xl" />
        </div>
      </motion.div>
    </nav>
  );
};

export default Navbar;
