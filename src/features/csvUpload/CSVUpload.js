import { useMemo, useState } from "react";
import {
    Alert,
    App,
    Button,
    Descriptions,
    Empty,
    Flex,
    Input,
    Listy,
    Progress,
    Space,
    Steps,
    Table,
    Tag,
    Typography,
    Upload,
} from "antd";
import {
    CheckCircleOutlined,
    CloudUploadOutlined,
    ReloadOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Papa from "papaparse";
import { csvUploadApi } from "@/features/csvUpload/api";
import { http } from "@/lib/http";
import style from "./CSVUpload.module.scss";

const { Dragger } = Upload;

const unique = (values) => [...new Set(values.filter(Boolean))];

const formatFileSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes < 1) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / (1024 ** unitIndex);
    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const responseMessage = (error) => {
    const data = error?.response?.data;
    if (typeof data === "string") return data;
    return data?.detail || data?.error || error?.message || "The row could not be submitted.";
};

const flattenErrors = (value, path = "") => {
    if (value == null) return [];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return [{ path: path || "General", message: String(value) }];
    }
    if (Array.isArray(value)) {
        return value.flatMap((item, index) => {
            const itemPath = typeof item === "object" && item !== null
                ? `${path || "Item"} ${index + 1}`
                : path;
            return flattenErrors(item, itemPath);
        });
    }
    if (typeof value === "object") {
        return Object.entries(value).flatMap(([key, item]) => {
            const nextPath = key === "non_field_errors"
                ? path
                : path ? `${path} » ${key}` : key;
            return flattenErrors(item, nextPath);
        });
    }
    return [];
};

const displayPath = (path) => path
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const CSVUpload = () => {
    const { notification } = App.useApp();
    const { data: session } = useSession();
    const isAdmin = Boolean(session?.user?.is_admin);
    const [file, setFile] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [rows, setRows] = useState([]);
    const [parseErrors, setParseErrors] = useState([]);
    const [results, setResults] = useState({});
    const [selectedKey, setSelectedKey] = useState(null);
    const [ingesting, setIngesting] = useState(false);
    const [progress, setProgress] = useState({ completed: 0, total: 0 });

    const generatedStatus = !headers.includes("ingest_status");
    const generatedReportId = !headers.includes("report_id");
    const submissionFields = useMemo(() => unique([
        "row_number",
        ...(generatedStatus ? ["ingest_status"] : []),
        ...(generatedReportId ? ["report_id"] : []),
        ...headers,
    ]), [generatedReportId, generatedStatus, headers]);

    const selectedRow = rows.find((row) => row._key === selectedKey);
    const selectedResult = selectedKey ? results[selectedKey] : null;
    const completedResults = Object.values(results).filter(Boolean);
    const successCount = rows.filter((row) => row.ingest_status === "OK").length;
    const errorCount = completedResults.filter((result) => result.submission_status !== "success").length;
    const currentStep = rows.length ? (completedResults.length ? 2 : 1) : 0;

    const reset = () => {
        setFile(null);
        setHeaders([]);
        setRows([]);
        setParseErrors([]);
        setResults({});
        setSelectedKey(null);
        setProgress({ completed: 0, total: 0 });
    };

    const readCSV = async (selectedFile) => {
        try {
            const contents = await selectedFile.text();
            const parsed = Papa.parse(contents, {
                header: true,
                skipEmptyLines: "greedy",
            });
            const csvHeaders = parsed.meta?.fields || [];
            if (!csvHeaders.length) throw new Error("The CSV file does not contain a header row.");
            if (!parsed.data.length) throw new Error("The CSV file does not contain any data rows.");

            const dataRows = parsed.data.map((row, index) => ({
                row_number: index + 1,
                ...(csvHeaders.includes("ingest_status") ? {} : { ingest_status: "" }),
                ...(csvHeaders.includes("report_id") ? {} : { report_id: "" }),
                ...row,
                _key: `csv-row-${index + 1}`,
            }));

            setFile(selectedFile);
            setHeaders(csvHeaders);
            setRows(dataRows);
            setParseErrors(parsed.errors || []);
            setResults({});
            setSelectedKey(dataRows[0]._key);
            setProgress({ completed: 0, total: dataRows.length });
            notification.success({
                title: "CSV file loaded",
                description: `${dataRows.length} report row${dataRows.length === 1 ? "" : "s"} ready for review.`,
            });
        } catch (error) {
            reset();
            notification.error({
                title: "CSV file could not be read",
                description: error.message,
            });
        }
    };

    const updateCell = (rowKey, field, value) => {
        setRows((current) => current.map((row) => (
            row._key === rowKey ? { ...row, [field]: value } : row
        )));
    };

    const ingest = async () => {
        if (!rows.length || ingesting) return;

        const workingRows = rows.map((row) => ({ ...row }));
        const workingResults = { ...results };
        let processed = 0;
        let succeeded = 0;
        let failed = 0;
        let firstFailedKey = null;

        setIngesting(true);
        setProgress({ completed: 0, total: workingRows.length });

        for (let index = 0; index < workingRows.length; index += 1) {
            const row = workingRows[index];
            if (row.ingest_status === "OK") {
                processed += 1;
                setProgress({ completed: processed, total: workingRows.length });
                continue;
            }

            const csv = Papa.unparse({
                fields: submissionFields,
                data: [submissionFields.map((field) => row[field] ?? "")],
            }, { newline: "\r\n" });

            let result;
            try {
                const response = await http.post(csvUploadApi.submit, csv, {
                    headers: { "Content-Type": "text/csv; charset=utf-8" },
                    transformRequest: [(data) => data],
                });
                result = Array.isArray(response.data) ? response.data[0] : response.data;
                if (!result || typeof result !== "object") {
                    throw new Error("The server returned an invalid response.");
                }
            } catch (error) {
                result = {
                    submission_status: "errors",
                    errors: { non_field_errors: [responseMessage(error)] },
                };
            }

            workingResults[row._key] = result;
            if (result.submission_status === "success") {
                row.report_id = result.submitted_report?.report_id ?? row.report_id;
                row.ingest_status = "OK";
                succeeded += 1;
            } else {
                row.ingest_status = "NOT OK - ReIngest";
                failed += 1;
                if (!firstFailedKey) firstFailedKey = row._key;
            }

            processed += 1;
            setRows([...workingRows]);
            setResults({ ...workingResults });
            setProgress({ completed: processed, total: workingRows.length });
        }

        setSelectedKey(firstFailedKey || workingRows.find((row) => workingResults[row._key])?._key || selectedKey);
        setIngesting(false);
        notification[failed ? "warning" : "success"]({
            title: failed ? "CSV ingestion completed with errors" : "CSV ingestion completed",
            description: `${succeeded} submitted, ${failed} failed, ${workingRows.length - succeeded - failed} already complete.`,
        });
    };

    const editable = (field) => field !== "row_number" && (field !== "report_id" || !generatedReportId);
    const columns = submissionFields.map((field) => ({
        title: field === "row_number" ? "row" : field,
        dataIndex: field,
        key: field,
        width: field === "row_number" ? 70 : field === "ingest_status" ? 170 : 200,
        fixed: field === "row_number" ? "left" : undefined,
        render: (value, row) => editable(field) ? (
            <Input
                aria-label={`${field}, row ${row.row_number}`}
                className={style.CellInput}
                value={value ?? ""}
                disabled={ingesting}
                onFocus={() => setSelectedKey(row._key)}
                onChange={(event) => updateCell(row._key, field, event.target.value)}
            />
        ) : value || "—",
    }));

    const percentage = progress.total
        ? Math.round((progress.completed / progress.total) * 100)
        : 0;
    const selectedErrors = selectedResult?.submission_status === "errors"
        ? flattenErrors(selectedResult.errors)
        : [];
    const warnings = selectedResult?.submission_status === "success"
        ? [
            ...(selectedResult.report_warnings || []).map((message) => ({ group: "Report", message })),
            ...(selectedResult.institution_warnings || []).map((message) => ({ group: "Institution", message })),
        ]
        : [];
    const selectedErrorItems = (selectedErrors.length
        ? selectedErrors
        : [{ path: "General", message: "Unknown validation error." }]
    ).map((error, index) => ({ ...error, key: `error-${index}` }));
    const warningItems = warnings.map((warning, index) => ({ ...warning, key: `warning-${index}` }));
    const reportPath = isAdmin ? "/reference/reports/view" : "/my-reports/view";

    return (
        <div className={style.Page}>
            <Steps
                className={style.Steps}
                current={currentStep}
                responsive
                items={[
                    { title: "Choose CSV" },
                    { title: "Review and ingest" },
                    { title: "Check results" },
                ]}
            />

            <Alert
                type="info"
                showIcon
                title={currentStep === 0
                    ? "Choose a CSV file to begin."
                    : currentStep === 1
                        ? "Review the values below, make any corrections, then select Ingest."
                        : "Select a row to inspect its result. Correct failed rows and ingest again when needed."}
                description={(
                    <span>
                        Field names and requirements are described in the{" "}
                        <a
                            href="https://docs.deqar.eu/data_submission/#csv-upload"
                            target="_blank"
                            rel="noreferrer"
                        >
                            DEQAR CSV upload documentation
                        </a>.
                    </span>
                )}
            />

            <section className={style.UploadSection}>
                {!file ? (
                    <Dragger
                        accept=".csv,text/csv"
                        beforeUpload={(selectedFile) => {
                            void readCSV(selectedFile);
                            return Upload.LIST_IGNORE;
                        }}
                        disabled={ingesting}
                        multiple={false}
                        showUploadList={false}
                    >
                        <p className="ant-upload-drag-icon"><CloudUploadOutlined /></p>
                        <p className="ant-upload-text">Drop a CSV file here or click to browse</p>
                        <p className="ant-upload-hint">The file is reviewed locally before any report is submitted.</p>
                    </Dragger>
                ) : (
                    <Flex className={style.FileSummary} align="center" justify="space-between" gap={16} wrap>
                        <Space>
                            <CheckCircleOutlined className={style.FileIcon} />
                            <div>
                                <Typography.Text strong>{file.name}</Typography.Text>
                                <Typography.Text type="secondary" className={style.FileMeta}>
                                    {formatFileSize(file.size)} · {rows.length} row{rows.length === 1 ? "" : "s"} · {headers.length} columns
                                </Typography.Text>
                            </div>
                        </Space>
                        <Button disabled={ingesting} onClick={reset}>Choose another file</Button>
                    </Flex>
                )}
            </section>

            {parseErrors.length > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    title={`${parseErrors.length} CSV parsing warning${parseErrors.length === 1 ? "" : "s"}`}
                    description={parseErrors.slice(0, 5).map((error, index) => (
                        <div key={`${error.code}-${error.row}-${index}`}>
                            {Number.isInteger(error.row) ? `Row ${error.row + 2}: ` : ""}{error.message}
                        </div>
                    ))}
                />
            )}

            {rows.length > 0 && (
                <>
                    <Flex align="center" justify="space-between" gap={12} wrap>
                        <div>
                            <Typography.Title level={5} className={style.SectionTitle}>Uploaded CSV data</Typography.Title>
                            <Typography.Text type="secondary">
                                Cells with an input can be edited. Rows already marked OK are skipped.
                            </Typography.Text>
                        </div>
                        <Button
                            type="primary"
                            icon={completedResults.length ? <ReloadOutlined /> : <UploadOutlined />}
                            loading={ingesting}
                            onClick={ingest}
                        >
                            {completedResults.length ? "Ingest pending rows" : "Ingest"}
                        </Button>
                    </Flex>

                    {ingesting && (
                        <div className={style.Progress}>
                            <Progress percent={percentage} status="active" />
                            <Typography.Text type="secondary">
                                Processing row {Math.min(progress.completed + 1, progress.total)} of {progress.total}
                            </Typography.Text>
                        </div>
                    )}

                    <Table
                        className={style.Table}
                        bordered
                        size="small"
                        rowKey="_key"
                        columns={columns}
                        dataSource={rows}
                        pagination={{
                            defaultPageSize: 20,
                            showSizeChanger: true,
                            pageSizeOptions: ["10", "20", "50", "100"],
                            showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} rows`,
                        }}
                        rowClassName={(row) => [
                            row._key === selectedKey ? style.SelectedRow : "",
                            row.ingest_status === "OK" ? style.SuccessRow : "",
                            row.ingest_status?.startsWith("NOT OK") ? style.ErrorRow : "",
                        ].filter(Boolean).join(" ")}
                        onRow={(row) => ({
                            onClick: () => setSelectedKey(row._key),
                        })}
                        scroll={{ x: Math.max(900, submissionFields.length * 200) }}
                    />

                    <section className={style.ResultSection}>
                        <Flex align="center" justify="space-between" gap={12} wrap>
                            <Typography.Title level={5} className={style.SectionTitle}>
                                Ingest information{selectedRow ? ` · row ${selectedRow.row_number}` : ""}
                            </Typography.Title>
                            {completedResults.length > 0 && (
                                <Space wrap>
                                    <Tag color="green">{successCount} successful</Tag>
                                    <Tag color={errorCount ? "red" : "default"}>{errorCount} failed</Tag>
                                </Space>
                            )}
                        </Flex>

                        {!selectedResult && (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Ingest the file, then select a row to see its result."
                            />
                        )}

                        {selectedResult?.submission_status === "errors" && (
                            <>
                                <Alert
                                    type="error"
                                    showIcon
                                    title="This row was not ingested"
                                    description="Correct the values in the table and select Ingest pending rows to retry it."
                                />
                                <Listy
                                    className={style.ErrorList}
                                    virtual={false}
                                    items={selectedErrorItems}
                                    rowKey="key"
                                    itemRender={(error) => (
                                        <div className={style.ListItem}>
                                            <Typography.Text strong>{displayPath(error.path || "General")}:</Typography.Text>
                                            <span>{error.message}</span>
                                        </div>
                                    )}
                                />
                            </>
                        )}

                        {selectedResult?.submission_status === "success" && (
                            <>
                                <Alert
                                    type="success"
                                    showIcon
                                    title="Record was successfully ingested"
                                    action={selectedResult.submitted_report?.report_id ? (
                                        <Link href={`${reportPath}/${selectedResult.submitted_report.report_id}`}>
                                            <Button size="small">Open report</Button>
                                        </Link>
                                    ) : null}
                                />
                                <Descriptions
                                    className={style.ResultDetails}
                                    size="small"
                                    bordered
                                    column={{ xs: 1, sm: 2, md: 3 }}
                                    items={[
                                        {
                                            key: "report",
                                            label: "Report ID",
                                            children: selectedResult.submitted_report?.report_id || "—",
                                        },
                                        {
                                            key: "sanity",
                                            label: "Sanity check",
                                            children: selectedResult.sanity_check_status || "—",
                                        },
                                        {
                                            key: "flag",
                                            label: "Report flag",
                                            children: selectedResult.report_flag || "none",
                                        },
                                    ]}
                                />
                                {warnings.length > 0 && (
                                    <div className={style.WarningBlock}>
                                        <Typography.Text strong className={style.ListHeader}>Warnings</Typography.Text>
                                        <Listy
                                            className={style.WarningList}
                                            virtual={false}
                                            items={warningItems}
                                            rowKey="key"
                                            itemRender={(warning) => (
                                                <div className={style.ListItem}>
                                                    <Tag color="gold">{warning.group}</Tag>
                                                    <span>{warning.message}</span>
                                                </div>
                                            )}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                </>
            )}
        </div>
    );
};

export default CSVUpload;
