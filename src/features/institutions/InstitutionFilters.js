import { useEffect, useRef } from "react";
import { Col, Form, Input, Row, Select } from "antd";

const providerOptions = [
    { value: "true", label: "Only OPs" },
    { value: "false", label: "Only HEI(s)" },
];

const facetOptions = (values = []) => values
    .filter((value) => typeof value === "string")
    .map((value) => ({ value, label: value }));

const InstitutionFilters = ({ filters, facets, onChange }) => {
    const [form] = Form.useForm();
    const searchTimer = useRef(null);

    useEffect(() => form.setFieldsValue(filters), [filters, form]);
    useEffect(() => () => window.clearTimeout(searchTimer.current), []);

    const handleValuesChange = (changedValues, allValues) => {
        window.clearTimeout(searchTimer.current);
        const changedField = Object.keys(changedValues)[0];
        if (["deqar_id", "eter_id", "query"].includes(changedField)) {
            searchTimer.current = window.setTimeout(() => onChange(allValues), 300);
        } else {
            onChange(allValues);
        }
    };

    return (
        <Form form={form} onValuesChange={handleValuesChange}>
            <Row gutter={[12, 0]}>
                <Col xs={24} md={4}>
                    <Form.Item name="deqar_id">
                        <Input allowClear placeholder="DEQARINST ID" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={4}>
                    <Form.Item name="eter_id">
                        <Input allowClear placeholder="ETER ID" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="query">
                        <Input.Search allowClear placeholder="Filter by Education Provider" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={4}>
                    <Form.Item name="other_provider">
                        <Select allowClear options={providerOptions} placeholder="HEI / OP" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={4}>
                    <Form.Item name="country">
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={facetOptions(facets?.country_facet)}
                            placeholder="Filter by Country"
                        />
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
};

export default InstitutionFilters;
