import React, { useState } from "react";
import Image from "next/image";
import style from "./AppLayout.module.scss";
import { Layout, theme, Typography } from "antd";
import AppMenu from "@/components/AppLayout/AppMenu";
import AppAvatar from "@/components/AppLayout/AppAvatar";
import ViewHeader from "@/components/ViewHeader/ViewHeader";
import { ViewHeaderExtraProvider } from "@/components/ViewHeader/ViewHeaderContext";
const { Header, Sider, Content, Footer } = Layout;

const AppLayout = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [viewHeaderExtra, setViewHeaderExtra] = useState(null);
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    return (
        <ViewHeaderExtraProvider value={setViewHeaderExtra}>
            <Layout style={{ minHeight: '100vh' }}>
                <Sider
                    collapsible
                    collapsed={collapsed}
                    onCollapse={setCollapsed}
                    width={280}
                    className={style.Sider}
                >
                    <div className={style.Logo}>
                        <Image src="/images/deqar-logo.png" alt="DEQAR" width={110} height={34} priority />
                        {!collapsed && <span>Admin</span>}
                    </div>
                    <div className={style.Menu}>
                        <AppMenu />
                    </div>
                </Sider>
                <Layout>
                    <Header className={style.Header} style={{ background: colorBgContainer }}>
                        <Typography.Text type="secondary">Database of External Quality Assurance Results</Typography.Text>
                        <AppAvatar />
                    </Header>
                    <Content className={style.Content}>
                        <div className={style.Breadcrumb}>
                            <ViewHeader extra={viewHeaderExtra} />
                        </div>
                        <main
                            className={style.ContentPanel}
                            style={{
                                background: colorBgContainer,
                                borderRadius: borderRadiusLG,
                            }}
                        >
                            {children}
                        </main>
                    </Content>
                    <Footer className={style.Footer}>European Quality Assurance Register for Higher Education</Footer>
                </Layout>
            </Layout>
        </ViewHeaderExtraProvider>
    );
};

export default AppLayout;
