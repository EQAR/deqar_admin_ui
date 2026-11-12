import { Alert, Table, Tag, theme } from "antd";
import Link from "next/link";
import dayjs from "dayjs";
import { useCallback, useMemo, useState } from "react";
import ReportFilters from "@/features/reports/ReportFilters";
import { reportsApi } from "@/features/reports/api";
import { useServerTable } from "@/hooks/useServerTable";
import DataTableHeader from "@/components/DataTable/DataTableHeader";
import { useViewHeaderExtra } from "@/components/ViewHeader/ViewHeaderContext";
import SlideToggle from "@/components/SlideToggle/SlideToggle";
import style from "./ReportList.module.scss";

const sortOrder = (ordering, field) => {
    const current = ordering.split(",").find((item) => item.trim().replace(/^-/, "") === field);
    if (!current) return null;
    return current.trim().startsWith("-") ? "descend" : "ascend";
};

const formatDate = (value) => value && dayjs(value).isValid()
    ? dayjs(value).format("YYYY-MM-DD")
    : "—";

const joinValues = (values) => Array.isArray(values)
    ? values.join("; ") || "—"
    : values || "—";

const flagColors = {
    none: "green",
    "low level": "gold",
    "high level": "red",
};

const ExpandableText = ({ value, limit = 200 }) => {
    const [expanded, setExpanded] = useState(false);
    const text = value == null ? "" : String(value);

    if (!text) return "—";
    if (text.length <= limit) return text;

    return (
        <div>
            <span>{text.slice(0, limit)}{expanded ? "" : "…"}</span>
            <SlideToggle open={expanded}>
                <span>{text.slice(limit)}</span>
            </SlideToggle>
            <button
                type="button"
                className={style.MoreButton}
                aria-expanded={expanded}
                onClick={() => setExpanded((open) => !open)}
            >
                {expanded ? "Less" : "More"}
            </button>
        </div>
    );
};

const ReportList = () => {
    const [filterOpen, setFilterOpen] = useState(true);
    const { token: { colorLink } } = theme.useToken();
    const { data, error, loading, tableState, onTableChange, setFilters } = useServerTable({
        endpoint: reportsApi.list,
        storageKey: "deqar-reports-table",
        initialOrdering: "-id_sort",
        orderingMap: {
            id: "id_sort",
            agency_acronym: "agency_sort",
            institution_programme_primary: "institution_programme_sort",
            agency_esg_activity_type: "agency_esg_activity_type",
            valid_from: "valid_from",
            flag_level: "flag_level",
        },
    });

    const columns = [
        {
            title: "DEQAR ID",
            dataIndex: "id",
            key: "id",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "id_sort"),
            width: 100,
            align: "center",
            render: (value) => (
                <Link className={style.TableLink} href={`/reference/reports/view/${value}`}>
                    {value}
                </Link>
            ),
        },
        {
            title: "Agency",
            dataIndex: "agency_acronym",
            key: "agency_acronym",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "agency_sort"),
            width: 140,
        },
        {
            title: "Institution : Programme",
            dataIndex: "institution_programme_primary",
            key: "institution_programme_primary",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "institution_programme_sort"),
            className: style.InstitutionProgramme,
            render: (value) => <ExpandableText value={value} limit={80} />,
        },
        {
            title: "Country",
            dataIndex: "country",
            key: "country",
            width: 150,
            render: joinValues,
        },
        {
            title: "Activity Type",
            dataIndex: "agency_esg_activity_type",
            key: "agency_esg_activity_type",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "agency_esg_activity_type"),
            width: 160,
            render: joinValues,
        },
        {
            title: "Validity",
            dataIndex: "valid_from",
            key: "valid_from",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "valid_from"),
            width: 125,
            render: (value, record) => (
                <div className={style.Validity}>
                    {formatDate(value)}<br />
                    <span className={style.ValidityTo}>to</span><br />
                    {record.valid_to ? formatDate(record.valid_to) : "N/A"}
                </div>
            ),
        },
        {
            title: "Flag",
            dataIndex: "flag_level",
            key: "flag_level",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "flag_level"),
            width: 110,
            align: "center",
            render: (value) => value ? (
                <Tag className={style.Flag} color={flagColors[value] || "default"}>{value}</Tag>
            ) : "—",
        },
    ];

    const hasActiveFilters = Object.values(tableState.filters).some(
        (value) => value !== undefined && value !== null && value !== "" && value !== false,
    );
    const toggleFilter = useCallback(() => setFilterOpen((open) => !open), []);
    const pageHeaderExtra = useMemo(() => (
        <DataTableHeader
            filterText="Number of reports"
            total={data?.count ?? 0}
            filtered={hasActiveFilters}
            filterOpen={filterOpen}
            onFilterClick={toggleFilter}
        />
    ), [data?.count, filterOpen, hasActiveFilters, toggleFilter]);

    useViewHeaderExtra(pageHeaderExtra);

    return (
        <section style={{ "--table-link-hover-color": colorLink }}>
            <SlideToggle open={filterOpen}>
                <ReportFilters
                    filters={tableState.filters}
                    facets={data?.facets?.facet_fields || {}}
                    onChange={setFilters}
                />
            </SlideToggle>
            {error && (
                <Alert
                    type="error"
                    showIcon
                    title="Reports could not be loaded"
                    description={error?.response?.data?.detail || error?.response?.data?.error || error.message}
                    style={{ marginBottom: 16 }}
                />
            )}
            <Table
                bordered
                size="small"
                rowKey="id"
                columns={columns}
                dataSource={data?.results || []}
                loading={loading}
                scroll={{ x: 1050 }}
                onChange={onTableChange}
                pagination={{
                    current: tableState.pagination.current,
                    pageSize: tableState.pagination.pageSize,
                    total: data?.count || 0,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50", "100"],
                    showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} reports`,
                }}
            />
        </section>
    );
};

export default ReportList;
