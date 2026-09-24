import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Button,
    Checkbox,
    Col,
    Divider,
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
import { agenciesApi } from "@/features/agencies/api";
import { asList } from "@/lib/apiData";
import { useEntityForm } from "@/hooks/useEntityForm";
import RichTextEditor from "@/components/FormFields/RichTextEditor";
import FormDatePicker from "@/components/FormFields/FormDatePicker";
import TransliteratedInput from "@/components/FormFields/TransliteratedInput/TransliteratedInput";
import RecordInfoPanel from "@/components/RecordInfoPanel/RecordInfoPanel";
import SlideToggle from "@/components/SlideToggle/SlideToggle";
import {
    Activities,
    Decisions,
    FocusCountries,
    FormerNames,
    Memberships,
} from "@/features/agencies/AgencyEmbeddedForms";
import style from "./AgencyForm.module.scss";

const requiredRule = { required: true, message: "This field is required." };
const requiredUrlRule = [requiredRule, { type: "url", message: "Enter a valid URL." }];
const urlRule = { type: "url", message: "Enter a valid URL." };
const textAreaProps = { autoSize: { minRows: 3, maxRows: 10 } };

const getId = (value) => value && typeof value === "object" ? value.id : value;

const decodeNameSet = (nameSet = {}) => {
    const versions = nameSet.agency_name_versions || [];
    const primaryIndex = Math.max(0, versions.findIndex(
        (version) => version.name_is_primary || version.acronym_is_primary,
    ));
    return {
        ...nameSet,
        primary_name: versions[primaryIndex] || {},
        alternative_names: versions.filter((_, index) => index !== primaryIndex),
        agency_name_versions: undefined,
    };
};

const toFormValues = (agency) => {
    const currentNameSet = decodeNameSet(agency.names_actual?.[0]);
    return {
        ...agency,
        country: getId(agency.country),
        current_primary_name: currentNameSet.primary_name,
        current_alternative_names: currentNameSet.alternative_names,
        names_former: (agency.names_former || []).map(decodeNameSet),
        focus_countries: (agency.focus_countries || []).map((item) => ({
            ...item,
            country: getId(item.country),
        })),
        activities: (agency.activities || []).map((item) => ({
            ...item,
            activity_group: getId(item.activity_group),
        })),
        memberships: (agency.memberships || []).map((item) => ({
            ...item,
            association: getId(item.association),
        })),
        decisions: (agency.decisions || []).map((item) => ({
            ...item,
            decision_type: getId(item.decision_type),
        })),
    };
};

const encodeNameVersion = (version, primary = false) => ({
    ...version,
    name_is_primary: primary,
    acronym_is_primary: primary,
});

const encodeNameSet = (nameSet) => {
    const {
        primary_name: primaryName = {},
        alternative_names: alternativeNames = [],
        agency_name_versions: _versions,
        ...metadata
    } = nameSet;
    return {
        ...metadata,
        name_valid_to: metadata.name_valid_to || null,
        agency_name_versions: [
            encodeNameVersion(primaryName, true),
            ...alternativeNames.map((version) => encodeNameVersion(version, false)),
        ],
    };
};

const normalizePayload = (values, agency) => {
    const currentName = agency.names_actual?.[0] || {};
    const names = [encodeNameSet({
        ...currentName,
        name_valid_to: null,
        primary_name: values.current_primary_name,
        alternative_names: values.current_alternative_names || [],
    }), ...(values.names_former || []).map(encodeNameSet)];

    return {
        deqar_id: agency.deqar_id,
        contact_person: values.contact_person,
        fax: values.fax || "",
        address: values.address,
        country: values.country,
        website_link: values.website_link,
        reports_link: values.reports_link || null,
        description_note: values.description_note,
        specialisation_note: values.specialisation_note || "",
        is_registered: Boolean(values.is_registered),
        registration_start: values.registration_start || null,
        registration_valid_to: values.registration_valid_to || null,
        registration_note: values.registration_note || "",
        geographical_focus: getId(agency.geographical_focus) || null,
        related_agencies: (agency.related_agencies || []).map(getId),
        flag: getId(agency.flag) || undefined,
        flag_log: agency.flag_log || "",
        internal_note: values.internal_note || null,
        names,
        phone_numbers: values.phone_numbers || [],
        emails: values.emails || [],
        focus_countries: (values.focus_countries || []).map((item) => ({
            ...item,
            country_valid_to: item.country_valid_to || null,
        })),
        activities: (values.activities || []).map((item) => ({
            ...item,
            activity_valid_to: item.activity_valid_to || null,
        })),
        memberships: (values.memberships || []).map((item) => ({
            ...item,
            membership_valid_to: item.membership_valid_to || null,
        })),
        decisions: (values.decisions || []).map((item) => ({
            id: item.id,
            decision_date: item.decision_date,
            decision_type: item.decision_type,
            decision_file_name: item.decision_file_name || "",
            ...(item.decision_file_upload ? { decision_file_upload: item.decision_file_upload } : {}),
            decision_file_extra_name: item.decision_file_extra_name || "",
            ...(item.decision_file_extra_upload
                ? { decision_file_extra_upload: item.decision_file_extra_upload }
                : {}),
        })),
        submit_comment: values.submit_comment || "",
    };
};

const normalizeUserPayload = (values) => ({
    contact_person: values.contact_person,
    fax: values.fax || "",
    address: values.address,
    website_link: values.website_link,
    phone_numbers: values.phone_numbers || [],
    emails: values.emails || [],
    activities: (values.activities || []).map((item) => ({
        id: item.id,
        activity_local_identifier: item.activity_local_identifier || "",
        reports_link: item.reports_link || "",
    })),
    submit_comment: values.submit_comment || "",
});

const CurrentAlternativeNames = ({ disabled, onTransliterationChange }) => (
    <Form.List name="current_alternative_names">
        {(fields, { add, remove }) => (
            <div style={{ marginBottom: 12 }}>
                <div className={style.RepeatHeader}>
                    <span>Agency Alternative Names / Acronyms</span>
                    {!disabled && (
                        <Button size="small" icon={<PlusOutlined />} onClick={() => add()}>
                            Add Alternative Name / Acronym
                        </Button>
                    )}
                </div>
                {fields.map((field) => (
                    <Row gutter={8} key={field.key}>
                        <Col xs={24} md={11}>
                            <TransliteratedInput
                                name={[field.name, "name"]}
                                transliterationName={[field.name, "name_transliterated"]}
                                transliterationPath={["current_alternative_names", field.name, "name_transliterated"]}
                                disabled={disabled}
                                placeholder="Alternative name"
                                maxLength={200}
                                onTransliterationChange={onTransliterationChange}
                            />
                        </Col>
                        <Col xs={20} md={11}>
                            <TransliteratedInput
                                name={[field.name, "acronym"]}
                                transliterationName={[field.name, "acronym_transliterated"]}
                                transliterationPath={["current_alternative_names", field.name, "acronym_transliterated"]}
                                disabled={disabled}
                                placeholder="Alternative acronym"
                                maxLength={20}
                                onTransliterationChange={onTransliterationChange}
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
            </div>
        )}
    </Form.List>
);

const RepeatableContact = ({ name, field, label, placeholder, disabled, email = false, onChange }) => {
    const form = Form.useFormInstance();
    const values = Form.useWatch(name, form);
    const currentValue = Array.isArray(values) ? values.at(-1)?.[field] : undefined;
    const canAdd = typeof currentValue === "string" ? Boolean(currentValue.trim()) : Boolean(currentValue);

    return (
        <Form.List
            name={name}
            rules={[{
                validator: async (_, items) => {
                    if (!items?.length) throw new Error(`At least one ${label.toLowerCase()} is required.`);
                },
            }]}
        >
            {(fields, { add, remove }, { errors }) => {
                const removeRow = (item) => {
                    if (fields.length === 1) {
                        form.setFieldValue([name, item.name, field], "");
                        onChange?.();
                    } else {
                        remove(item.name);
                    }
                };

                return (
                    <div style={{ marginBottom: 12 }}>
                        <div className={style.RepeatHeader}>
                            <span>{label}</span>
                            {!disabled && (
                                <Button
                                    size="small"
                                    icon={<PlusOutlined />}
                                    disabled={!canAdd}
                                    onClick={() => canAdd && add()}
                                >
                                    Add
                                </Button>
                            )}
                        </div>
                        {fields.map((item) => (
                            <div className={style.RepeatRow} key={item.key}>
                                <Form.Item name={[item.name, "id"]} hidden><Input /></Form.Item>
                                <Form.Item
                                    className={style.RepeatField}
                                    name={[item.name, field]}
                                    rules={[requiredRule, ...(email ? [{ type: "email", message: "Enter a valid email." }] : [])]}
                                >
                                    <Input disabled={disabled} placeholder={placeholder} />
                                </Form.Item>
                                {!disabled && (
                                    <Button
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        aria-label={`Remove ${label}`}
                                        onClick={() => removeRow(item)}
                                    />
                                )}
                            </div>
                        ))}
                        <Form.ErrorList errors={errors} />
                    </div>
                );
            }}
        </Form.List>
    );
};

const AgencyForm = ({ mode, id, scope = "reference" }) => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const isAdmin = Boolean(session?.user?.is_admin);
    const readOnly = mode === "view";
    const userScoped = scope === "my";
    const adminFieldDisabled = readOnly || userScoped;
    const listPath = userScoped ? "/my-agencies" : "/reference/agencies";
    const viewPath = userScoped ? `/my-agencies/view/${id}` : `/reference/agencies/view/${id}`;
    const [form] = Form.useForm();
    const initializedAgency = useRef(null);
    const submitCommentRef = useRef(null);
    const [dirty, setDirty] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
    const [submitMessageOpen, setSubmitMessageOpen] = useState(false);
    const detailEndpoint = id
        ? userScoped ? agenciesApi.myDetail(id) : agenciesApi.detail(id)
        : null;
    const { data: agency, error: loadError, isLoading, mutate: refreshAgency } = useSWR(detailEndpoint);
    const { data: countriesResponse } = useSWR(agenciesApi.countries);
    const { data: associationsResponse } = useSWR(agenciesApi.associations);
    const { data: decisionTypesResponse } = useSWR(agenciesApi.decisionTypes);
    const { data: activityGroupsResponse, mutate: refreshActivityGroups } = useSWR(agenciesApi.activityGroups);
    const { data: activityTypesResponse } = useSWR(agenciesApi.activityTypes);
    const registrationStart = Form.useWatch("registration_start", form);
    const registrationValidTo = Form.useWatch("registration_valid_to", form);

    const countryOptions = asList(countriesResponse).map(({ id: value, name_english: label }) => ({ value, label }));
    const associationOptions = asList(associationsResponse).map(({ id: value, association: label }) => ({ value, label }));
    const decisionTypeOptions = asList(decisionTypesResponse).map(({ id: value, type: label }) => ({ value, label }));
    const activityGroupOptions = asList(activityGroupsResponse).map(({
        id: value,
        display_value: label,
        activity_type: activityType,
    }) => ({ value, label, activityType }));
    const activityTypeOptions = asList(activityTypesResponse).map(({ id: value, type: label }) => ({ value, label }));

    useEffect(() => {
        const initializationKey = agency ? `${scope}:${mode}:${agency.id}` : null;
        if (agency && initializedAgency.current !== initializationKey) {
            form.setFieldsValue(toFormValues(agency));
            initializedAgency.current = initializationKey;
        }
    }, [agency, form, mode, scope]);

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
        endpoint: userScoped ? agenciesApi.myDetail(id) : agenciesApi.detail(id),
        method: "put",
        entityName: "Agency",
        normalize: (values) => userScoped
            ? normalizeUserPayload(values)
            : normalizePayload(values, agency),
        onSuccess: async (savedAgency) => {
            setDirty(false);
            if (savedAgency) {
                await refreshAgency(savedAgency, { revalidate: false });
            }
            try {
                await refreshAgency();
            } catch {
                // The saved response remains in the cache if revalidation is unavailable.
            }
            await router.push(viewPath);
        },
    });

    const cancel = () => {
        if (!dirty || window.confirm("Discard the unsaved changes?")) {
            router.push(readOnly ? listPath : viewPath);
        }
    };

    const revealSubmitMessage = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setSubmitMessageOpen(true);
    };

    if (status === "loading" || !id || isLoading) {
        return <div className={style.Loading}><Spin size="large" /></div>;
    }

    if (!readOnly && !isAdmin && !userScoped) {
        return <Result status="403" title="403" subTitle="Only administrators can modify agency records." />;
    }

    if (loadError) {
        return (
            <Result
                status={loadError?.response?.status === 404 ? "404" : "error"}
                title="Agency could not be loaded"
                subTitle={loadError?.response?.data?.detail || loadError.message}
                extra={<Link href={listPath}><Button>Back to agencies</Button></Link>}
            />
        );
    }

    const registrationStartRule = ({ getFieldValue }) => ({
        validator(_, value) {
            const validTo = getFieldValue("registration_valid_to");
            if (!value || !validTo || value < validTo) return Promise.resolve();
            return Promise.reject(new Error("Registration start must be earlier than registration end."));
        },
    });

    return (
        <Form
            form={form}
            layout="vertical"
            scrollToFirstError
            initialValues={{
                is_registered: true,
                current_primary_name: {},
                current_alternative_names: [],
                names_former: [],
                phone_numbers: [{}],
                emails: [{}],
                focus_countries: [],
                activities: [],
                memberships: [],
                decisions: [],
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
                        <Col xs={24} md={14}>
                            <TransliteratedInput
                                name={["current_primary_name", "name"]}
                                transliterationName={["current_primary_name", "name_transliterated"]}
                                label="Agency Name, Primary"
                                rules={userScoped ? [] : [requiredRule]}
                                disabled={adminFieldDisabled}
                                maxLength={200}
                                onTransliterationChange={() => setDirty(true)}
                            />
                        </Col>
                        <Col xs={24} md={10}>
                            <TransliteratedInput
                                name={["current_primary_name", "acronym"]}
                                transliterationName={["current_primary_name", "acronym_transliterated"]}
                                label="Agency Acronym, Primary"
                                rules={userScoped ? [] : [requiredRule]}
                                disabled={adminFieldDisabled}
                                maxLength={20}
                                onTransliterationChange={() => setDirty(true)}
                            />
                        </Col>
                    </Row>
                    <CurrentAlternativeNames
                        disabled={adminFieldDisabled}
                        onTransliterationChange={() => setDirty(true)}
                    />
                    <Form.Item name="names_former" noStyle>
                        <FormerNames disabled={adminFieldDisabled} />
                    </Form.Item>
                    <Form.Item name="website_link" label="Agency Website" rules={requiredUrlRule}>
                        <Input disabled={readOnly} />
                    </Form.Item>
                    <Form.Item name="reports_link" label="Reports by the Agency" rules={userScoped ? [] : [urlRule]}>
                        <Input disabled={adminFieldDisabled} />
                    </Form.Item>
                    <Divider orientation="left">Contact</Divider>
                    <Form.Item name="contact_person" label="Contact Person" rules={[requiredRule]}>
                        <Input disabled={readOnly} maxLength={150} />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col xs={24} md={12}>
                            <RepeatableContact
                                name="phone_numbers"
                                field="phone"
                                label="Contact Phone"
                                placeholder="Enter phone number"
                                disabled={readOnly}
                                onChange={() => setDirty(true)}
                            />
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="fax" label="Contact Fax">
                                <Input disabled={readOnly} maxLength={20} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <RepeatableContact
                        name="emails"
                        field="email"
                        label="Contact Email"
                        placeholder="Enter contact email address"
                        disabled={readOnly}
                        onChange={() => setDirty(true)}
                        email
                    />
                    <Form.Item name="address" label="Address" rules={[requiredRule]}>
                        <RichTextEditor disabled={readOnly} />
                    </Form.Item>
                    <Form.Item name="country" label="Country" rules={userScoped ? [] : [requiredRule]}>
                        <Select
                            disabled={adminFieldDisabled}
                            showSearch
                            optionFilterProp="label"
                            options={countryOptions}
                            placeholder="Select country"
                        />
                    </Form.Item>
                    <Form.Item name="memberships" noStyle>
                        <Memberships disabled={adminFieldDisabled} associationOptions={associationOptions} />
                    </Form.Item>
                </Col>
                <Col xs={24} xl={12}>
                    <Divider orientation="left">Register</Divider>
                    <Row gutter={12} align="middle">
                        <Col xs={24} md={9}>
                            <Form.Item
                                name="registration_start"
                                label="Valid From"
                                dependencies={["registration_valid_to"]}
                                rules={userScoped ? [] : [registrationStartRule]}
                            >
                                <FormDatePicker disabled={adminFieldDisabled} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={9}>
                            <Form.Item name="registration_valid_to" label="Valid To">
                                <FormDatePicker disabled={adminFieldDisabled} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                            <Form.Item name="is_registered" label="Registered" valuePropName="checked">
                                <Checkbox disabled={adminFieldDisabled} aria-label="Registered" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="registration_note" label="Registration Note">
                        <RichTextEditor disabled={adminFieldDisabled} />
                    </Form.Item>
                    <Form.Item name="decisions" noStyle>
                        <Decisions disabled={adminFieldDisabled} decisionTypeOptions={decisionTypeOptions} />
                    </Form.Item>
                    <Form.Item name="description_note" label="Description Note" rules={userScoped ? [] : [requiredRule]}>
                        <RichTextEditor disabled={adminFieldDisabled} />
                    </Form.Item>
                    <Form.Item name="activities" noStyle>
                        <Activities
                            disabled={adminFieldDisabled}
                            activityGroupOptions={activityGroupOptions}
                            activityTypeOptions={activityTypeOptions}
                            refreshActivityGroups={refreshActivityGroups}
                            registrationStart={registrationStart}
                            registrationValidTo={registrationValidTo}
                        />
                    </Form.Item>
                    <Form.Item name="focus_countries" noStyle>
                        <FocusCountries disabled={adminFieldDisabled} countryOptions={countryOptions} />
                    </Form.Item>
                    <Form.Item name="specialisation_note" label="Specialisation Note">
                        <RichTextEditor disabled={adminFieldDisabled} />
                    </Form.Item>
                </Col>
            </Row>
            {!readOnly && (
                <SlideToggle open={submitMessageOpen}>
                    <Form.Item name="submit_comment" label="Description of this edit (optional)">
                        <Input
                            ref={submitCommentRef}
                            placeholder="Please enter a short description of your edit…"
                        />
                    </Form.Item>
                </SlideToggle>
            )}
            <div className={style.Actions}>
                <Space wrap>
                    <Button onClick={cancel}>Close</Button>
                    <Button onClick={() => setInfoOpen((open) => !open)}>
                        {infoOpen ? "Hide Info" : "Show Info"}
                    </Button>
                </Space>
                <Space wrap>
                    {readOnly && (isAdmin || userScoped) && (
                        <Link href={userScoped ? `/my-agencies/edit/${id}` : `/reference/agencies/edit/${id}`}>
                            <Button type="primary" icon={<EditOutlined />}>Edit Agency</Button>
                        </Link>
                    )}
                    {!readOnly && (
                        <Button
                            type="primary"
                            htmlType={!submitMessageOpen ? "button" : "submit"}
                            loading={saving}
                            icon={<SaveOutlined />}
                            onClick={!submitMessageOpen ? revealSubmitMessage : undefined}
                        >
                            Save Agency
                        </Button>
                    )}
                </Space>
            </div>
            <SlideToggle open={infoOpen}>
                <RecordInfoPanel record={agency} entityType="agency" disabled={readOnly} />
            </SlideToggle>
        </Form>
    );
};

export default AgencyForm;
