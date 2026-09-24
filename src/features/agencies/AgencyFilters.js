import { useEffect, useRef } from "react";
import { Checkbox, Col, Form, Input, Row, Select, Space } from "antd";
import style from "./AgencyFilters.module.scss";

const facetOptions = (values = []) => values
    .filter((_, index) => index % 2 === 0)
    .map((value) => ({ value, label: value }));

const AgencyFilters = ({ filters, facets, onChange }) => {
    const [form] = Form.useForm();
    const searchTimer = useRef(null);

    useEffect(() => form.setFieldsValue(filters), [filters, form]);
    useEffect(() => () => window.clearTimeout(searchTimer.current), []);

    const handleValuesChange = (changedValues, allValues) => {
        window.clearTimeout(searchTimer.current);
        if (Object.prototype.hasOwnProperty.call(changedValues, "query")) {
            searchTimer.current = window.setTimeout(() => onChange(allValues), 300);
        } else {
            onChange(allValues);
        }
    };

    return (
        <Form form={form} onValuesChange={handleValuesChange}>
            <Row gutter={[12, 0]}>
                <Col xs={24} md={6}>
                    <Form.Item name="query">
                        <Input.Search allowClear placeholder="Filter by Agency Name / Acronym" />
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
                    <Form.Item name="focus_country">
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={facetOptions(facets?.focus_country_facet)}
                            placeholder="Filter by Focus Country"
                        />
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
            </Row>
        </Form>
    );
};

export default AgencyFilters;
