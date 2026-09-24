import { Result, Spin } from "antd";
import { useSession } from "next-auth/react";

const AgencyUserOnly = ({ children }) => {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return <div style={{ minHeight: 320, display: "grid", placeItems: "center" }}><Spin size="large" /></div>;
    }

    if (session?.user?.is_admin) {
        return (
            <Result
                status="403"
                title="Agency user area"
                subTitle="This page is available to submitting-agency users. Use Reference Data for administration."
            />
        );
    }

    return children;
};

export default AgencyUserOnly;
