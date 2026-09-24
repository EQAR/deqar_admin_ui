import { Col, Form, Input, Row, Select } from "antd";
import DrawerFormList from "@/components/FormFields/DrawerFormList/DrawerFormList";
import FormDatePicker from "@/components/FormFields/FormDatePicker";

const requiredRule = { required: true, message: "This field is required." };
const urlRule = { type: "url", message: "Enter a valid URL." };
const textAreaProps = { autoSize: { minRows: 3, maxRows: 10 } };

const validFromRule = (validToField) => ({ getFieldValue }) => ({
    validator(_, value) {
        const validTo = getFieldValue(validToField);
        if (!value || !validTo || value < validTo) return Promise.resolve();
        return Promise.reject(new Error("Valid from must be earlier than valid to."));
    },
});

const renderDatedItem = (name, validFrom, validTo) => (
    `${name || ""}${validFrom ? `; ${validFrom}` : ""}${validTo ? ` - ${validTo}` : ""}`
);

export const QARequirements = ({ value, onChange, disabled, requirementTypes }) => (
    <DrawerFormList
        value={value}
        onChange={onChange}
        disabled={disabled}
        label="National EQA Requirements"
        addLabel="Add"
        itemLabel="QA requirement"
        renderItem={({ qa_requirement, requirement_valid_from, requirement_valid_to }) => (
            renderDatedItem(qa_requirement, requirement_valid_from, requirement_valid_to)
        )}
    >
        <Form.Item name="qa_requirement" label="QA Requirement" rules={[requiredRule]}>
            <Input disabled={disabled} maxLength={500} />
        </Form.Item>
        <Form.Item name="qa_requirement_type" label="QA Requirement Type" rules={[requiredRule]}>
            <Select
                disabled={disabled}
                options={requirementTypes.map(({ id, qa_requirement_type }) => ({
                    value: id,
                    label: qa_requirement_type,
                }))}
                placeholder="Select QA requirement type"
            />
        </Form.Item>
        <Form.Item name="qa_requirement_note" label="QA Requirement Note">
            <Input.TextArea disabled={disabled} {...textAreaProps} />
        </Form.Item>
        <Row gutter={12}>
            <Col xs={24} sm={12}>
                <Form.Item
                    name="requirement_valid_from"
                    label="Requirement Valid From"
                    dependencies={["requirement_valid_to"]}
                    rules={[requiredRule, validFromRule("requirement_valid_to")]}
                >
                    <FormDatePicker disabled={disabled} />
                </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
                <Form.Item name="requirement_valid_to" label="Requirement Valid To">
                    <FormDatePicker disabled={disabled} />
                </Form.Item>
            </Col>
        </Row>
    </DrawerFormList>
);

export const QAARegulations = ({ value, onChange, disabled }) => (
    <DrawerFormList
        value={value}
        onChange={onChange}
        disabled={disabled}
        label="Further Information and Resources"
        addLabel="Add"
        itemLabel="resource"
        renderItem={({ regulation, regulation_valid_from, regulation_valid_to }) => (
            renderDatedItem(regulation, regulation_valid_from, regulation_valid_to)
        )}
    >
        <Form.Item name="regulation" label="Regulation" rules={[requiredRule]}>
            <Input disabled={disabled} maxLength={500} />
        </Form.Item>
        <Form.Item name="regulation_url" label="Regulation URL" rules={[urlRule]}>
            <Input disabled={disabled} maxLength={500} />
        </Form.Item>
        <Row gutter={12}>
            <Col xs={24} sm={12}>
                <Form.Item
                    name="regulation_valid_from"
                    label="Regulation Valid From"
                    dependencies={["regulation_valid_to"]}
                    rules={[requiredRule, validFromRule("regulation_valid_to")]}
                >
                    <FormDatePicker disabled={disabled} />
                </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
                <Form.Item name="regulation_valid_to" label="Regulation Valid To">
                    <FormDatePicker disabled={disabled} />
                </Form.Item>
            </Col>
        </Row>
    </DrawerFormList>
);
