import { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    App,
    Button,
    Col,
    Form,
    Input,
    Result,
    Row,
    Select,
    Space,
    Spin,
} from "antd";
import { DeleteOutlined, EditOutlined, SaveOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { reportsApi } from "@/features/reports/api";
import { asList } from "@/lib/apiData";
import { http } from "@/lib/http";
import { useEntityForm } from "@/hooks/useEntityForm";
import FormDatePicker from "@/components/FormFields/FormDatePicker";
import RichTextEditor from "@/components/FormFields/RichTextEditor";
import RecordInfoPanel from "@/components/RecordInfoPanel/RecordInfoPanel";
import SlideToggle from "@/components/SlideToggle/SlideToggle";
import {
    activityLabel,
    AssignedRecords,
    InstitutionRecords,
    Programmes,
    ReportFiles,
    ReportLinks,
} from "@/features/reports/ReportEmbeddedForms";
import style from "./ReportForm.module.scss";

const requiredRule = { required: true, message: "This field is required." };
const getId = (value) => value && typeof value === "object" ? value.id : value;

const uniqueById = (items) => {
    const seen = new Set();
    return items.filter((item) => {
        if (item?.id == null || seen.has(String(item.id))) return false;
        seen.add(String(item.id));
        return true;
    });
};

const detectActivityType = (activities = []) => {
    let type = "institutional";
    activities.forEach((activity) => {
        if (["programme", "institutional/programme"].includes(activity.activity_type) && type === "institutional") {
            type = activity.activity_type;
        }
        if (activity.activity_type === "joint programme") type = "joint programme";
    });
    return type;
};

const decodeProgramme = (programme) => {
    const names = programme.alternative_names || [];
    const primary = names.find((name) => name.name_is_primary) || {};
    return {
        ...programme,
        alternative_name_id: primary.id,
        name_primary: primary.name_alternative || programme.name_primary || "",
        qualification_primary: primary.qualification_alternative || programme.qualification_primary || "",
        alternative_names: names.filter((name) => !name.name_is_primary),
        qf_ehea_level: getId(programme.qf_ehea_level),
        countries: (programme.countries || []).map(getId),
        degree_outcome: getId(programme.degree_outcome),
        assessment_certification: getId(programme.assessment_certification),
        field_study: programme.field_study,
        learning_outcomes: programme.learning_outcomes || [],
    };
};

const toFormValues = (report) => ({
    ...report,
    agency: getId(report.agency),
    contributing_agencies: (report.contributing_agencies || []).map(getId),
    activities: report.activities || [],
    status: getId(report.status),
    decision: getId(report.decision),
    institutions: report.institutions || [],
    platforms: report.platforms || [],
    programmes: (report.programmes || []).map(decodeProgramme),
    report_files: (report.report_files || []).map((file) => ({
        ...file,
        report_language: (file.report_language || []).map(getId),
    })),
    report_links: report.report_links || [],
});

const encodeProgramme = (programme) => ({
    id: programme.id,
    name_primary: programme.name_primary,
    alternative_names: [
        ...(programme.alternative_names || []).map((name) => ({ ...name, name_is_primary: false })),
        {
            id: programme.alternative_name_id,
            name_alternative: programme.name_primary,
            qualification_alternative: programme.qualification_primary || "",
            name_is_primary: true,
        },
    ],
    nqf_level: programme.nqf_level || "",
    qf_ehea_level: programme.qf_ehea_level || null,
    countries: programme.countries || [],
    degree_outcome: programme.degree_outcome,
    workload_ects: programme.workload_ects || null,
    assessment_certification: programme.assessment_certification || null,
    learning_outcomes: (programme.learning_outcomes || [])
        .filter((outcome) => outcome.learning_outcome)
        .map((outcome) => ({ ...outcome, learning_outcome: getId(outcome.learning_outcome) })),
    learning_outcome_description: programme.learning_outcome_description || "",
    field_study: getId(programme.field_study) || null,
    mc_as_part_of_accreditation: Boolean(programme.mc_as_part_of_accreditation),
});

const encodeFile = (file) => ({
    id: file.id,
    display_name: file.display_name || "",
    original_location: file.original_location || "",
    report_language: file.report_language || [],
    filename: file.filename || "",
    ...(file.fileupload ? { fileupload: file.fileupload } : {}),
});

const normalizePayload = (values) => ({
    agency: values.agency,
    contributing_agencies: values.contributing_agencies || [],
    activities: (values.activities || []).map(getId),
    local_identifier: values.local_identifier || "",
    status: values.status,
    decision: values.decision,
    summary: values.summary || "",
    institutions: (values.institutions || []).map(getId),
    platforms: (values.platforms || []).map(getId),
    programmes: (values.programmes || []).map(encodeProgramme),
    report_links: values.report_links || [],
    report_files: (values.report_files || []).map(encodeFile),
    valid_from: values.valid_from,
    valid_to: values.valid_to || null,
    other_comment: values.other_comment || "",
    internal_note: values.internal_note || null,
    submit_comment: values.submit_comment || "",
});

const ReportForm = ({ mode, id, scope = "reference" }) => {
    const router = useRouter();
    const { modal, notification } = App.useApp();
    const { data: session, status: sessionStatus } = useSession();
    const isAdmin = Boolean(session?.user?.is_admin);
    const readOnly = mode === "view";
    const creating = mode === "create";
    const userScoped = scope === "my";
    const listPath = userScoped ? "/my-reports" : "/reference/reports";
    const viewPath = userScoped ? `/my-reports/view/${id}` : `/reference/reports/view/${id}`;
    const [form] = Form.useForm();
    const initializedReport = useRef(null);
    const submitCommentRef = useRef(null);
    const [dirty, setDirty] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
    const [submitMessageOpen, setSubmitMessageOpen] = useState(false);
    const { data: report, error: loadError, isLoading, mutate: refreshReport } = useSWR(
        id ? reportsApi.detail(id) : null,
    );
    const { data: agenciesResponse } = useSWR(reportsApi.agencies);
    const { data: allAgenciesResponse } = useSWR(reportsApi.allAgencies);
    const { data: statusesResponse } = useSWR(reportsApi.statuses);
    const { data: decisionsResponse } = useSWR(reportsApi.decisions);
    const { data: languagesResponse } = useSWR(reportsApi.languages);
    const { data: qfLevelsResponse } = useSWR(reportsApi.qfEheaLevels);
    const { data: countriesResponse } = useSWR(reportsApi.countries);
    const { data: degreeOutcomesResponse } = useSWR(reportsApi.degreeOutcomes);
    const { data: assessmentsResponse } = useSWR(reportsApi.assessments);
    const agency = Form.useWatch("agency", form);
    const watchedContributingAgencies = Form.useWatch("contributing_agencies", form);
    const contributingAgencies = useMemo(
        () => watchedContributingAgencies || [],
        [watchedContributingAgencies],
    );
    const activities = Form.useWatch("activities", form) || [];
    const institutions = Form.useWatch("institutions", form) || [];
    const platforms = Form.useWatch("platforms", form) || [];
    const validTo = Form.useWatch("valid_to", form);

    const activityEndpoint = useMemo(() => {
        const agencyIds = [agency, ...contributingAgencies].filter(Boolean);
        if (!agencyIds.length) return null;
        const params = new URLSearchParams();
        agencyIds.forEach((agencyId) => params.append("agencies", String(agencyId)));
        return `${reportsApi.activities}?${params.toString()}`;
    }, [agency, contributingAgencies]);
    const { data: activitiesResponse, isLoading: activitiesLoading } = useSWR(activityEndpoint);

    const agencyRecords = uniqueById([
        ...asList(agenciesResponse),
        ...asList(allAgenciesResponse),
        ...(report?.agency ? [report.agency] : []),
        ...(report?.contributing_agencies || []),
    ]);
    const agencyOptions = agencyRecords.map(({ id: value, acronym_primary: label }) => ({ value, label }));
    const contributingAgencyOptions = asList(allAgenciesResponse).map(({ id: value, acronym_primary: label }) => ({ value, label }));
    const activityRecords = uniqueById([...(report?.activities || []), ...asList(activitiesResponse)]);
    const activityOptions = activityRecords.map((activity) => ({
        value: activity.id,
        label: activityLabel(activity),
        record: activity,
    }));
    const statusOptions = asList(statusesResponse).map(({ id: value, status: label }) => ({ value, label: `${value} - ${label}` }));
    const decisionOptions = asList(decisionsResponse).map(({ id: value, decision: label }) => ({ value, label: `${value} - ${label}` }));
    const languageOptions = asList(languagesResponse).map(({ id: value, language_name_en: label }) => ({ value, label }));
    const qfOptions = asList(qfLevelsResponse).map(({ id: value, level, code }) => ({
        value,
        label: code ? `${level} (${code})` : level,
    }));
    const countryOptions = asList(countriesResponse).map(({ id: value, name_english: label }) => ({ value, label }));
    const degreeOutcomeOptions = asList(degreeOutcomesResponse).map(({ id: value, outcome: label }) => ({ value, label: `${value} - ${label}` }));
    const assessmentOptions = asList(assessmentsResponse).map(({ id: value, assessment: label }) => ({ value, label }));
    const activityType = detectActivityType(activities);
    const programmesRequired = ["programme", "joint programme"].includes(activityType);

    useEffect(() => {
        const initializationKey = report ? `${scope}:${mode}:${report.id}` : null;
        if (report && initializedReport.current !== initializationKey) {
            form.setFieldsValue(toFormValues(report));
            initializedReport.current = initializationKey;
        }
    }, [form, mode, report, scope]);

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
        endpoint: creating ? reportsApi.create : reportsApi.detail(id),
        method: creating ? "post" : "put",
        entityName: "Report",
        normalize: normalizePayload,
        onSuccess: async (savedReport) => {
            setDirty(false);
            if (creating) {
                await router.push("/reference/reports");
                return;
            }
            if (savedReport) {
                await refreshReport(savedReport, { revalidate: false });
            }
            try {
                await refreshReport();
            } catch {
                // The saved response remains in the cache if revalidation is unavailable.
            }
            await router.push(viewPath);
        },
    });

    const cancel = () => {
        if (!dirty || window.confirm("Discard the unsaved changes?")) {
            router.push(creating || readOnly ? listPath : viewPath);
        }
    };

    const revealSubmitMessage = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setSubmitMessageOpen(true);
    };

    const requestDeletion = () => {
        modal.confirm({
            title: "Request deletion",
            content: "Mark this report with a deletion request?",
            okText: "Request Deletion",
            okButtonProps: { danger: true },
            async onOk() {
                await http.delete(reportsApi.detail(id));
                await refreshReport();
                setInfoOpen(true);
                notification.success({ title: "Deletion was requested" });
            },
        });
    };

    const removeFlag = (flagId) => {
        modal.confirm({
            title: "Remove flag",
            content: "Remove this flag from the report?",
            okText: "Remove Flag",
            okButtonProps: { danger: true },
            async onOk() {
                await http.delete(reportsApi.removeFlag(flagId));
                await refreshReport();
                notification.success({ title: "Flag was removed" });
            },
        });
    };

    if (sessionStatus === "loading" || (!creating && !id) || (id && isLoading)) {
        return <div className={style.Loading}><Spin size="large" /></div>;
    }

    if (mode === "edit" && !isAdmin && !userScoped) {
        return <Result status="403" title="403" subTitle="Only administrators can modify reports from Reference Data." />;
    }

    if (loadError) {
        return (
            <Result
                status={loadError?.response?.status === 404 ? "404" : "error"}
                title="Report could not be loaded"
                subTitle={loadError?.response?.data?.detail || loadError.message}
                extra={<Link href={listPath}><Button>Back to reports</Button></Link>}
            />
        );
    }

    const selectedAgencyAcronyms = [agency, ...contributingAgencies]
        .map((agencyId) => agencyRecords.find((item) => String(item.id) === String(agencyId))?.acronym_primary)
        .filter(Boolean);
    const allOtherProviders = Boolean(institutions.length)
        && institutions.every((institution) => institution.is_other_provider ?? institution.other_provider);

    const activityRule = {
        validator(_, value) {
            if (!value?.length) return Promise.reject(new Error("Please select at least one activity."));
            const selected = new Set(value.map((item) => item.agency));
            const required = new Set(selectedAgencyAcronyms);
            if (selected.size !== required.size || [...required].some((item) => !selected.has(item))) {
                return Promise.reject(new Error("Please select at least one activity per agency."));
            }
            return Promise.resolve();
        },
    };
    const institutionRule = {
        validator(_, value) {
            const minimum = activityType === "joint programme" ? 2 : 1;
            return value?.length >= minimum
                ? Promise.resolve()
                : Promise.reject(new Error(`Selection of minimum ${minimum === 1 ? "one institution" : "two institutions"} is required.`));
        },
    };
    const platformRule = {
        validator(_, value) {
            const institutionIds = new Set(institutions.map((item) => String(item.id)));
            return (value || []).some((item) => institutionIds.has(String(item.id)))
                ? Promise.reject(new Error("The same education provider cannot also be selected as a platform."))
                : Promise.resolve();
        },
    };
    const programmeRule = {
        validator(_, value) {
            const programmes = value || [];
            if (activityType === "joint programme" && programmes.length !== 1) {
                return Promise.reject(new Error("Exactly one programme record is required."));
            }
            if (activityType === "programme" && !programmes.length) {
                return Promise.reject(new Error("At least one programme record is required."));
            }
            const keys = programmes.map((programme) => `${programme.name_primary}|${programme.qf_ehea_level || ""}`);
            if (new Set(keys).size !== keys.length) {
                return Promise.reject(new Error("Programme names and QF-EHEA levels must be unique."));
            }
            return Promise.resolve();
        },
    };
    const statusRule = {
        validator(_, value) {
            return allOtherProviders && Number(value) !== 2
                ? Promise.reject(new Error("Status must be voluntary when all organisations are other providers."))
                : Promise.resolve();
        },
    };
    const validFromRule = {
        validator(_, value) {
            if (!value || !validTo || value < validTo) return Promise.resolve();
            return Promise.reject(new Error("Report valid from must be earlier than valid to."));
        },
    };

    return (
        <Form
            form={form}
            layout="vertical"
            scrollToFirstError
            initialValues={{
                contributing_agencies: [],
                activities: [],
                institutions: [],
                platforms: [],
                programmes: [],
                report_files: [],
                report_links: [],
            }}
            onValuesChange={() => setDirty(true)}
            onFinish={submit}
        >
            {generalErrors.length > 0 && (
                <Alert
                    closable
                    type="error"
                    showIcon
                    title="The report could not be saved"
                    description={generalErrors.map((message, index) => <div key={index}>{message}</div>)}
                    className={style.FormAlert}
                />
            )}
            <Row gutter={24}>
                <Col xs={24} xl={12}>
                    <Row gutter={12}>
                        <Col xs={24} md={12}>
                            <Form.Item name="agency" label="Agency" rules={[requiredRule]}>
                                <Select
                                    disabled={!creating}
                                    showSearch
                                    optionFilterProp="label"
                                    options={agencyOptions}
                                    placeholder="Select agency"
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="local_identifier" label="Local Report Identifier">
                                <Input disabled={readOnly} placeholder="Enter local report ID" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="contributing_agencies" label="Contributing Agencies">
                        <Select
                            mode="multiple"
                            disabled={readOnly}
                            showSearch
                            optionFilterProp="label"
                            options={contributingAgencyOptions}
                            placeholder="Please select multiple, if necessary"
                        />
                    </Form.Item>
                    <Form.Item name="summary" label="Summary">
                        <RichTextEditor disabled={readOnly} />
                    </Form.Item>
                    <Form.Item name="activities" rules={[activityRule]}>
                        <AssignedRecords
                            disabled={readOnly}
                            label="Activities"
                            required
                            options={activityOptions}
                            loading={activitiesLoading}
                            placeholder="Select agency ESG activity"
                            renderItem={activityLabel}
                        />
                    </Form.Item>
                    <Form.Item name="institutions" rules={[institutionRule]}>
                        <InstitutionRecords disabled={readOnly} label="Education Provider(s)" required />
                    </Form.Item>
                    <Form.Item name="platforms" rules={[platformRule]}>
                        <InstitutionRecords disabled={readOnly} label="Platforms" />
                    </Form.Item>
                    {activityType !== "institutional" && (
                        <Form.Item name="programmes" rules={[programmeRule]}>
                            <Programmes
                                disabled={readOnly}
                                qfOptions={qfOptions}
                                countryOptions={countryOptions}
                                degreeOutcomeOptions={degreeOutcomeOptions}
                                assessmentOptions={assessmentOptions}
                                institutions={institutions}
                                required={programmesRequired}
                            />
                        </Form.Item>
                    )}
                </Col>
                <Col xs={24} xl={12}>
                    <Row gutter={12}>
                        <Col xs={24} md={12}>
                            <Form.Item name="status" label="Status" rules={[requiredRule, statusRule]}>
                                <Select disabled={readOnly} options={statusOptions} placeholder="Select status" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="decision" label="Decision" rules={[requiredRule]}>
                                <Select disabled={readOnly} options={decisionOptions} placeholder="Select decision" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="valid_from"
                                label="Valid from"
                                dependencies={["valid_to"]}
                                rules={[requiredRule, validFromRule]}
                            >
                                <FormDatePicker disabled={readOnly} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="valid_to" label="Valid to">
                                <FormDatePicker disabled={readOnly} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item
                        name="report_files"
                        rules={[{
                            validator: async (_, files) => {
                                if (!files?.length) throw new Error("At least one report file is required.");
                            },
                        }]}
                    >
                        <ReportFiles disabled={readOnly} languageOptions={languageOptions} />
                    </Form.Item>
                    <Form.Item name="report_links">
                        <ReportLinks disabled={readOnly} />
                    </Form.Item>
                    <Form.Item name="other_comment" label="Other comment (optional)">
                        <Input.TextArea
                            disabled={readOnly}
                            placeholder="Enter comment, if necessary"
                            autoSize={{ minRows: 3, maxRows: 8 }}
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
                    {readOnly && (isAdmin || userScoped) && (
                        <Link href={userScoped ? `/my-reports/edit/${id}` : `/reference/reports/edit/${id}`}>
                            <Button type="primary" icon={<EditOutlined />}>Edit Report</Button>
                        </Link>
                    )}
                    {!readOnly && (
                        <>
                            {!creating && (
                                <Button danger icon={<DeleteOutlined />} onClick={requestDeletion}>Request Deletion</Button>
                            )}
                            <Button
                                type="primary"
                                htmlType={creating || submitMessageOpen ? "submit" : "button"}
                                loading={saving}
                                icon={<SaveOutlined />}
                                onClick={!creating && !submitMessageOpen ? revealSubmitMessage : undefined}
                            >
                                {creating ? "Submit Report" : "Save Report"}
                            </Button>
                        </>
                    )}
                </Space>
            </div>
            {!creating && (
                <SlideToggle open={infoOpen}>
                    <RecordInfoPanel
                        record={report}
                        entityType="report"
                        disabled={readOnly}
                        onRemoveFlag={isAdmin ? removeFlag : undefined}
                    />
                </SlideToggle>
            )}
        </Form>
    );
};

export default ReportForm;
