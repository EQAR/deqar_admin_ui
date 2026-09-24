import { useEffect, useRef, useState } from "react";
import { Button, Form, Input, Row, Col, Select } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import DrawerFormList from "@/components/FormFields/DrawerFormList/DrawerFormList";
import FormDatePicker from "@/components/FormFields/FormDatePicker";
import TransliteratedInput from "@/components/FormFields/TransliteratedInput/TransliteratedInput";
import { institutionsApi } from "@/features/institutions/api";
import { http } from "@/lib/http";

const requiredRule = { required: true, message: "This field is required." };
const textAreaProps = { autoSize: { minRows: 3, maxRows: 8 } };

const getId = (value) => value && typeof value === "object" ? value.id : value;
const optionLabel = (options, value, fallback = "") => (
    options.find((option) => String(option.value) === String(value))?.label || fallback || value || ""
);

const validFromRule = (validToField, message) => ({ getFieldValue }) => ({
    validator(_, value) {
        const validTo = getFieldValue(validToField);
        if (!value || !validTo || value < validTo) return Promise.resolve();
        return Promise.reject(new Error(message));
    },
});

const AlternativeNames = ({ disabled }) => (
    <Form.List name="alternative_names">
        {(fields, { add, remove }) => (
            <div style={{ marginBottom: 12 }}>
                {fields.length > 0 && (
                    <div style={{ marginBottom: 8 }}>Alternative Institution Name</div>
                )}
                {fields.map((field) => (
                    <div key={field.key} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <Form.Item
                            name={[field.name, "name"]}
                            className="ant-form-item-flex-1"
                            rules={[requiredRule]}
                            style={{ flex: 1 }}
                        >
                            <Input disabled={disabled} placeholder="Enter alternative institution name" />
                        </Form.Item>
                        {!disabled && (
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                aria-label="Remove alternative name"
                                onClick={() => remove(field.name)}
                            />
                        )}
                    </div>
                ))}
                {!disabled && (
                    <Button size="small" icon={<PlusOutlined />} onClick={() => add()}>
                        Add Alternative Name
                    </Button>
                )}
            </div>
        )}
    </Form.List>
);

export const FormerNames = ({ value, onChange, disabled }) => (
    <DrawerFormList
        value={value}
        onChange={onChange}
        disabled={disabled}
        label="Former Names"
        addLabel="Add Previous Name Set"
        itemLabel="former name"
        newItemValue={{ alternative_names: [] }}
        renderItem={(item) => item.name_official || "Former name"}
    >
        <TransliteratedInput
            name="name_official"
            transliterationName="name_official_transliterated"
            label="Institution Former Name, Official"
            rules={[requiredRule]}
            disabled={disabled}
            maxLength={200}
        />
        <Form.Item name="name_english" label="Institution Name, English">
            <Input disabled={disabled} placeholder="Enter English form" maxLength={200} />
        </Form.Item>
        <AlternativeNames disabled={disabled} />
        <Row gutter={12}>
            <Col xs={24} md={12}>
                <Form.Item name="acronym" label="Institution Acronym">
                    <Input disabled={disabled} maxLength={30} />
                </Form.Item>
            </Col>
            <Col xs={24} md={12}>
                <Form.Item name="name_valid_to" label="Valid To" rules={[requiredRule]}>
                    <FormDatePicker disabled={disabled} />
                </Form.Item>
            </Col>
        </Row>
        <Form.Item name="name_source_note" label="Name Source Note">
            <Input.TextArea disabled={disabled} placeholder="Enter name source information" {...textAreaProps} />
        </Form.Item>
    </DrawerFormList>
);

const IdentifierFields = ({ disabled, local, agencyOptions, resourceOptions }) => (
    <>
        {local ? (
            <Form.Item name="agency" label="Agency" rules={[requiredRule]}>
                <Select
                    disabled={disabled}
                    showSearch
                    optionFilterProp="label"
                    options={agencyOptions}
                    placeholder="Select agency"
                />
            </Form.Item>
        ) : (
            <Form.Item name="resource" label="Identifier Resource" rules={[requiredRule]}>
                <Select
                    disabled={disabled}
                    showSearch
                    optionFilterProp="label"
                    options={resourceOptions}
                    placeholder="Select resource"
                />
            </Form.Item>
        )}
        <Form.Item name="identifier" label={local ? "Local Identifier" : "Other Identifier"} rules={[requiredRule]}>
            <Input disabled={disabled} placeholder={local ? "Enter local ID" : "Enter identifier"} />
        </Form.Item>
        <Row gutter={12}>
            <Col xs={24} md={12}>
                <Form.Item
                    name="identifier_valid_from"
                    label="Valid From"
                    dependencies={["identifier_valid_to"]}
                    rules={[validFromRule("identifier_valid_to", "Valid from must be earlier than valid to.")]}
                >
                    <FormDatePicker disabled={disabled} />
                </Form.Item>
            </Col>
            <Col xs={24} md={12}>
                <Form.Item name="identifier_valid_to" label="Valid To">
                    <FormDatePicker disabled={disabled} />
                </Form.Item>
            </Col>
        </Row>
        <Form.Item name="note" label="Identifier Note">
            <Input.TextArea disabled={disabled} placeholder="Enter identifier information" {...textAreaProps} />
        </Form.Item>
    </>
);

export const LocalIdentifiers = ({ value, onChange, disabled, agencyOptions }) => (
    <DrawerFormList
        value={value}
        onChange={onChange}
        disabled={disabled}
        label="Local ID"
        itemLabel="local identifier"
        newItemValue={{ resource: "local identifier" }}
        renderItem={(item) => `${item.identifier || "Local identifier"} (${optionLabel(
            agencyOptions,
            getId(item.agency),
            item.agency?.acronym_primary,
        )})`}
    >
        <IdentifierFields disabled={disabled} local agencyOptions={agencyOptions} />
    </DrawerFormList>
);

export const NationalIdentifiers = ({ value, onChange, disabled, resourceOptions, required }) => (
    <DrawerFormList
        value={value}
        onChange={onChange}
        disabled={disabled}
        label={required ? "Other ID *" : "Other ID"}
        itemLabel="identifier"
        renderItem={(item) => `${item.identifier || "Identifier"} (${optionLabel(
            resourceOptions,
            typeof item.resource === "object" ? item.resource.resource : item.resource,
            item.resource?.resource,
        )})`}
    >
        <IdentifierFields disabled={disabled} resourceOptions={resourceOptions} />
    </DrawerFormList>
);

const InstitutionSearchSelect = ({ value, onChange, disabled }) => {
    const form = Form.useFormInstance();
    const initialLabel = Form.useWatch("institution_name", form);
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const timer = useRef(null);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const search = (query) => {
        window.clearTimeout(timer.current);
        if (!query) return;
        timer.current = window.setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await http.get(institutionsApi.list, { params: { query, limit: 20, offset: 0 } });
                setOptions((data?.results || []).map((item) => ({
                    value: item.id,
                    label: item.name_display || item.name_primary,
                })));
            } finally {
                setLoading(false);
            }
        }, 300);
    };

    const mergedOptions = value && initialLabel && !options.some((option) => String(option.value) === String(value))
        ? [{ value, label: initialLabel }, ...options]
        : options;

    return (
        <Select
            value={value}
            onChange={(nextValue, option) => {
                onChange?.(nextValue);
                form.setFieldValue("institution_name", option?.label || "");
            }}
            disabled={disabled}
            allowClear
            showSearch
            filterOption={false}
            onSearch={search}
            options={mergedOptions}
            loading={loading}
            placeholder="Search education provider"
            notFoundContent={loading ? "Searching…" : "Type to search"}
        />
    );
};

export const HierarchicalLinks = ({ value, onChange, disabled, relationshipTypeOptions }) => (
    <DrawerFormList
        value={value}
        onChange={onChange}
        disabled={disabled}
        label="Hierarchical Links"
        itemLabel="hierarchical link"
        renderItem={(item) => `${item.direction === "parent" ? "Parent of" : "Child of"}: ${item.institution_name || ""}`}
    >
        <Form.Item name="direction" label="Relationship" rules={[requiredRule]}>
            <Select
                disabled={disabled}
                options={[
                    { value: "parent", label: "Parent of" },
                    { value: "child", label: "Child of" },
                ]}
                placeholder="Please select"
            />
        </Form.Item>
        <Form.Item name="institution" label="Education Provider" rules={[requiredRule]}>
            <InstitutionSearchSelect disabled={disabled} />
        </Form.Item>
        <Form.Item name="institution_name" hidden><Input /></Form.Item>
        <Form.Item name="relationship_type" label="Relationship Type">
            <Select disabled={disabled} options={relationshipTypeOptions} placeholder="Please select" />
        </Form.Item>
        <Row gutter={12}>
            <Col xs={24} md={12}>
                <Form.Item
                    name="valid_from"
                    label="Valid From"
                    dependencies={["valid_to"]}
                    rules={[validFromRule("valid_to", "Link valid from must be earlier than valid to.")]}
                >
                    <FormDatePicker disabled={disabled} />
                </Form.Item>
            </Col>
            <Col xs={24} md={12}>
                <Form.Item name="valid_to" label="Valid To">
                    <FormDatePicker disabled={disabled} />
                </Form.Item>
            </Col>
        </Row>
        <Form.Item name="relationship_note" label="Relationship Note">
            <Input.TextArea disabled={disabled} {...textAreaProps} />
        </Form.Item>
    </DrawerFormList>
);

export const HistoricalLinks = ({ value, onChange, disabled, relationshipTypeOptions }) => (
    <DrawerFormList
        value={value}
        onChange={onChange}
        disabled={disabled}
        label="Historical Links"
        itemLabel="historical link"
        renderItem={(item) => `${optionLabel(
            relationshipTypeOptions,
            item.relationship_key,
            item.relationship_label,
        )}: ${item.institution_name || ""}`}
    >
        <Form.Item name="relationship_key" label="Relationship" rules={[requiredRule]}>
            <Select disabled={disabled} options={relationshipTypeOptions} placeholder="Please select" />
        </Form.Item>
        <Form.Item name="institution" label="Education Provider" rules={[requiredRule]}>
            <InstitutionSearchSelect disabled={disabled} />
        </Form.Item>
        <Form.Item name="institution_name" hidden><Input /></Form.Item>
        <Form.Item name="relationship_date" label="Date">
            <FormDatePicker disabled={disabled} />
        </Form.Item>
        <Form.Item name="relationship_note" label="Relationship Note">
            <Input.TextArea disabled={disabled} {...textAreaProps} />
        </Form.Item>
    </DrawerFormList>
);
