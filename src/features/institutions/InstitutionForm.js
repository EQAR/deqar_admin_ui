import { useEffect, useRef, useState } from "react";
import {
    Alert,
    AutoComplete,
    Button,
    Checkbox,
    Col,
    Form,
    Input,
    Result,
    Row,
    Select,
    Space,
    Spin,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { institutionsApi } from "@/features/institutions/api";
import { asList } from "@/lib/apiData";
import { useEntityForm } from "@/hooks/useEntityForm";
import FormDatePicker from "@/components/FormFields/FormDatePicker";
import TransliteratedInput from "@/components/FormFields/TransliteratedInput/TransliteratedInput";
import RecordInfoPanel from "@/components/RecordInfoPanel/RecordInfoPanel";
import SlideToggle from "@/components/SlideToggle/SlideToggle";
import {
    FormerNames,
    HistoricalLinks,
    HierarchicalLinks,
    LocalIdentifiers,
    NationalIdentifiers,
} from "@/features/institutions/InstitutionEmbeddedForms";
import style from "./InstitutionForm.module.scss";

const requiredRule = { required: true, message: "This field is required." };
const requiredUrlRule = [requiredRule, { type: "url", message: "Enter a valid URL." }];
const getId = (value) => value && typeof value === "object" ? value.id : value;

const decodeIdentifier = (identifier) => ({
    ...identifier,
    agency: getId(identifier.agency),
    resource: typeof identifier.resource === "object" ? identifier.resource.resource : identifier.resource,
});

const decodeHierarchicalLink = (link, direction) => ({
    ...link,
    direction,
    institution: getId(link.institution),
    institution_name: link.institution?.name_primary || "",
    relationship_type: getId(link.relationship_type),
});

const decodeHistoricalLink = (link, direction) => ({
    ...link,
    relationship_key: `${direction}:${getId(link.relationship_type)}`,
    relationship_label: direction === "source"
        ? link.relationship_type?.type_from
        : link.relationship_type?.type_to,
    institution: getId(link.institution),
    institution_name: link.institution?.name_primary || "",
});

const toFormValues = (institution) => ({
    ...institution,
    organization_type: getId(institution.organization_type),
    current_name: institution.names_actual?.[0] || { alternative_names: [] },
    names_former: institution.names_former || [],
    identifiers_local: (institution.identifiers_local || []).map(decodeIdentifier),
    identifiers_national: (institution.identifiers_national || []).map(decodeIdentifier),
    countries: (institution.countries || []).map((location) => ({
        ...location,
        country: getId(location.country),
    })),
    qf_ehea_levels: (institution.qf_ehea_levels || []).map(({ level }) => level),
    hierarchical_links: [
        ...(institution.hierarchical_parent || []).map((link) => decodeHierarchicalLink(link, "child")),
        ...(institution.hierarchical_child || []).map((link) => decodeHierarchicalLink(link, "parent")),
    ],
    historical_links: [
        ...(institution.historical_source || []).map((link) => decodeHistoricalLink(link, "source")),
        ...(institution.historical_target || []).map((link) => decodeHistoricalLink(link, "target")),
    ],
});

const encodeIdentifier = (identifier, local = false) => ({
    id: identifier.id,
    agency: local ? identifier.agency : null,
    identifier: identifier.identifier,
    resource: local ? "local identifier" : identifier.resource,
    note: identifier.note || "",
    identifier_valid_from: identifier.identifier_valid_from || null,
    identifier_valid_to: identifier.identifier_valid_to || null,
});

const encodeRelationship = (link) => ({
    id: link.id,
    institution: link.institution,
    relationship_type: link.relationship_type || null,
    relationship_note: link.relationship_note || "",
    valid_from: link.valid_from || null,
    valid_to: link.valid_to || null,
});

const encodeHistoricalRelationship = (link, relationshipType) => ({
    id: link.id,
    institution: link.institution,
    relationship_type: Number(relationshipType),
    relationship_note: link.relationship_note || "",
    relationship_date: link.relationship_date || null,
});

const normalizePayload = (values, institution = {}) => {
    const hierarchicalParent = [];
    const hierarchicalChild = [];
    (values.hierarchical_links || []).forEach((link) => {
        const target = link.direction === "parent" ? hierarchicalChild : hierarchicalParent;
        target.push(encodeRelationship(link));
    });

    const historicalSource = [];
    const historicalTarget = [];
    (values.historical_links || []).forEach((link) => {
        const [direction, relationshipType] = String(link.relationship_key || "").split(":");
        const target = direction === "target" ? historicalTarget : historicalSource;
        target.push(encodeHistoricalRelationship(link, relationshipType));
    });

    const currentName = {
        ...(institution.names_actual?.[0] || {}),
        ...values.current_name,
        name_valid_to: null,
        alternative_names: values.current_name?.alternative_names || [],
    };

    return {
        name_primary: institution.name_primary || "",
        website_link: values.website_link,
        founding_date: values.founding_date || null,
        closure_date: values.closure_date || null,
        identifiers: [
            ...(values.identifiers_local || []).map((item) => encodeIdentifier(item, true)),
            ...(values.identifiers_national || []).map((item) => encodeIdentifier(item, false)),
        ],
        names: [currentName, ...(values.names_former || []).map((name) => ({
            ...name,
            name_valid_to: name.name_valid_to || null,
            alternative_names: name.alternative_names || [],
        }))],
        countries: (values.countries || []).map((location) => ({
            ...location,
            country_valid_from: location.country_valid_from || null,
            country_valid_to: location.country_valid_to || null,
            country_verified: Boolean(location.country_verified),
        })),
        internal_note: values.internal_note || null,
        other_comment: values.other_comment || "",
        qf_ehea_levels: (values.qf_ehea_levels || []).map((level) => ({ level })),
        hierarchical_parent: hierarchicalParent,
        hierarchical_child: hierarchicalChild,
        historical_source: historicalSource,
        historical_target: historicalTarget,
        flags: (institution.flags || []).map((flag) => ({
            ...flag,
            flag: typeof flag.flag === "object" ? flag.flag.flag : flag.flag,
        })),
        is_other_provider: Boolean(values.is_other_provider),
        organization_type: values.organization_type || null,
        source_of_information: values.source_of_information || null,
        submit_comment: values.submit_comment || "",
    };
};

const CurrentAlternativeNames = ({ disabled }) => {
    const form = Form.useFormInstance();
    const names = Form.useWatch(["current_name", "alternative_names"], form);
    const lastName = Array.isArray(names) ? names.at(-1)?.name : null;
    const canAdd = !names?.length || Boolean(lastName?.trim());

    return (
        <Form.List name={["current_name", "alternative_names"]}>
            {(fields, { add, remove }) => (
                <div style={{ marginBottom: 12 }}>
                    <div className={style.RepeatHeader}>
                        <span>{fields.length ? "Alternative Institution Name" : ""}</span>
                        {!disabled && (
                            <Button
                                size="small"
                                icon={<PlusOutlined />}
                                disabled={!canAdd}
                                onClick={() => canAdd && add()}
                            >
                                Add Alternative Name
                            </Button>
                        )}
                    </div>
                    {fields.map((field) => (
                        <div className={style.RepeatRow} key={field.key}>
                            <Form.Item name={[field.name, "id"]} hidden><Input /></Form.Item>
                            <Form.Item
                                className={style.RepeatField}
                                name={[field.name, "name"]}
                                rules={[requiredRule]}
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
                </div>
            )}
        </Form.List>
    );
};

const Locations = ({ disabled, countryOptions }) => {
    const form = Form.useFormInstance();
    const locations = Form.useWatch("countries", form);
    const canAdd = !locations?.length || Boolean(locations.at(-1)?.country);

    return (
        <Form.List
            name="countries"
            rules={[{
                validator: async (_, items) => {
                    if (!items?.length) throw new Error("At least one location is required.");
                },
            }]}
        >
            {(fields, { add, remove }, { errors }) => {
                const removeRow = (field) => {
                    if (fields.length === 1) {
                        form.setFieldValue(["countries", field.name], {});
                    } else {
                        remove(field.name);
                    }
                };

                return (
                    <div style={{ marginBottom: 12 }}>
                        <div className={style.RepeatHeader}>
                            <span>Location *</span>
                            {!disabled && (
                                <Button
                                    size="small"
                                    icon={<PlusOutlined />}
                                    disabled={!canAdd}
                                    onClick={() => canAdd && add({})}
                                >
                                    Add New Location
                                </Button>
                            )}
                        </div>
                        {fields.map((field) => (
                            <Row gutter={8} key={field.key} align="top">
                                <Form.Item name={[field.name, "id"]} hidden><Input /></Form.Item>
                                <Col xs={24} md={10}>
                                    <Form.Item name={[field.name, "country"]} rules={[requiredRule]}>
                                        <Select
                                            disabled={disabled}
                                            showSearch
                                            optionFilterProp="label"
                                            options={countryOptions}
                                            placeholder="Please select country"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col xs={20} md={9}>
                                    <Form.Item name={[field.name, "city"]}>
                                        <Input disabled={disabled} placeholder="Please enter city name" />
                                    </Form.Item>
                                </Col>
                                <Col xs={4} md={3}>
                                    <Form.Item name={[field.name, "country_verified"]} valuePropName="checked">
                                        <Checkbox disabled={disabled}>Official</Checkbox>
                                    </Form.Item>
                                </Col>
                                {!disabled && (
                                    <Col xs={24} md={2}>
                                        <Button
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            aria-label="Remove location"
                                            onClick={() => removeRow(field)}
                                        />
                                    </Col>
                                )}
                            </Row>
                        ))}
                        <Form.ErrorList errors={errors} />
                    </div>
                );
            }}
        </Form.List>
    );
};

const InstitutionForm = ({ mode, id }) => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const isAdmin = Boolean(session?.user?.is_admin);
    const readOnly = mode === "view";
    const creating = mode === "create";
    const [form] = Form.useForm();
    const initializedInstitution = useRef(null);
    const submitCommentRef = useRef(null);
    const [dirty, setDirty] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
    const [submitMessageOpen, setSubmitMessageOpen] = useState(false);
    const detailEndpoint = id ? institutionsApi.detail(id) : null;
    const { data: institution, error: loadError, isLoading } = useSWR(detailEndpoint);
    const { data: countriesResponse } = useSWR(institutionsApi.countries);
    const { data: organizationTypesResponse } = useSWR(institutionsApi.organizationTypes);
    const { data: qfEheaLevelsResponse } = useSWR(institutionsApi.qfEheaLevels);
    const { data: agenciesResponse } = useSWR(institutionsApi.agencies);
    const { data: allAgenciesResponse } = useSWR(institutionsApi.allAgencies);
    const { data: identifierResourcesResponse } = useSWR(institutionsApi.identifierResources);
    const { data: hierarchicalTypesResponse } = useSWR(institutionsApi.hierarchicalRelationshipTypes);
    const { data: historicalTypesResponse } = useSWR(institutionsApi.historicalRelationshipTypes);
    const isOtherProvider = Form.useWatch("is_other_provider", form);
    const closureDate = Form.useWatch("closure_date", form);

    const countryOptions = asList(countriesResponse).map(({ id: value, name_english, iso_3166_alpha2 }) => ({
        value,
        label: `${name_english} (${iso_3166_alpha2})`,
    }));
    const organizationTypeOptions = asList(organizationTypesResponse).map(({ id: value, type: label }) => ({ value, label }));
    const qfLevelOptions = asList(qfEheaLevelsResponse).map(({ level, code }) => ({
        value: level,
        label: code ? `${level} (${code})` : level,
    }));
    const agencyOptions = asList(agenciesResponse).map(({ id: value, acronym_primary: label }) => ({ value, label }));
    const sourceOptions = asList(allAgenciesResponse).map(({ acronym_primary: value }) => ({ value }));
    const resourceOptions = asList(identifierResourcesResponse).map(({ resource: value, title }) => ({
        value,
        label: title ? `${value} — ${title}` : value,
    }));
    const hierarchicalTypeOptions = asList(hierarchicalTypesResponse).map(({ id: value, type: label }) => ({ value, label }));
    const historicalTypeOptions = asList(historicalTypesResponse).map((item) => ({
        value: `${item.institution_direction}:${item.relationship_type_id}`,
        label: item.relationship,
    }));

    useEffect(() => {
        if (institution && initializedInstitution.current !== institution.id) {
            form.setFieldsValue(toFormValues(institution));
            initializedInstitution.current = institution.id;
        }
    }, [form, institution]);

    useEffect(() => {
        const warnBeforeUnload = (event) => {
            if (!dirty || readOnly) return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", warnBeforeUnload);
        return () => window.removeEventListener("beforeunload", warnBeforeUnload);
    }, [dirty, readOnly]);

    useEffect(() => {
        if (!submitMessageOpen) return undefined;
        const frame = window.requestAnimationFrame(() => submitCommentRef.current?.focus({ cursor: "end" }));
        return () => window.cancelAnimationFrame(frame);
    }, [submitMessageOpen]);

    const { saving, generalErrors, submit } = useEntityForm({
        form,
        endpoint: creating ? institutionsApi.create : institutionsApi.detail(id),
        method: creating ? "post" : "put",
        entityName: "Education provider",
        normalize: (values) => normalizePayload(values, institution),
        onSuccess: (saved) => {
            setDirty(false);
            router.push(`/reference/institutions/view/${saved?.id || id}`);
        },
    });

    const cancel = () => {
        if (!dirty || window.confirm("Discard the unsaved changes?")) {
            router.push(creating || readOnly ? "/reference/institutions" : `/reference/institutions/view/${id}`);
        }
    };

    const revealSubmitMessage = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setSubmitMessageOpen(true);
    };

    if (status === "loading" || (!creating && !id) || (id && isLoading)) {
        return <div className={style.Loading}><Spin size="large" /></div>;
    }

    if (!readOnly && !isAdmin) {
        return <Result status="403" title="403" subTitle="Only administrators can modify education provider records." />;
    }

    if (loadError) {
        return (
            <Result
                status={loadError?.response?.status === 404 ? "404" : "error"}
                title="Education provider could not be loaded"
                subTitle={loadError?.response?.data?.detail || loadError.message}
                extra={<Link href="/reference/institutions"><Button>Back to education providers</Button></Link>}
            />
        );
    }

    const foundingDateRule = {
        validator(_, value) {
            if (!value || !closureDate || value < closureDate) return Promise.resolve();
            return Promise.reject(new Error("Founding date must be earlier than closing date."));
        },
    };

    return (
        <Form
            form={form}
            layout="vertical"
            scrollToFirstError
            initialValues={{
                is_other_provider: false,
                current_name: { alternative_names: [] },
                names_former: [],
                identifiers_local: [],
                identifiers_national: [],
                countries: [{}],
                qf_ehea_levels: [],
                hierarchical_links: [],
                historical_links: [],
            }}
            onValuesChange={() => setDirty(true)}
            onFinish={submit}
        >
            {generalErrors.length > 0 && (
                <Alert
                    closable
                    type="error"
                    showIcon
                    message="The record could not be saved"
                    description={generalErrors.map((message, index) => <div key={index}>{message}</div>)}
                    className={style.FormAlert}
                />
            )}
            <Row gutter={24}>
                <Col xs={24} xl={12}>
                    <Row gutter={12}>
                        <Col xs={24} md={12}>
                            <Form.Item name="deqar_id" label="DEQAR ID"><Input disabled /></Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="eter_id" label="ETER ID"><Input disabled /></Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col xs={24} md={12}>
                            <Form.Item name="is_other_provider" label="Other Provider" valuePropName="checked">
                                <Checkbox disabled={!creating} aria-label="Other Provider" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="organization_type" label="Organization Type">
                                <Select
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    options={organizationTypeOptions}
                                    placeholder="Select organization type"
                                    disabled={readOnly || !isOtherProvider}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <TransliteratedInput
                        name={["current_name", "name_official"]}
                        transliterationName={["current_name", "name_official_transliterated"]}
                        label="Institution Name, Official"
                        rules={[requiredRule]}
                        disabled={readOnly}
                        maxLength={200}
                        onTransliterationChange={() => setDirty(true)}
                    />
                    <Form.Item name={["current_name", "name_english"]} label="Institution Name, English">
                        <Input disabled={readOnly} maxLength={200} />
                    </Form.Item>
                    <CurrentAlternativeNames disabled={readOnly} />
                    <Row gutter={12}>
                        <Col xs={24} md={12}>
                            <Form.Item name={["current_name", "acronym"]} label="Institution Acronym">
                                <Input disabled={readOnly} maxLength={30} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="website_link" label="Institution Website" rules={requiredUrlRule}>
                                <Input disabled={readOnly} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="names_former" noStyle>
                        <FormerNames disabled={readOnly} />
                    </Form.Item>
                    <Form.Item name="identifiers_local" noStyle>
                        <LocalIdentifiers disabled={readOnly} agencyOptions={agencyOptions} />
                    </Form.Item>
                    <Form.Item
                        name="identifiers_national"
                        noStyle
                        rules={!isOtherProvider ? [{
                            validator: async (_, items) => {
                                if (!items?.length) throw new Error("At least one other ID is required.");
                            },
                        }] : []}
                    >
                        <NationalIdentifiers
                            disabled={readOnly}
                            resourceOptions={resourceOptions}
                            required={!isOtherProvider}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} xl={12}>
                    <Locations disabled={readOnly} countryOptions={countryOptions} />
                    <Row gutter={12}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="founding_date"
                                label="Founding Date"
                                dependencies={["closure_date"]}
                                rules={[foundingDateRule]}
                            >
                                <FormDatePicker disabled={readOnly} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="closure_date" label="Closing Date">
                                <FormDatePicker disabled={readOnly} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item
                        name="qf_ehea_levels"
                        label="QF-EHEA Levels"
                        rules={isOtherProvider ? [requiredRule] : []}
                    >
                        <Select
                            mode="multiple"
                            disabled={readOnly}
                            options={qfLevelOptions}
                            placeholder="Please select"
                        />
                    </Form.Item>
                    <Form.Item name="other_comment" label="Other comment (optional)">
                        <Input.TextArea disabled={readOnly} autoSize={{ minRows: 3, maxRows: 8 }} />
                    </Form.Item>
                    <Form.Item name="historical_links" noStyle>
                        <HistoricalLinks
                            disabled={readOnly}
                            relationshipTypeOptions={historicalTypeOptions}
                        />
                    </Form.Item>
                    <Form.Item name="hierarchical_links" noStyle>
                        <HierarchicalLinks
                            disabled={readOnly}
                            relationshipTypeOptions={hierarchicalTypeOptions}
                        />
                    </Form.Item>
                    <Form.Item
                        name="source_of_information"
                        label="Source of information about the provider"
                        rules={isOtherProvider ? [requiredRule] : []}
                    >
                        <AutoComplete
                            disabled={readOnly}
                            options={sourceOptions}
                            placeholder="Enter or select a source"
                            filterOption={(input, option) => option.value.toLowerCase().includes(input.toLowerCase())}
                        />
                    </Form.Item>
                </Col>
            </Row>
            {mode === "edit" && (
                <SlideToggle open={submitMessageOpen}>
                    <Form.Item name="submit_comment" label="Description of this edit (optional)">
                        <Input ref={submitCommentRef} placeholder="Please enter a short description of your edit…" />
                    </Form.Item>
                </SlideToggle>
            )}
            <div className={style.Actions}>
                <Space wrap>
                    <Button onClick={cancel}>Close</Button>
                    {!creating && (
                        <Button onClick={() => setInfoOpen((open) => !open)}>
                            {infoOpen ? "Hide Info" : "Show Info"}
                        </Button>
                    )}
                </Space>
                <Space wrap>
                    {readOnly && isAdmin && (
                        <Link href={`/reference/institutions/edit/${id}`}>
                            <Button type="primary" icon={<EditOutlined />}>Edit Education Provider</Button>
                        </Link>
                    )}
                    {!readOnly && (
                        <Button
                            type="primary"
                            htmlType={mode === "edit" && !submitMessageOpen ? "button" : "submit"}
                            loading={saving}
                            icon={<SaveOutlined />}
                            onClick={mode === "edit" && !submitMessageOpen ? revealSubmitMessage : undefined}
                        >
                            Save Education Provider
                        </Button>
                    )}
                </Space>
            </div>
            {!creating && (
                <SlideToggle open={infoOpen}>
                    <RecordInfoPanel record={institution} entityType="institution" disabled={readOnly} />
                </SlideToggle>
            )}
        </Form>
    );
};

export default InstitutionForm;
