import { useEffect, useRef } from "react";
import { Col, Form, Input, Row, Select } from "antd";

const flagOptions = [
    { value: 2, label: "low level" },
    { value: 3, label: "high level" },
];

const ReportFlagFilters = ({ filters, agencyOptions, onChange }) => {
    const [form] = Form.useForm();
    const filterTimer = useRef(null);

    useEffect(() => form.setFieldsValue(filters), [filters, form]);
    useEffect(() => () => window.clearTimeout(filterTimer.current), []);

    const handleValuesChange = (changedValues, allValues) => {
        window.clearTimeout(filterTimer.current);
        const changedField = Object.keys(changedValues)[0];

        if (["search", "report"].includes(changedField)) {
            filterTimer.current = window.setTimeout(() => onChange(allValues), 300);
        } else {
            onChange(allValues);
        }
    };

    return (
        <Form form={form} onValuesChange={handleValuesChange}>
            <Row gutter={[12, 0]}>
                <Col xs={24} md={6}>
                    <Form.Item name="search">
                        <Input allowClear placeholder="Filter by Flag Message" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                    <Form.Item name="report__agency">
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={agencyOptions}
                            placeholder="Filter by Agency"
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                    <Form.Item name="report">
                        <Input allowClear placeholder="Filter by Report ID" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                    <Form.Item name="flag">
                        <Select
                            allowClear
                            options={flagOptions}
                            placeholder="Filter by Flag"
                        />
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
};

export default ReportFlagFilters;
