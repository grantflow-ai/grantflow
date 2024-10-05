"use client";

import {Logo} from "@/components/logo";
import {ThemeToggle} from "@/components/theme-toggle";
import {PagePath} from "@/enums";
import {getEnv} from "@/utils/env";
import {getBrowserClient} from "@/utils/supabase/client";
import {EnterIcon, ExitIcon, HomeIcon} from "@radix-ui/react-icons";
import {Button} from "gen/ui/button";
import {usePathname, useRouter} from "next/navigation";


export function Navbar({isSignedIn}: { isSignedIn: boolean }) {
    const pathname = usePathname();
    const router = useRouter();
    const client = getBrowserClient();

    return (
        <nav
            className="px-4 bg-muted flex h-16 items-center justify-between sm:space-x-0 w-full"
            data-testid="navbar"
        >
            <div
                className="bg-slate-100 dark:bg-slate-900 dark:border-slate-700 light:border-slate-200 cursor-pointer border-2 rounded-lg p-1"
                onClick={() => {
                    router.push(PagePath.ROOT);
                }}
            >
                <Logo data-testid="navbar-logo"/>
            </div>
            <div className="flex flex-1 gap-3 items-center justify-end" data-testid="navbar-actions">
                {pathname !==  PagePath.ROOT as string && <Button
                    variant="outline"
                    size="sm"
                    className="bg-inherit dark:border-slate-700"
                >
                    <HomeIcon className="h-5 w-5" />
                </Button>}
                {getEnv().NEXT_PUBLIC_IS_DEVELOPMENT && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-inherit dark:border-slate-700"
                        onClick={async () => {
                            if (isSignedIn) {
                                await client.auth.signOut();
                                router.push(PagePath.ROOT);
                            } else {
                                router.push(PagePath.AUTH);
                            }
                        }}
                    >
                        {isSignedIn ? <ExitIcon className="h-5 w-5"/> : <EnterIcon className="h-5 w-5"/>}
                    </Button>
                )}
                <ThemeToggle data-testid="navbar-theme-toggle"/>
            </div>
        </nav>
    );
}
