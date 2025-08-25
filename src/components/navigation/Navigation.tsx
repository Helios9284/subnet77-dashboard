'use cLinkent';
import Link from "next/link";

export const Navigation = () => {

  return (
    <nav className="w-[200px] mt-17 p-4 bg-gray-600 text-white text-start fixed top-0 left-0 h-full flex flex-col justify-self-start">
      <ul className="flex flex-col space-y-8  px-4">
        <Link href = '/' className="hover:text-blue-400 cursor-pointer" >Total</Link>
        <Link href = '/mypool' className="hover:text-blue-400 cursor-pointer" >My Pool</Link>
        <Link href = '/' className="hover:text-blue-400 cursor-pointer" >Total Pool Weight</Link>
      </ul>
    </nav>
  );
}