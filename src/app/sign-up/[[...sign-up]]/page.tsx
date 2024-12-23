import Image from "next/image";
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 relative text-white">
                <aside className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-blue-500 to-blue-700">
                <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-4xl font-black">Welcome to CodeArio AI</h1>
          <p className="text-xl text-center font-bold mt-4">CodeArio AI</p>
          <p className="text-lg text-center mt-2">CodeArio AI</p>
        </div>
      </aside>
      <aside className="absolute top-0 right-0 w-1/2 h-full">
      <div className="flex flex-col items-center justify-center h-full space-y-8">
        <SignUp />
        </div>
    </aside>
    </div>
  );
}