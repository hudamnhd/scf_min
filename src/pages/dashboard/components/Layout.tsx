
import { authStore } from '@/states/auth.state';
// import { Navbar } from 'flowbite-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Layout({ children, path }) {
    const { isOwner } = authStore()
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        
        setIsMounted(true)
    }, [isOwner])
    if (!isMounted) {
        return (
            <div className="flex flex-row justify-center ">
                <div className="flex  flex-col justify-center w-10/12">
{/*                    <Navbar
                        className='bg-slate-700 text-white'
                        fluid
                        rounded>
                        <Navbar.Brand

                            href="/dashboard"
                        >
                            <span><strong>Suplay Chain Management</strong></span>
                        </Navbar.Brand>
                        <Navbar.Toggle />

                    </Navbar>*/}
                    <div className="flex flex-col bg-white p-8">
                        {children}
                    </div>
                </div>
            </div>
        )
    }
    return (
        <div className="flex flex-row justify-center ">
            <div className="flex  flex-col justify-center w-10/12">
{/*                <Navbar
                    className='bg-slate-700 text-white'
                    fluid
                    rounded
                >
                    <Navbar.Brand

                        href="https://flowbite-react.com"
                    >
                        <span><strong>Suplay Chain Management</strong></span>
                    </Navbar.Brand>
                    <Navbar.Toggle />
                    <Navbar.Collapse >
                        <Navbar.Link
                            active

                        >
                            <Link href="/dashboard">
                                <p className={(path === "/dashboard") ? `text-yellow-200` : 'text-gray-200'}>
                                    Dashboard
                                </p>
                            </Link>
                        </Navbar.Link>
                        {(isOwner) ? (
                            <Navbar.Link
                                active>
                                <Link href="/role-management">
                                    <p className={(path === "/role-management") ? `text-yellow-200` : 'text-gray-200'}>
                                        Role Management
                                    </p>
                                </Link>
                            </Navbar.Link>
                        ) : <></>}
                        <Navbar.Link href="#">
                            <Link href={"/history"}>
                                <p className={(path === "/history") ? `text-yellow-200` : 'text-gray-200'}>History</p>
                            </Link>
                        </Navbar.Link>
                    </Navbar.Collapse>
                </Navbar>*/}
                <div className="flex flex-col bg-white p-8">
                    {children}
                </div>
            </div>
        </div>
    )
}


