import { Alert, Table, Tag, theme } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import DataTableHeader from "@/components/DataTable/DataTableHeader";
import SlideToggle from "@/components/SlideToggle/SlideToggle";
import { useViewHeaderExtra } from "@/components/ViewHeader/ViewHeaderContext";
import ReportFlagFilters from "@/features/reportFlags/ReportFlagFilters";
import { reportFlagsApi } from "@/features/reportFlags/api";
import { useServerTable } from "@/hooks/useServerTable";
import { asList } from "@/lib/apiData";
import style from "./ReportFlagList.module.scss";

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

const formatCreatedAt = (value) => {
    if (!value || !dayjs(value).isValid()) return "—";
    return (
        <div className={style.CreatedAt}>
            {dayjs(value).format("YYYY-MM-DD")}<br />
            {dayjs(value).format("HH:mm")}
        </div>
    );
};

const ReportFlagList = () => {
    const [filterOpen, setFilterOpen] = useState(true);
    const { token: { colorLink } } = theme.useToken();
    const { data: agenciesResponse } = useSWR(reportFlagsApi.agencies);
    const { data, error, loading, tableState, onTableChange, setFilters } = useServerTable({
        endpoint: reportFlagsApi.list,
        storageKey: "deqar-report-flags-table",
        initialOrdering: "-created_at",
        orderingMap: {
            report: "report",
            flag: "flag",
            flag_message: "flag_message",
            created_at: "created_at",
        },
    });

    const agencyOptions = asList(agenciesResponse).map(({
        id: value,
        acronym_primary: label,
    }) => ({ value, label }));

    const columns = [
        {
            title: "DEQAR ID",
            dataIndex: "report",
            key: "report",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "report"),
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
            dataIndex: "agency",
            key: "agency",
            width: 140,
        },
        {
            title: "Flag",
            dataIndex: "flag",
            key: "flag",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "flag"),
            width: 110,
            align: "center",
            render: (value) => value ? (
                <Tag className={style.Flag} color={flagColors[value] || "default"}>{value}</Tag>
            ) : "—",
        },
        {
            title: "Flag Message",
            dataIndex: "flag_message",
            key: "flag_message",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "flag_message"),
            className: style.WrappedCell,
            render: (value) => value || "—",
        },
        {
            title: "Institution : Programme",
            dataIndex: "institution_programme_primary",
            key: "institution_programme_primary",
            className: style.WrappedCell,
            render: (value) => value || "—",
        },
        {
            title: "Created",
            dataIndex: "created_at",
            key: "created_at",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "created_at"),
            width: 120,
            render: formatCreatedAt,
        },
    ];

    const hasActiveFilters = Object.values(tableState.filters).some(
        (value) => value !== undefined && value !== null && value !== "",
    );
    const toggleFilter = useCallback(() => setFilterOpen((open) => !open), []);
    const pageHeaderExtra = useMemo(() => (
        <DataTableHeader
            filterText="Number of report flags"
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
                <ReportFlagFilters
                    filters={tableState.filters}
                    agencyOptions={agencyOptions}
                    onChange={setFilters}
                />
            </SlideToggle>
            {error && (
                <Alert
                    type="error"
                    showIcon
                    title="Report flags could not be loaded"
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
                    showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} report flags`,
                }}
            />
        </section>
    );
};

export default ReportFlagList;
