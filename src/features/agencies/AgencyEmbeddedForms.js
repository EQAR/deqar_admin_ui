import { useEffect, useState } from "react";
import { App, Button, Checkbox, Col, Divider, Drawer, Form, Input, Row, Segmented, Select, Space } from "antd";
import { DeleteOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import DrawerFormList from "@/components/FormFields/DrawerFormList/DrawerFormList";
import FormDatePicker from "@/components/FormFields/FormDatePicker";
import PdfUploadField from "@/components/FormFields/PdfUploadField";
import TransliteratedInput from "@/components/FormFields/TransliteratedInput/TransliteratedInput";
import { agenciesApi } from "@/features/agencies/api";
import { http } from "@/lib/http";

const requiredRule = { required: true, message: "This field is required." };
const urlRule = { type: "url", message: "Enter a valid URL." };
const textAreaProps = { autoSize: { minRows: 3, maxRows: 10 } };

const optionLabel = (options, value, fallback = "") => (
    options.find((option) => String(option.value) === String(value))?.label || fallback || value || ""
);

const validFromRule = (validToField, message = "Valid from must be earlier than valid to.") => (
    ({ getFieldValue }) => ({
        validator(_, value) {
            const validTo = getFieldValue(validToField);
            if (!value || !validTo || value < validTo) return Promise.resolve();
            return Promise.reject(new Error(message));
        },
    })
);

const AlternativeNames = ({ disabled }) => (
    <Form.List name="alternative_names">
        {(fields, { add, remove }) => (
            <Space direction="vertical" size="small" style={{ width: "100%", marginBottom: 12 }}>
                <span>Alternative Names / Acronyms</span>
                {fields.map((field) => (
                    <Row gutter={8} key={field.key} align="top">
                        <Col xs={24} md={11}>
                            <TransliteratedInput
                                name={[field.name, "name"]}
                                transliterationName={[field.name, "name_transliterated"]}
                                transliterationPath={["alternative_names", field.name, "name_transliterated"]}
                                disabled={disabled}
                                placeholder="Alternative name"
                                maxLength={200}
                            />
                        </Col>
                        <Col xs={20} md={11}>
                            <TransliteratedInput
                                name={[field.name, "acronym"]}
                                transliterationName={[field.name, "acronym_transliterated"]}
                                transliterationPath={["alternative_names", field.name, "acronym_transliterated"]}
                                disabled={disabled}
                                placeholder="Alternative acronym"
                                maxLength={20}
                            />
                        </Col>
                        {!disabled && (
                            <Col xs={4} md={2}>
                                <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    aria-label="Remove alternative name"
                                    onClick={() => remove(field.name)}
                                />
                            </Col>
                        )}
                    </Row>
                ))}
                {!disabled && (
                    <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add()}>
                        Add Alternative Name / Acronym
                    </Button>
                )}
            </Space>
        )}
    </Form.List>
);

export const FormerNames = ({ value, onChange, disabled }) => (
    <DrawerFormList
        value={value}
        onChange={onChange}
        disabled={disabled}
        label="Former Names / Acronyms"
        addLabel="Add previous name set"
        itemLabel="former name set"
        newItemValue={{ primary_name: {}, alternative_names: [] }}
        renderItem={({ primary_name: primaryName = {} }) => (
            primaryName.acronym ? `${primaryName.name || ""} (${primaryName.acronym})` : primaryName.name
        )}
    >
        <Row gutter={12}>
            <Col xs={24} md={14}>
                <TransliteratedInput
                    name={["primary_name", "name"]}
                    transliterationName={["primary_name", "name_transliterated"]}
                    label="Agency Former Name, Primary"
                    rules={[requiredRule]}
                    disabled={disabled}
                    maxLength={200}
                />
            </Col>
            <Col xs={24} md={10}>
                <TransliteratedInput
                    name={["primary_name", "acronym"]}
                    transliterationName={["primary_name", "acronym_transliterated"]}
                    label="Agency Former Acronym, Primary"
                    disabled={disabled}
                    maxLength={20}
                />
            </Col>
        </Row>
        <AlternativeNames disabled={disabled} />
        <Row gutter={12}>
            <Col xs={24} md={12}>
                <Form.Item name="name_note" label="Name Note">
                    <Input.TextArea disabled={disabled} {...textAreaProps} />
                </Form.Item>
            </Col>
            <Col xs={24} md={12}>
                <Form.Item name="name_valid_to" label="Valid To" rules={[requiredRule]}>
                    <FormDatePicker disabled={disabled} />
                </Form.Item>
            </Col>
        </Row>
    </DrawerFormList>
);

export const Memberships = ({ value, onChange, disabled, associationOptions }) => (
    <DrawerFormList
        value={value}
        onChange={onChange}
        disabled={disabled}
        label="Memberships"
        itemLabel="membership"
        renderItem={({ association, membership_valid_from, membership_valid_to }) => (
            `${optionLabel(associationOptions, association)}, ${membership_valid_from || ""} - ${membership_valid_to || ""}`
        )}
    >
        <Form.Item name="association" label="Association" rules={[requiredRule]}>
            <Select
                disabled={disabled}
                showSearch
                optionFilterProp="label"
                options={associationOptions}
                placeholder="Select association"
            />
        </Form.Item>
        <Row gutter={12}>
            <Col xs={24} sm={12}>
                <Form.Item
                    name="membership_valid_from"
                    label="Valid From"
                    dependencies={["membership_valid_to"]}
                    rules={[requiredRule, validFromRule("membership_valid_to")]}
                >
                    <FormDatePicker disabled={disabled} />
                </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
                <Form.Item name="membership_valid_to" label="Valid To">
                    <FormDatePicker disabled={disabled} />
                </Form.Item>
            </Col>
        </Row>
    </DrawerFormList>
);

const activityFilters = [
    { label: "All", value: "all" },
    { label: "Inst.", value: "I" },
    { label: "Prg.", value: "P" },
    { label: "JP", value: "JP" },
    { label: "Inst./Prg.", value: "I/P" },
];

const activityTypeByFilter = {
    I: "institutional",
    P: "programme",
    JP: "joint programme",
    "I/P": "institutional/programme",
};

const ActivityGroupEditor = ({
    open,
    groupId,
    activityTypeOptions,
    onClose,
    onSaved,
}) => {
    const [groupForm] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const { notification } = App.useApp();

    useEffect(() => {
        if (!open) return;
        groupForm.resetFields();
        if (!groupId) return;

        http.get(agenciesApi.activityGroup(groupId))
            .then(({ data }) => groupForm.setFieldsValue({
                ...data,
                activity_type: getId(data.activity_type),
            }))
            .catch((error) => notification.error({
                message: "Activity group could not be loaded",
                description: error?.response?.data?.detail || error.message,
            }));
    }, [groupForm, groupId, notification, open]);

    const save = async (values) => {
        setSaving(true);
        try {
            const { data } = await http.request({
                url: agenciesApi.activityGroup(groupId),
                method: groupId ? "put" : "post",
                data: values,
            });
            notification.success({ message: `Activity group ${groupId ? "updated" : "created"}.` });
            onSaved(data);
        } catch (error) {
            notification.error({
                message: "Activity group could not be saved",
                description: error?.response?.data?.detail || "Please review the fields.",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Drawer
            title={`${groupId ? "Edit" : "Add"} Activity Group`}
            placement="right"
            width="45%"
            open={open}
            onClose={onClose}
            destroyOnHidden
            footer={(
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Button size="small" onClick={onClose}>Close</Button>
                    <Button
                        type="primary"
                        size="small"
                        icon={<SaveOutlined />}
                        loading={saving}
                        onClick={() => groupForm.submit()}
                    >
                        Save
                    </Button>
                </div>
            )}
        >
            <Form form={groupForm} layout="vertical" onFinish={save}>
                <Form.Item name="activity_type" label="Activity Type" rules={[requiredRule]}>
                    <Select options={activityTypeOptions} placeholder="Please select" />
                </Form.Item>
                <Form.Item name="activity" label="Activity Name" rules={[requiredRule]}>
                    <Input maxLength={500} placeholder="Enter activity group name" />
                </Form.Item>
                <Form.Item name="reports_link" label="Documentation Link" rules={[urlRule]}>
                    <Input placeholder="Enter URL" />
                </Form.Item>
            </Form>
        </Drawer>
    );
};

const getId = (value) => value && typeof value === "object" ? value.id : value;

const ActivityFields = ({
    disabled,
    activityGroupOptions,
    activityTypeOptions,
    refreshActivityGroups,
    registrationStart,
    registrationValidTo,
}) => {
    const drawerForm = Form.useFormInstance();
    const selectedGroup = Form.useWatch("activity_group", drawerForm);
    const [groupFilter, setGroupFilter] = useState("all");
    const [groupEditorOpen, setGroupEditorOpen] = useState(false);
    const [editingGroupId, setEditingGroupId] = useState(null);
    const filteredGroupOptions = groupFilter === "all"
        ? activityGroupOptions
        : activityGroupOptions.filter((option) => option.activityType === activityTypeByFilter[groupFilter]);

    const activityDateRule = ({ getFieldValue }) => ({
        validator(_, date) {
            const validTo = getFieldValue("activity_valid_to");
            if (date && validTo && date >= validTo) {
                return Promise.reject(new Error("Activity valid from must be earlier than valid to."));
            }
            if (date && registrationStart && date < registrationStart) {
                return Promise.reject(new Error("Activity valid from must be on or after registration start."));
            }
            if (date && registrationValidTo && date >= registrationValidTo) {
                return Promise.reject(new Error("Activity valid from must be earlier than registration valid to."));
            }
            return Promise.resolve();
        },
    });

    const openGroupEditor = (groupId = null) => {
        setEditingGroupId(groupId);
        setGroupEditorOpen(true);
    };

    const groupSaved = async (group) => {
        await refreshActivityGroups?.();
        drawerForm.setFieldValue("activity_group", group.id);
        setGroupEditorOpen(false);
    };

    return (
        <>
            <Form.Item name="activity_group" label="Activity Group" rules={[requiredRule]}>
                <Select
                    disabled={disabled}
                    showSearch
                    optionFilterProp="label"
                    options={filteredGroupOptions}
                    placeholder="Select activity group"
                />
            </Form.Item>
            {!disabled && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <Segmented size="small" options={activityFilters} value={groupFilter} onChange={setGroupFilter} />
                    <Space size="small">
                        <Button size="small" onClick={() => openGroupEditor()}>Add Group</Button>
                        <Button
                            size="small"
                            disabled={!selectedGroup}
                            onClick={() => openGroupEditor(selectedGroup)}
                        >
                            Edit Group
                        </Button>
                    </Space>
                </div>
            )}
            <Divider />
            <Form.Item name="activity" label="Activity Label" rules={[requiredRule]}>
                <Input disabled={disabled} maxLength={500} placeholder="Enter full activity name" />
            </Form.Item>
            <Form.Item name="activity_local_identifier" label="Activity Local ID">
                <Input disabled={disabled} maxLength={100} placeholder="Enter local ID for activity" />
            </Form.Item>
            <Form.Item name="reports_link" label="Documentation Link" rules={[urlRule]}>
                <Input disabled={disabled} placeholder="Enter URL" />
            </Form.Item>
            <Row gutter={12}>
                <Col xs={24} sm={12}>
                    <Form.Item
                        name="activity_valid_from"
                        label="Valid From"
                        dependencies={["activity_valid_to"]}
                        rules={[requiredRule, activityDateRule]}
                    >
                        <FormDatePicker disabled={disabled} />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                    <Form.Item name="activity_valid_to" label="Valid To">
                        <FormDatePicker disabled={disabled} />
                    </Form.Item>
                </Col>
            </Row>
            <ActivityGroupEditor
                open={groupEditorOpen}
                groupId={editingGroupId}
                activityTypeOptions={activityTypeOptions}
                onClose={() => setGroupEditorOpen(false)}
                onSaved={groupSaved}
            />
        </>
    );
};

const activityDisplayValue = (item, activityGroupOptions) => {
    const group = item.activity_group;
    const selectedOption = activityGroupOptions.find((option) => (
        String(option.value) === String(getId(group))
    ));
    const rawActivityType = typeof group === "object" ? group?.activity_type : selectedOption?.activityType;
    const activityType = typeof rawActivityType === "object" ? rawActivityType?.type : rawActivityType;
    const identifier = item.activity_local_identifier;
    const groupDetails = [activityType, identifier].filter(Boolean).join("; ");
    const label = `${item.activity || ""}${item.id ? ` - ID ${item.id}` : ""}`;

    return [label, groupDetails ? `(${groupDetails})` : "", item.activity_valid_to || ""]
        .filter(Boolean)
        .join(" ");
};

export const Activities = ({
    value,
    onChange,
    disabled,
    activityGroupOptions,
    activityTypeOptions,
    refreshActivityGroups,
    registrationStart,
    registrationValidTo,
}) => (
    <DrawerFormList
        value={value}
        onChange={onChange}
        disabled={disabled}
        label="Activities"
        itemLabel="activity"
        renderItem={(item) => activityDisplayValue(item, activityGroupOptions)}
    >
        <ActivityFields
            disabled={disabled}
            activityGroupOptions={activityGroupOptions}
            activityTypeOptions={activityTypeOptions}
            refreshActivityGroups={refreshActivityGroups}
            registrationStart={registrationStart}
            registrationValidTo={registrationValidTo}
        />
    </DrawerFormList>
);

export const FocusCountries = ({ value, onChange, disabled, countryOptions }) => (
    <DrawerFormList
        value={value}
        onChange={onChange}
        disabled={disabled}
        label="Focus Countries"
        itemLabel="focus country"
        newItemValue={{ country_is_official: false, country_is_crossborder: false }}
        renderItem={({ country, country_is_official, country_valid_to }) => (
            `${optionLabel(countryOptions, country)}${country_is_official ? " (official)" : ""}${
                country_valid_to ? `, ${country_valid_to}` : ""
            }`
        )}
    >
        <Form.Item name="country" label="Country" rules={[requiredRule]}>
            <Select
                disabled={disabled}
                showSearch
                optionFilterProp="label"
                options={countryOptions}
                placeholder="Select country"
            />
        </Form.Item>
        <Row gutter={12}>
            <Col xs={24} sm={12}>
                <Form.Item name="country_is_official" valuePropName="checked">
                    <Checkbox disabled={disabled}>Official</Checkbox>
                </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
                <Form.Item name="country_is_crossborder" valuePropName="checked">
                    <Checkbox disabled={disabled}>Cross-border</Checkbox>
                </Form.Item>
            </Col>
        </Row>
        <Row gutter={12}>
            <Col xs={24} sm={12}>
                <Form.Item
                    name="country_valid_from"
                    label="Valid From"
                    dependencies={["country_valid_to"]}
                    rules={[requiredRule, validFromRule("country_valid_to")]}
                >
                    <FormDatePicker disabled={disabled} />
                </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
                <Form.Item name="country_valid_to" label="Valid To">
                    <FormDatePicker disabled={disabled} />
                </Form.Item>
            </Col>
        </Row>
    </DrawerFormList>
);

export const Decisions = ({ value, onChange, disabled, decisionTypeOptions }) => (
    <DrawerFormList
        value={value}
        onChange={onChange}
        disabled={disabled}
        label="EQAR Decisions"
        itemLabel="EQAR decision"
        renderItem={({ decision_type: decisionType, decision_date: date, decision_file_name: fileName }) => (
            `${optionLabel(decisionTypeOptions, decisionType)}, ${date || ""}${fileName ? ` (${fileName})` : ""}`
        )}
    >
        <Row gutter={12}>
            <Col xs={24} md={12}>
                <Form.Item name="decision_date" label="Date" rules={[requiredRule]}>
                    <FormDatePicker disabled={disabled} />
                </Form.Item>
            </Col>
        </Row>
        <Form.Item name="decision_type" label="Decision Type" rules={[requiredRule]}>
            <Select disabled={disabled} options={decisionTypeOptions} placeholder="Select decision type" />
        </Form.Item>
        <PdfUploadField
            label="Decision File"
            fileField="decision_file"
            nameField="decision_file_name"
            sizeField="decision_file_size"
            uploadField="decision_file_upload"
            disabled={disabled}
        />
        <PdfUploadField
            label="Decision File Extra"
            fileField="decision_file_extra"
            nameField="decision_file_extra_name"
            sizeField="decision_file_extra_size"
            uploadField="decision_file_extra_upload"
            disabled={disabled}
        />
    </DrawerFormList>
);
