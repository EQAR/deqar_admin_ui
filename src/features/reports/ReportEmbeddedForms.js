import { useEffect, useRef, useState } from "react";
import { Button, Col, Form, Input, Row, Select } from "antd";
import { CloseOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import DrawerFormList from "@/components/FormFields/DrawerFormList/DrawerFormList";
import PdfUploadField from "@/components/FormFields/PdfUploadField";
import EscoSelect from "@/components/FormFields/EscoSelect";
import { reportsApi } from "@/features/reports/api";
import { http } from "@/lib/http";
import style from "./ReportEmbeddedForms.module.scss";

const requiredRule = { required: true, message: "This field is required." };

const getId = (value) => value && typeof value === "object" ? value.id : value;

export const activityLabel = (activity = {}) => {
    const group = activity.activity_group || {};
    const groupName = group.activity && group.activity !== activity.activity
        ? ` - ${group.activity}`
        : "";
    return `${activity.activity || "Activity"} (${activity.agency || ""}) - ID ${activity.id ?? ""}${groupName}${group.id ? ` - Activity Group ${group.id}` : ""}`;
};

export const AssignedRecords = ({
    value,
    onChange,
    disabled,
    label,
    required = false,
    options = [],
    loading = false,
    placeholder,
    onSearch,
    renderItem,
}) => {
    const items = Array.isArray(value) ? value : [];
    const selectedIds = new Set(items.map((item) => String(item.id)));
    const selectableOptions = options.filter((option) => !selectedIds.has(String(option.value)));

    const addItem = (selectedId) => {
        const option = options.find((item) => String(item.value) === String(selectedId));
        if (option?.record) onChange?.([...items, option.record]);
    };

    return (
        <div className={style.AssignedField}>
            <span className={style.AssignedLabel}>{label}{required ? " *" : ""}</span>
            {!disabled && (
                <Select
                    value={null}
                    allowClear
                    showSearch
                    filterOption={onSearch ? false : undefined}
                    optionFilterProp="label"
                    options={selectableOptions}
                    loading={loading}
                    placeholder={placeholder}
                    onSearch={onSearch}
                    onChange={addItem}
                    style={{ width: "100%" }}
                    notFoundContent={loading ? "Loading…" : onSearch ? "Type to search" : undefined}
                />
            )}
            <div className={style.AssignedList}>
                {items.length ? items.map((item, index) => (
                    <div className={style.AssignedItem} key={item.id ?? `new-${index}`}>
                        <span className={style.AssignedText}>{renderItem(item)}</span>
                        {!disabled && (
                            <Button
                                type="text"
                                danger
                                size="small"
                                icon={<CloseOutlined />}
                                aria-label={`Remove ${label}`}
                                onClick={() => onChange?.(items.filter((_, itemIndex) => itemIndex !== index))}
                            />
                        )}
                    </div>
                )) : <div className={style.AssignedEmpty}>No entries</div>}
            </div>
        </div>
    );
};

export const InstitutionRecords = ({ value, onChange, disabled, label, required }) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const timer = useRef(null);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const search = (query) => {
        window.clearTimeout(timer.current);
        if (!query) {
            setOptions([]);
            return;
        }
        timer.current = window.setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await http.get(reportsApi.institutions, {
                    params: { query, limit: 20, offset: 0 },
                });
                setOptions((data?.results || []).map((institution) => ({
                    value: institution.id,
                    label: institution.name_select_display || institution.name_display || institution.name_primary,
                    record: {
                        ...institution,
                        name_primary: institution.name_primary || institution.name_display,
                        is_other_provider: institution.is_other_provider ?? institution.other_provider,
                    },
                })));
            } catch {
                setOptions([]);
            } finally {
                setLoading(false);
            }
        }, 300);
    };

    return (
        <AssignedRecords
            value={value}
            onChange={onChange}
            disabled={disabled}
            label={label}
            required={required}
            options={options}
            loading={loading}
            onSearch={search}
            placeholder="Enter institution name, ETER ID, city or country"
            renderItem={(institution) => institution.name_primary || institution.name_display || institution.deqar_id}
        />
    );
};

const AlternativeProgrammeNames = ({ disabled }) => {
    const form = Form.useFormInstance();
    const names = Form.useWatch("alternative_names", form);
    const lastName = Array.isArray(names) ? names.at(-1)?.name_alternative : null;
    const canAdd = !names?.length || Boolean(lastName?.trim());

    return (
        <Form.List name="alternative_names">
            {(fields, { add, remove }) => (
                <div style={{ marginBottom: 12 }}>
                    <div className={style.RepeatHeader}>
                        <span>{fields.length ? "Agency alternative name / qualification" : ""}</span>
                        {!disabled && (
                            <Button
                                size="small"
                                icon={<PlusOutlined />}
                                disabled={!canAdd}
                                onClick={() => canAdd && add({ name_is_primary: false })}
                            >
                                Add Alternative Programme Name
                            </Button>
                        )}
                    </div>
                    {fields.map((field) => (
                        <Row gutter={8} key={field.key}>
                            <Form.Item name={[field.name, "id"]} hidden><Input /></Form.Item>
                            <Col xs={24} md={11}>
                                <Form.Item name={[field.name, "name_alternative"]} rules={[requiredRule]}>
                                    <Input disabled={disabled} placeholder="Enter alternative programme name" />
                                </Form.Item>
                            </Col>
                            <Col xs={20} md={11}>
                                <Form.Item name={[field.name, "qualification_alternative"]}>
                                    <Input disabled={disabled} placeholder="Enter alternative qualification name" />
                                </Form.Item>
                            </Col>
                            {!disabled && (
                                <Col xs={4} md={2}>
                                    <Button
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        aria-label="Remove alternative programme name"
                                        onClick={() => remove(field.name)}
                                    />
                                </Col>
                            )}
                        </Row>
                    ))}
                </div>
            )}
        </Form.List>
    );
};

const LearningOutcomes = ({ disabled }) => {
    const form = Form.useFormInstance();
    const outcomes = Form.useWatch("learning_outcomes", form);
    const lastOutcome = Array.isArray(outcomes) ? outcomes.at(-1)?.learning_outcome : null;
    const canAdd = !outcomes?.length || Boolean(String(getId(lastOutcome) || "").trim());

    useEffect(() => {
        if (!disabled && (!Array.isArray(outcomes) || outcomes.length === 0)) {
            form.setFieldValue("learning_outcomes", [{}]);
        }
    }, [disabled, form, outcomes]);

    return (
        <Form.List name="learning_outcomes">
            {(fields, { add, remove }) => (
                <div style={{ marginBottom: 12 }}>
                    <div className={style.RepeatHeader}>
                        <span>Learning outcomes</span>
                        {!disabled && (
                            <Button size="small" icon={<PlusOutlined />} disabled={!canAdd} onClick={() => canAdd && add()}>
                                Add Learning Outcome
                            </Button>
                        )}
                    </div>
                    {fields.map((field) => (
                        <div className={style.RepeatRow} key={field.key}>
                            <Form.Item name={[field.name, "id"]} hidden><Input /></Form.Item>
                            <Form.Item className={style.RepeatField} name={[field.name, "learning_outcome"]}>
                                <EscoSelect
                                    disabled={disabled}
                                    mode="skill"
                                    placeholder="Search ESCO learning outcome"
                                />
                            </Form.Item>
                            {!disabled && (
                                <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    aria-label="Remove learning outcome"
                                    onClick={() => remove(field.name)}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </Form.List>
    );
};

const ProgrammeFields = ({ disabled, qfOptions, countryOptions, degreeOutcomeOptions, assessmentOptions, allOtherProviders }) => {
    const form = Form.useFormInstance();
    const degreeOutcome = Form.useWatch("degree_outcome", form);
    const noFullDegree = Number(degreeOutcome) === 2;

    const degreeRule = {
        validator(_, value) {
            if (allOtherProviders && Number(value) === 1) {
                return Promise.reject(new Error("Degree outcome must be 'no full degree' when all organisations are other providers."));
            }
            return Promise.resolve();
        },
    };

    return (
        <>
            <Row gutter={12}>
                <Col xs={24} md={12}>
                    <Form.Item name="name_primary" label="Programme name" rules={[requiredRule]}>
                        <Input disabled={disabled} placeholder="Enter programme name for display" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item name="qualification_primary" label="Qualification name">
                        <Input disabled={disabled} placeholder="Enter qualification name for display" />
                    </Form.Item>
                </Col>
            </Row>
            <AlternativeProgrammeNames disabled={disabled} />
            <Row gutter={12}>
                <Col xs={24} md={12}>
                    <Form.Item name="qf_ehea_level" label="QF-EHEA level" rules={noFullDegree ? [requiredRule] : []}>
                        <Select disabled={disabled} allowClear options={qfOptions} placeholder="Please select" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item name="nqf_level" label="NQF level">
                        <Input disabled={disabled} placeholder="Enter programme NQF Level" />
                    </Form.Item>
                </Col>
            </Row>
            <Form.Item name="countries" label="Countries (if different from institution countries)">
                <Select
                    mode="multiple"
                    disabled={disabled}
                    showSearch
                    optionFilterProp="label"
                    options={countryOptions}
                    placeholder="Please select multiple, if necessary"
                />
            </Form.Item>
            <Row gutter={12}>
                <Col xs={24} md={12}>
                    <Form.Item name="degree_outcome" label="Degree outcome" rules={[requiredRule, degreeRule]}>
                        <Select disabled={disabled} options={degreeOutcomeOptions} placeholder="Select Degree Outcome" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item name="workload_ects" label="Workload expressed in ECTS" rules={noFullDegree ? [requiredRule] : []}>
                        <Input disabled={disabled} placeholder="Enter ECTS Credits" />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={12}>
                <Col xs={24} md={12}>
                    <Form.Item name="assessment_certification" label="Assessment and certification" rules={noFullDegree ? [requiredRule] : []}>
                        <Select disabled={disabled} allowClear options={assessmentOptions} placeholder="Select assessment" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item name="field_study" label="Field of study (ISCED-F)">
                        <EscoSelect
                            disabled={disabled}
                            mode="isced"
                            placeholder="Select ISCED-F value"
                        />
                    </Form.Item>
                </Col>
            </Row>
            <LearningOutcomes disabled={disabled} />
            <Form.Item name="learning_outcome_description" label="Learning outcome description">
                <Input.TextArea disabled={disabled} autoSize={{ minRows: 3, maxRows: 8 }} />
            </Form.Item>
        </>
    );
};

export const Programmes = ({
    value,
    onChange,
    disabled,
    qfOptions,
    countryOptions,
    degreeOutcomeOptions,
    assessmentOptions,
    institutions,
    required,
}) => {
    const allOtherProviders = Boolean(institutions?.length)
        && institutions.every((institution) => institution.is_other_provider ?? institution.other_provider);

    return (
        <DrawerFormList
            value={value}
            onChange={onChange}
            disabled={disabled}
            label={required ? "Programmes *" : "Programmes"}
            itemLabel="programme"
            newItemValue={{ alternative_names: [], learning_outcomes: [{}], countries: [] }}
            renderItem={(programme) => `${programme.name_primary || "Programme"}${programme.qualification_primary ? `, ${programme.qualification_primary}` : ""}`}
        >
            <ProgrammeFields
                disabled={disabled}
                qfOptions={qfOptions}
                countryOptions={countryOptions}
                degreeOutcomeOptions={degreeOutcomeOptions}
                assessmentOptions={assessmentOptions}
                allOtherProviders={allOtherProviders}
            />
        </DrawerFormList>
    );
};

const ReportFileFields = ({ disabled, languageOptions }) => {
    const fileRule = ({ getFieldValue }) => ({
        validator(_, value) {
            const filename = getFieldValue("filename");
            if (value && filename) return Promise.reject(new Error("Enter a file URL or upload a file, not both."));
            if (!value && !filename) return Promise.reject(new Error("Enter a file URL or upload a PDF."));
            return Promise.resolve();
        },
    });

    return (
        <>
            <Form.Item name="original_location" label="File Original URL" rules={[fileRule, { type: "url", warningOnly: false }] }>
                <Input disabled={disabled} placeholder="Enter file location URL" />
            </Form.Item>
            <PdfUploadField
                label="File"
                fileField="file"
                nameField="filename"
                sizeField="filesize"
                uploadField="fileupload"
                disabled={disabled}
            />
            <Form.Item name="display_name" label="File Display Name">
                <Input disabled={disabled} placeholder="Enter file name for display" />
            </Form.Item>
            <Form.Item name="report_language" label="File Languages" rules={[requiredRule]}>
                <Select
                    mode="multiple"
                    disabled={disabled}
                    showSearch
                    optionFilterProp="label"
                    options={languageOptions}
                    placeholder="Please select multiple, if necessary"
                />
            </Form.Item>
        </>
    );
};

export const ReportFiles = ({ value, onChange, disabled, languageOptions }) => (
    <DrawerFormList
        value={value}
        onChange={onChange}
        disabled={disabled}
        label="Files *"
        itemLabel="file"
        newItemValue={{ report_language: [] }}
        renderItem={(file) => {
            const languages = (file.report_language || []).map((language) => {
                const id = getId(language);
                return languageOptions.find((option) => String(option.value) === String(id))?.label || language.language_name_en || id;
            }).filter(Boolean).join(", ");
            return `${file.display_name || file.original_location || file.filename || "File"}${languages ? ` (${languages})` : ""}`;
        }}
    >
        <ReportFileFields disabled={disabled} languageOptions={languageOptions} />
    </DrawerFormList>
);

export const ReportLinks = ({ value, onChange, disabled }) => (
    <DrawerFormList
        value={value}
        onChange={onChange}
        disabled={disabled}
        label="Report Links"
        itemLabel="report link"
        renderItem={(link) => link.link_display_name || link.link || "Link"}
    >
        <Form.Item name="link" label="URL" rules={[requiredRule, { type: "url", message: "Enter a valid URL." }]}>
            <Input.TextArea disabled={disabled} placeholder="Enter URL" autoSize={{ minRows: 2, maxRows: 5 }} />
        </Form.Item>
        <Form.Item name="link_display_name" label="URL Display Name">
            <Input.TextArea disabled={disabled} placeholder="Enter name for display" autoSize={{ minRows: 2, maxRows: 5 }} />
        </Form.Item>
    </DrawerFormList>
);
