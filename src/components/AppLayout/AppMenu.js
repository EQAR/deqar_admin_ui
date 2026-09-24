import React, { useMemo, useState } from "react";
import { Menu } from "antd";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import menuConfig, { canSeeMenuItem } from "@/config/menu-config";

const isActivePath = (pathname, link) =>
    Boolean(link) && (pathname === link || pathname.startsWith(`${link}/`));

const getActiveTrail = (items, pathname, parents = []) => {
    for (const item of items) {
        const trail = [...parents, item.key];
        const childTrail = item.children
            ? getActiveTrail(item.children, pathname, trail)
            : [];

        if (childTrail.length || isActivePath(pathname, item.link)) {
            return childTrail.length ? childTrail : trail;
        }
    }
    return [];
};

const toMenuItem = (item, isAdmin) => {
    if (!canSeeMenuItem(item, isAdmin)) return null;

    const children = item.children
        ?.map((child) => toMenuItem(child, isAdmin))
        .filter(Boolean);
    const label = item.link
        ? item.external
            ? <a href={item.link} target="_blank" rel="noreferrer noopener">{item.name}</a>
            : <Link href={item.link}>{item.name}</Link>
        : item.name;

    return {
        key: item.key,
        icon: item.icon,
        label,
        disabled: item.disabled,
        ...(children?.length ? { children } : {}),
    };
};

const AppMenu = () => {
    const router = useRouter();
    const { data: session } = useSession();
    const isAdmin = Boolean(session?.user?.is_admin);
    const activeTrail = getActiveTrail(menuConfig, router.pathname);
    const activeOpenKeys = activeTrail.slice(0, -1);
    const [userOpenKeys, setUserOpenKeys] = useState([]);
    const openKeys = [...new Set([...userOpenKeys, ...activeOpenKeys])];

    const menuItems = useMemo(
        () => menuConfig.map((item) => toMenuItem(item, isAdmin)).filter(Boolean),
        [isAdmin],
    );

    return (
        <Menu
            theme="dark"
            mode="inline"
            openKeys={openKeys}
            selectedKeys={activeTrail.slice(-1)}
            onOpenChange={setUserOpenKeys}
            items={menuItems}
        />
    );
};

export default AppMenu;
