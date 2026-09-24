import { Button, Card, Col, Row, Space, Typography } from "antd";
import { DatabaseOutlined, FileTextOutlined, UploadOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useSession } from "next-auth/react";

const Home = () => {
    const { data: session } = useSession();
    const isAdmin = Boolean(session?.user?.is_admin);

    return (
        <Card>
            <Typography.Title level={2}>DEQAR Administration</Typography.Title>
            <Typography.Paragraph type="secondary">
                Submit quality-assurance reports and maintain DEQAR data.
            </Typography.Paragraph>
            <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                    <Card size="small" title={<Space><FileTextOutlined />Manual submission</Space>}>
                        <Typography.Paragraph>Submit an individual report using the guided form.</Typography.Paragraph>
                        <Link href="/submit-report"><Button type="primary">Submit report</Button></Link>
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card size="small" title={<Space><UploadOutlined />CSV upload</Space>}>
                        <Typography.Paragraph>Validate and ingest reports from a CSV file.</Typography.Paragraph>
                        <Button disabled>Coming next</Button>
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card
                        size="small"
                        title={<Space><DatabaseOutlined />{isAdmin ? "Reference data" : "My data"}</Space>}
                    >
                        <Typography.Paragraph>
                            {isAdmin
                                ? "Browse and maintain shared DEQAR reference records."
                                : "Review and update reports and agencies available to your account."}
                        </Typography.Paragraph>
                        {isAdmin ? (
                            <Space wrap>
                                <Link href="/reference/reports"><Button type="primary">Reports</Button></Link>
                                <Link href="/reference/agencies"><Button>Agencies</Button></Link>
                                <Link href="/reference/countries"><Button>Countries</Button></Link>
                                <Link href="/reference/activities"><Button>Activities</Button></Link>
                                <Link href="/reference/institutions"><Button>Education providers</Button></Link>
                                <Link href="/flags/reports"><Button>Report flags</Button></Link>
                            </Space>
                        ) : (
                            <Space wrap>
                                <Link href="/my-reports"><Button type="primary">My reports</Button></Link>
                                <Link href="/my-agencies"><Button>My agencies</Button></Link>
                            </Space>
                        )}
                    </Card>
                </Col>
            </Row>
        </Card>
    );
};

export default Home;
