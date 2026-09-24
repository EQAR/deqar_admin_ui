import {
    BarChartOutlined,
    DatabaseOutlined,
    FileOutlined,
    FileTextOutlined,
    FlagOutlined,
    GlobalOutlined,
    HomeOutlined,
    InfoCircleOutlined,
    TagsOutlined,
    UploadOutlined,
    UserOutlined,
} from "@ant-design/icons";
import { TbSchool } from "react-icons/tb";

/**
 * A single navigation definition for both administrators and submitting agencies.
 * `audience` can be "all", "admin", or "agency".
 */
const menuConfig = [
    {
        key: "submit-reports",
        name: "Submit Reports",
        icon: <FileOutlined />,
        audience: "all",
        children: [
            {
                key: "/submit-report",
                name: "Manual Submission",
                icon: <FileTextOutlined />,
                link: "/submit-report",
                audience: "all",
            },
            {
                key: "/submit-csv",
                name: "Upload CSV",
                icon: <UploadOutlined />,
                link: "/submit-csv",
                audience: "all",
            },
        ],
    },
    {
        key: "my-data",
        name: "My Data",
        icon: <UserOutlined />,
        audience: "agency",
        children: [
            {
                key: "/my-reports",
                name: "My Reports",
                icon: <FileOutlined />,
                link: "/my-reports",
                audience: "agency",
            },
            {
                key: "/my-agencies",
                name: "My Agencies",
                icon: <HomeOutlined />,
                link: "/my-agencies",
                audience: "agency",
            },
        ],
    },
    {
        key: "reference-data",
        name: "Reference Data",
        icon: <DatabaseOutlined />,
        audience: "all",
        children: [
            {
                key: "/reference/reports",
                name: "Reports",
                icon: <FileOutlined />,
                link: "/reference/reports",
                audience: "all",
            },
            {
                key: "/reference/agencies",
                name: "Agencies",
                icon: <HomeOutlined />,
                link: "/reference/agencies",
                audience: "all",
            },
            {
                key: "/reference/activities",
                name: "Activities",
                icon: <TagsOutlined />,
                link: "/reference/activities",
                audience: "all",
            },
            {
                key: "/reference/institutions",
                name: "Edu. Providers",
                icon: <TbSchool />,
                link: "/reference/institutions",
                audience: "all",
            },
            {
                key: "/reference/countries",
                name: "Countries",
                icon: <GlobalOutlined />,
                link: "/reference/countries",
                audience: "all",
            },
        ],
    },
    {
        key: "/flags/reports",
        name: "Report Flags",
        icon: <FlagOutlined />,
        link: "/flags/reports",
        audience: "admin",
    },
    {
        key: "statistics",
        name: "Statistics",
        icon: <BarChartOutlined />,
        audience: "all",
        disabled: true,
    },
    {
        key: "documentation",
        name: "Documentation",
        icon: <InfoCircleOutlined />,
        link: "https://docs.deqar.eu",
        external: true,
        audience: "all",
    },
];

export const canSeeMenuItem = (item, isAdmin) => {
    if (item.audience === "admin") return isAdmin;
    if (item.audience === "agency") return !isAdmin;
    return true;
};

export default menuConfig;
