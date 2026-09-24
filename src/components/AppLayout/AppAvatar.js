import { Avatar, Dropdown } from "antd";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import style from "./AppAvatar.module.scss";
import {LogoutOutlined, UserOutlined} from "@ant-design/icons";

const AppAvatar = () => {
    const { data: session } = useSession();
    const router = useRouter();
    const user = session?.user;

    if (!user) return null; // no avatar before login

    const initials =
        user.username?.[0]?.toUpperCase() ||
        user.name?.[0]?.toUpperCase() ||
        user.email?.[0]?.toUpperCase() ||
        "?";

    const colorFromString = (str = "") => {
        if (!str) return "#999"; // fallback gray

        // Simple hash
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
            hash |= 0; // Convert to 32bit int
        }

        // Use hash to pick hue (0–360)
        const hue = Math.abs(hash) % 360;

        // You can tweak saturation/lightness to taste
        const saturation = 60;
        const lightness = 55;

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    const items = [
        {
            key: 'title',
            label: `DEQAR Account (${user.username})`,
            disabled: true,
        },
        {
            type: 'divider',
        },
        {
            key: 'profile',
            label: 'Profile',
            icon: <UserOutlined />
        },
        {
            key: 'logout',
            label: 'Logout',
            icon: <LogoutOutlined />
        }
    ]

    const onMenuClick = ({ key }) => {
        if (key === "logout") {
            signOut({ callbackUrl: "/login" });
        }
        if (key === "profile") {
            router.push("/my-profile");
        }
    };

    return (
        <div className={style.Avatar}>
            <div>Hello, {user.username}!</div>
            <Dropdown menu={{ items, onClick: onMenuClick }} trigger={["click"]}>
                <Avatar style={{cursor: 'pointer', backgroundColor: colorFromString(user.username)}}>{initials}</Avatar>
            </Dropdown>
        </div>
    )

}

export default AppAvatar;
