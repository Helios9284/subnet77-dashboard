'use client';
import Link from "next/link";
import { FaHome } from "react-icons/fa";
import { PiCurrencyEth } from "react-icons/pi";
import { GiWeight } from "react-icons/gi";
import { GiHamburgerMenu } from "react-icons/gi";

export const Navigation = () => {

  return (
    <>
    <nav className="  z-0 h-[50px] mt-17 p-4 bg-gray-800 text-white text-start fixed top-0 left-0 w-full lg:flex flex-col justify-self-start">
      <ul className="flex justify-center space-x-2  px-4">
        <div className="flex space-x-2 items-center">
          <div className="text-blue-400"><FaHome size="1.3em" /></div>
          <Link href = '/' className="hover:text-blue-400 cursor-pointer" >Total</Link>
        </div>
        <div className="flex space-x-2 items-center">
          <div className="text-amber-500"><PiCurrencyEth size="1.5em" /></div>
          <Link href = '/mypool' className="hover:text-blue-400 cursor-pointer" >My Pool</Link>
        </div>
        <div className="flex space-x-2 items-center">
          <div className="text-green-700"><GiWeight size="1.5em" /></div>
          <Link href = '/poolweight' className="hover:text-blue-400 cursor-pointer" >Pool Weight</Link>
        </div>
      </ul>
    </nav>
    <nav className="hidden  z-0 w-[200px] mt-17 p-4 bg-gray-800 text-white text-start fixed top-0 left-0 h-full lg:flex flex-col justify-self-start">
      <ul className="flex flex-col py-10  space-y-15  px-4">
        <div className="flex space-x-2 items-center">
          <div className="text-blue-400"><FaHome size="1.3em" /></div>
          <Link href = '/' className="hover:text-blue-400 cursor-pointer" >Total</Link>
        </div>
        <div className="flex space-x-2 items-center">
          <div className="text-amber-500"><PiCurrencyEth size="1.5em" /></div>
          <Link href = '/mypool' className="hover:text-blue-400 cursor-pointer" >My Pool</Link>
        </div>
        <div className="flex space-x-2 items-center">
          <div className="text-green-700"><GiWeight size="1.5em" /></div>
          <Link href = '/poolweight' className="hover:text-blue-400 cursor-pointer" >Pool Weight</Link>
        </div>
      </ul>
    </nav>
    </>
    

  );
}