import { useEffect, useRef } from "react";
import { Col, Form, Input, Row, Select } from "antd";

const ActivityFilters = ({
    filters,
    agencyOptions,
    activityTypeOptions,
    activityGroupOptions,
    onChange,
}) => {
    const [form] = Form.useForm();
    const searchTimer = useRef(null);

    useEffect(() => form.setFieldsValue(filters), [filters, form]);
    useEffect(() => () => window.clearTimeout(searchTimer.current), []);

    const handleValuesChange = (changedValues, allValues) => {
        window.clearTimeout(searchTimer.current);
        if (Object.prototype.hasOwnProperty.call(changedValues, "activity_id")) {
            searchTimer.current = window.setTimeout(() => onChange(allValues), 300);
        } else {
            onChange(allValues);
        }
    };

    return (
        <Form form={form} onValuesChange={handleValuesChange}>
            <Row gutter={[12, 0]}>
                <Col xs={24} md={4}>
                    <Form.Item name="activity_id">
                        <Input allowClear placeholder="Filter by Activity ID" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={4}>
                    <Form.Item name="agency">
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={agencyOptions}
                            placeholder="Filter by Agency"
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={4}>
                    <Form.Item name="activity_type">
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={activityTypeOptions}
                            placeholder="Filter by Activity Type"
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item name="activity_group">
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={activityGroupOptions}
                            placeholder="Filter by Activity Group"
                        />
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
};

export default ActivityFilters;
