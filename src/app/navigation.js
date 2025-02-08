"use client";

import Link from "next/link";
import AuthButton from "./components/AuthButton";

const navigation = [
    {
        name: "Home",
        href: "/",
    },
    {
        name: "About",
        href: "/about",
    },
    {
        name: "Contact Us",
        href: "/contact-us"
    },
];


export default function Navigation() {

    return (
        <div className="flex items-center gap-6 my-3 text-xl text-white">
            {navigation.map((item) => (
                <Link href={item.href} key={item.name}>{item.name}</Link>
            ))}
            <AuthButton />
        </div>
    );
}

{/* <button onClick={() => signIn()}>Login</button> */ }
