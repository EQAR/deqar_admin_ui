import { useEffect, useRef } from "react";
import { Checkbox, Col, Form, Input, Row, Select, Space } from "antd";
import style from "./ReportFilters.module.scss";

const facetOptions = (values = []) => values
    .filter((_, index) => index % 2 === 0)
    .map((value) => ({ value, label: value }));

const ReportFilters = ({ filters, facets, onChange }) => {
    const [form] = Form.useForm();
    const filterTimer = useRef(null);

    useEffect(() => form.setFieldsValue(filters), [filters, form]);
    useEffect(() => () => window.clearTimeout(filterTimer.current), []);

    const handleValuesChange = (changedValues, allValues) => {
        window.clearTimeout(filterTimer.current);
        const changedField = Object.keys(changedValues)[0];
        if (["query", "id", "year"].includes(changedField)) {
            filterTimer.current = window.setTimeout(() => onChange(allValues), 300);
        } else {
            onChange(allValues);
        }
    };

    return (
        <Form form={form} onValuesChange={handleValuesChange}>
            <Row gutter={[12, 0]}>
                <Col xs={24} md={6}>
                    <Form.Item name="query">
                        <Input.Search allowClear placeholder="Filter by Education provider / Programme" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                    <Form.Item name="id">
                        <Input allowClear placeholder="Filter by Report ID" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={6} className={style.DateFilter}>
                    <Space.Compact className={style.DateControl}>
                        <Form.Item name="year" noStyle>
                            <Input
                                className={style.YearInput}
                                type="number"
                                min={1000}
                                max={2199}
                                placeholder="YYYY"
                            />
                        </Form.Item>
                        <Form.Item name="active" valuePropName="checked" noStyle>
                            <Checkbox className={style.CurrentCheckbox}>Current</Checkbox>
                        </Form.Item>
                    </Space.Compact>
                </Col>
                <Col xs={24} md={6}>
                    <Form.Item name="programme_type">
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={facetOptions(facets?.programme_type_facet)}
                            placeholder="Filter by Programme Type"
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={[12, 0]}>
                <Col xs={24} md={6}>
                    <Form.Item name="agency">
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={facetOptions(facets?.agency_facet)}
                            placeholder="Filter by Agency"
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={6}>
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
                <Col xs={24} md={6}>
                    <Form.Item name="activity_type">
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={facetOptions(facets?.activity_type_facet)}
                            placeholder="Filter by Activity Type"
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                    <Form.Item name="flag">
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={facetOptions(facets?.flag_level_facet)}
                            placeholder="Filter by Flag"
                        />
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
};

export default ReportFilters;
