import { useEffect, useRef, useState } from "react";
import {
    Alert,
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
import { EditOutlined, SaveOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { asList } from "@/lib/apiData";
import { countriesApi } from "@/features/countries/api";
import { useEntityForm } from "@/hooks/useEntityForm";
import RichTextEditor from "@/components/FormFields/RichTextEditor";
import FormDatePicker from "@/components/FormFields/FormDatePicker";
import RecordInfoPanel from "@/components/RecordInfoPanel/RecordInfoPanel";
import SlideToggle from "@/components/SlideToggle/SlideToggle";
import { QAARegulations, QARequirements } from "@/features/countries/CountryEmbeddedForms";
import style from "./CountryForm.module.scss";

const requiredRule = { required: true, message: "This field is required." };
const urlRule = { type: "url", message: "Enter a valid URL." };

const getId = (value) => value && typeof value === "object" ? value.id : value;

const toFormValues = (country) => ({
    ...country,
    parent: getId(country.parent),
    external_QAA_is_permitted: getId(country.external_QAA_is_permitted),
    european_approach_is_permitted: getId(country.european_approach_is_permitted),
    ehea_key_commitment: getId(country.ehea_key_commitment),
    flag: getId(country.flag),
    qa_requirements: (country.qa_requirements || []).map((requirement) => ({
        ...requirement,
        qa_requirement_type: getId(requirement.qa_requirement_type),
    })),
    qaa_regulations: country.qaa_regulations || [],
});

const normalizePayload = (values) => {
    const payload = { ...values };
    ["id", "created_at", "created_by", "update_log", "flags"].forEach((key) => delete payload[key]);

    payload.qa_requirements = (payload.qa_requirements || []).map((item) => ({
        ...item,
        requirement_valid_to: item.requirement_valid_to || null,
    }));
    payload.qaa_regulations = (payload.qaa_regulations || []).map((item) => ({
        ...item,
        regulation_valid_to: item.regulation_valid_to || null,
    }));
    return payload;
};

const textAreaProps = {
    autoSize: { minRows: 3, maxRows: 10 },
};

const CountryForm = ({ mode, id }) => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const isAdmin = Boolean(session?.user?.is_admin);
    const readOnly = mode === "view";
    const [form] = Form.useForm();
    const initializedCountry = useRef(null);
    const [dirty, setDirty] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
    const [submitMessageOpen, setSubmitMessageOpen] = useState(false);
    const submitCommentRef = useRef(null);
    const detailEndpoint = id ? countriesApi.detail(id) : null;
    const { data: country, error: loadError, isLoading } = useSWR(detailEndpoint);
    const { data: countriesResponse } = useSWR(countriesApi.select);
    const { data: permissionTypesResponse } = useSWR(countriesApi.permissionTypes);
    const { data: requirementTypesResponse } = useSWR(countriesApi.requirementTypes);
    const countries = asList(countriesResponse);
    const permissionTypes = asList(permissionTypesResponse);
    const requirementTypes = asList(requirementTypesResponse);

    useEffect(() => {
        if (country && initializedCountry.current !== country.id) {
            form.setFieldsValue(toFormValues(country));
            initializedCountry.current = country.id;
        }
    }, [country, form]);

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
        const frame = window.requestAnimationFrame(() => {
            submitCommentRef.current?.focus({ cursor: "end" });
        });
        return () => window.cancelAnimationFrame(frame);
    }, [submitMessageOpen]);

    const endpoint = mode === "create" ? countriesApi.list : countriesApi.detail(id);
    const { saving, generalErrors, submit } = useEntityForm({
        form,
        endpoint,
        method: mode === "create" ? "post" : "put",
        entityName: "Country",
        normalize: normalizePayload,
        onSuccess: (saved) => {
            setDirty(false);
            router.push(`/reference/countries/view/${saved?.id || id}`);
        },
    });

    const cancel = () => {
        if (!dirty || window.confirm("Discard the unsaved changes?")) {
            router.push(mode === "edit" ? `/reference/countries/view/${id}` : "/reference/countries");
        }
    };

    const revealSubmitMessage = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setSubmitMessageOpen(true);
    };

    if (status === "loading" || (mode !== "create" && !id) || (id && isLoading)) {
        return <div className={style.Loading}><Spin size="large" /></div>;
    }

    if (!readOnly && !isAdmin) {
        return <Result status="403" title="403" subTitle="Only administrators can modify country records." />;
    }

    if (loadError) {
        return (
            <Result
                status={loadError?.response?.status === 404 ? "404" : "error"}
                title="Country could not be loaded"
                subTitle={loadError?.response?.data?.detail || loadError.message}
                extra={<Link href="/reference/countries"><Button>Back to countries</Button></Link>}
            />
        );
    }

    const permissionOptions = permissionTypes.map(({ id: value, type }) => ({ value, label: type }));
    const countryOptions = countries
        .filter((item) => String(item.id) !== String(id))
        .map((item) => ({ value: item.id, label: `${item.name_english} (${item.iso_3166_alpha2})` }));

    return (
        <Form
            form={form}
            layout="vertical"
            scrollToFirstError
            initialValues={{
                ehea_is_member: false,
                has_full_institution_list: false,
                qa_requirements: [],
                qaa_regulations: [],
            }}
            onValuesChange={() => setDirty(true)}
            onFinish={submit}
        >
            {generalErrors.length > 0 && (
                <Alert
                    closable
                    type="error"
                    showIcon
                    title="The record could not be saved"
                    description={generalErrors.map((message, index) => <div key={index}>{message}</div>)}
                    className={style.FormAlert}
                />
            )}
            <Row gutter={24}>
                    <Col xs={24} xl={12}>
                            <Form.Item name="parent" label="Parent Country">
                                <Select
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    disabled={readOnly}
                                    options={countryOptions}
                                    placeholder="Select parent country"
                                />
                            </Form.Item>
                            <Row gutter={12}>
                                <Col xs={24} md={12}>
                                    <Form.Item name="name_english" label="English Country Name" rules={[requiredRule]}>
                                        <Input disabled={readOnly} />
                                    </Form.Item>
                                </Col>
                                <Col xs={12} md={6}>
                                    <Form.Item name="iso_3166_alpha2" label="Alpha-2 Code" rules={[requiredRule]}>
                                        <Input disabled={readOnly} maxLength={10} />
                                    </Form.Item>
                                </Col>
                                <Col xs={12} md={6}>
                                    <Form.Item name="iso_3166_alpha3" label="Alpha-3 Code">
                                        <Input disabled={readOnly} maxLength={3} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={12}>
                                <Col xs={24} md={12}>
                                    <Form.Item name="orgreg_subcountry_label" label="OrgReg SubCountry Label">
                                        <Input disabled={readOnly} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item name="orgreg_eu_2_letter_code" label="OrgReg EU 2-letter Code">
                                        <Input disabled={readOnly} maxLength={3} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={12}>
                                <Col xs={24} md={8}>
                                    <Form.Item name="ehea_is_member" valuePropName="checked">
                                        <Checkbox disabled={readOnly}>EHEA Member</Checkbox>
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="has_full_institution_list" valuePropName="checked">
                                        <Checkbox disabled={readOnly}>Institution List</Checkbox>
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Form.Item name="eqar_governmental_member_start" label="EQAR Member Since">
                                        <FormDatePicker disabled={readOnly} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Form.Item name="ehea_key_commitment" label="EHEA Key Commitment">
                                <Select allowClear disabled={readOnly} options={permissionOptions} />
                            </Form.Item>
                            <Form.Item name="general_note" label="General Information on Higher Education">
                                <RichTextEditor disabled={readOnly} />
                            </Form.Item>
                        <Form.Item name="qa_requirements" noStyle>
                            <QARequirements disabled={readOnly} requirementTypes={requirementTypes} />
                        </Form.Item>
                        <Form.Item name="qa_requirement_note" label="National EQA Requirement Note">
                            <RichTextEditor disabled={readOnly} />
                        </Form.Item>
                        <Form.Item name="qaa_regulations" noStyle>
                            <QAARegulations disabled={readOnly} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} xl={12}>
                        <Form.Item name="eu_controlled_vocab_country" label="EU Controlled Vocabulary · Country">
                            <Input disabled={readOnly} />
                        </Form.Item>
                        <Form.Item name="eu_controlled_vocab_atu" label="EU Controlled Vocabulary · ATU">
                            <Input disabled={readOnly} />
                        </Form.Item>
                        <Form.Item name="generic_url" label="Generic URL" rules={[urlRule]}>
                            <Input disabled={readOnly} />
                        </Form.Item>
                        <Form.Item name="external_QAA_is_permitted" label="Cross Border QA Permitted">
                            <Select allowClear disabled={readOnly} options={permissionOptions} />
                        </Form.Item>
                        <Form.Item name="external_QAA_note" label="Cross Border QA Note">
                            <RichTextEditor disabled={readOnly} />
                        </Form.Item>
                        <Form.Item name="eligibility" label="Cross Border QA - Eligibility Requirements for Foreign Agencies">
                            <RichTextEditor disabled={readOnly} />
                        </Form.Item>
                        <Form.Item name="conditions" label="Cross Border QA - Conditions for Foreign Agencies">
                            <RichTextEditor disabled={readOnly} />
                        </Form.Item>
                        <Form.Item name="recognition" label="Cross Border QA - Recognition of External Reviews">
                            <RichTextEditor disabled={readOnly} />
                        </Form.Item>
                        <Form.Item name="european_approach_is_permitted" label="European Approach Permitted">
                            <Select allowClear disabled={readOnly} options={permissionOptions} />
                        </Form.Item>
                        <Form.Item name="european_approach_note" label="European Approach Note">
                            <RichTextEditor disabled={readOnly} />
                        </Form.Item>
                    </Col>
            </Row>
            {mode === "edit" && (
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
                    <Button
                        onClick={readOnly ? () => router.push("/reference/countries") : cancel}
                    >
                        Close
                    </Button>
                    {country && (
                        <Button onClick={() => setInfoOpen((open) => !open)}>
                            {infoOpen ? "Hide Info" : "Show Info"}
                        </Button>
                    )}
                </Space>
                <Space wrap>
                    {readOnly && isAdmin && (
                        <Link href={`/reference/countries/edit/${id}`}>
                            <Button type="primary" icon={<EditOutlined />}>Edit Country</Button>
                        </Link>
                    )}
                    {!readOnly && (
                        <Button
                            type="primary"
                            htmlType={mode === "edit" && !submitMessageOpen ? "button" : "submit"}
                            loading={saving}
                            icon={<SaveOutlined />}
                            onClick={mode === "edit" && !submitMessageOpen
                                ? revealSubmitMessage
                                : undefined}
                        >
                            Save Country
                        </Button>
                    )}
                </Space>
            </div>
            {country && (
                <SlideToggle open={infoOpen}>
                    <RecordInfoPanel record={country} entityType="country" disabled={readOnly} />
                </SlideToggle>
            )}
        </Form>
    );
};

export default CountryForm;
