import { getSession, signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/router";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import Image from "next/image";

export async function getServerSideProps(ctx) {
    const session = await getSession(ctx);
    if (session) {
        return { redirect: { destination: "/", permanent: false } };
    }
    return { props: {} };
}

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function onSubmit(values) {
        setError("");
        setLoading(true);
        const res = await signIn("credentials", {
            redirect: false,
            username: values.username,
            password: values.password,
        });
        if (res?.ok) {
            await router.push(router.query.next?.toString() || "/");
        } else {
            setError("The username or password is incorrect.");
            setLoading(false);
        }
    }

    return (
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16, background: "#f5f5f5" }}>
            <Card style={{ width: "100%", maxWidth: 400 }}>
                <Image src="/images/deqar-logo.png" alt="DEQAR" width={180} height={54} priority style={{ display: "block", margin: "0 auto 24px" }} />
                <Typography.Title level={3}>Sign in</Typography.Title>
                <Typography.Paragraph type="secondary">Use your DEQAR account to continue.</Typography.Paragraph>
                {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
                <Form layout="vertical" onFinish={onSubmit} requiredMark={false}>
                    <Form.Item name="username" label="Username" rules={[{ required: true, message: "Enter your username." }]}>
                        <Input autoComplete="username" autoFocus />
                    </Form.Item>
                    <Form.Item name="password" label="Password" rules={[{ required: true, message: "Enter your password." }]}>
                        <Input.Password autoComplete="current-password" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>Sign in</Button>
                </Form>
            </Card>
        </main>
    );
}

LoginPage.withoutLayout = true;
