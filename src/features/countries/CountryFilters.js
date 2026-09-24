import { useEffect, useRef } from "react";
import { Col, Form, Input, Row, Select } from "antd";
import { asList } from "@/lib/apiData";

const booleanOptions = [
    { label: "Member of EHEA", value: "true" },
    { label: "Not a member of EHEA", value: "false" },
];

const CountryFilters = ({ filters, isAdmin, permissionTypes = [], onChange }) => {
    const [form] = Form.useForm();
    const searchTimer = useRef(null);

    useEffect(() => {
        form.setFieldsValue(filters);
    }, [filters, form]);

    useEffect(() => () => window.clearTimeout(searchTimer.current), []);

    const permissionOptions = asList(permissionTypes).map(({ id, type }) => ({ label: type, value: id }));

    const handleValuesChange = (changedValues, allValues) => {
        window.clearTimeout(searchTimer.current);

        if (Object.prototype.hasOwnProperty.call(changedValues, "search")) {
            searchTimer.current = window.setTimeout(() => onChange(allValues), 300);
        } else {
            onChange(allValues);
        }
    };

    return (
        <Form form={form} onValuesChange={handleValuesChange}>
            <Row gutter={[12, 0]}>
                <Col xs={24} md={16}>
                    <Form.Item name="search">
                        <Input.Search
                            allowClear
                            aria-label="Filter by country name or country code"
                            placeholder="Filter by Country Name / Alpha-2 Code / Alpha-3 Code"
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="ehea_is_member">
                        <Select
                            allowClear
                            aria-label="Filter by EHEA membership"
                            options={booleanOptions}
                            placeholder="Filter by EHEA Membership"
                        />
                    </Form.Item>
                </Col>
            </Row>
            {isAdmin && (
                <Row gutter={[12, 0]}>
                    <Col xs={24} md={8}>
                        <Form.Item name="ehea_key_commitment">
                            <Select
                                allowClear
                                aria-label="Filter by EHEA key commitment"
                                options={permissionOptions}
                                placeholder="Filter by EHEA Key Commitment"
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="external_QAA_is_permitted">
                            <Select
                                allowClear
                                aria-label="Filter by cross-border QA permission"
                                options={permissionOptions}
                                placeholder="Filter by Cross Border QA Permitted"
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="european_approach_is_permitted">
                            <Select
                                allowClear
                                aria-label="Filter by European Approach permission"
                                options={permissionOptions}
                                placeholder="Filter by European Approach Permitted"
                            />
                        </Form.Item>
                    </Col>
                </Row>
            )}
        </Form>
    );
};

export default CountryFilters;
