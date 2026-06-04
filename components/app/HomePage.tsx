import { UserButton } from "@clerk/nextjs";
import Image from "next/image";
import logo from "@/public/logo.svg";

export default function HomePage() {
  return (
    <div className="flex flex-col p-4">
      <div className="flex items-center justify-between">
        <Image src={logo} alt="Tandem logo" className="w-8 h-8" />
        <UserButton />
      </div>
    </div>
  );
}
