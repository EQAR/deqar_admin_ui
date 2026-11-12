import { Alert, Button, Table, Tag, theme } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import DataTableHeader from "@/components/DataTable/DataTableHeader";
import SlideToggle from "@/components/SlideToggle/SlideToggle";
import { useViewHeaderExtra } from "@/components/ViewHeader/ViewHeaderContext";
import MyReportFilters from "@/features/myData/MyReportFilters";
import { reportsApi } from "@/features/reports/api";
import { useServerTable } from "@/hooks/useServerTable";
import style from "./MyReportList.module.scss";

const flagColors = {
    none: "green",
    "low level": "gold",
    "high level": "red",
};

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

const MyReportList = () => {
    const [filterOpen, setFilterOpen] = useState(true);
    const { token: { colorLink } } = theme.useToken();
    const { data, error, loading, tableState, onTableChange, setFilters } = useServerTable({
        endpoint: reportsApi.myList,
        storageKey: "deqar-my-reports-table",
        initialOrdering: "-id_sort",
        orderingMap: {
            date_created: "date_created",
            id: "id_sort",
            institution_programme_primary: "institution_programme_sort",
            agency_esg_activity: "agency_esg_activity",
            valid_from: "valid_from",
            flag_level: "flag_level",
        },
    });

    const columns = [
        {
            title: "Uploaded",
            dataIndex: "date_created",
            key: "date_created",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "date_created"),
            width: 110,
            render: (value) => value && dayjs(value).isValid() ? (
                <div className={style.Uploaded}>
                    {dayjs(value).format("YYYY-MM-DD")}<br />
                    {dayjs(value).format("HH:mm")}
                </div>
            ) : "—",
        },
        {
            title: "DEQAR | Local ID",
            dataIndex: "id",
            key: "id",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "id_sort"),
            width: 140,
            align: "center",
            render: (value, record) => (
                <div className={style.Identifier}>
                    <Link className={style.TableLink} href={`/my-reports/view/${value}`}>{value}</Link>
                    <span className={style.LocalIdentifier}>{joinValues(record.local_id)}</span>
                </div>
            ),
        },
        {
            title: "Institution : Programme",
            dataIndex: "institution_programme_primary",
            key: "institution_programme_primary",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "institution_programme_sort"),
            className: style.WrappedCell,
            render: (value) => value || "—",
        },
        {
            title: "Country",
            dataIndex: "country",
            key: "country",
            width: 150,
            render: joinValues,
        },
        {
            title: "Activity",
            dataIndex: "agency_esg_activity",
            key: "agency_esg_activity",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "agency_esg_activity"),
            className: style.WrappedCell,
            width: 170,
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
                <MyReportFilters
                    filters={tableState.filters}
                    facets={data?.facets?.facet_fields || {}}
                    onChange={setFilters}
                />
            </SlideToggle>
            {error && (
                <Alert
                    type="error"
                    showIcon
                    title="Your reports could not be loaded"
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
                scroll={{ x: 1100 }}
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
            <div className={style.Actions}>
                <Link href="/submit-report"><Button type="primary">Submit New Report</Button></Link>
            </div>
        </section>
    );
};

export default MyReportList;
