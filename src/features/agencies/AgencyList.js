import { Alert, Table, theme } from "antd";
import Link from "next/link";
import dayjs from "dayjs";
import { useCallback, useMemo, useState } from "react";
import AgencyFilters from "@/features/agencies/AgencyFilters";
import { agenciesApi } from "@/features/agencies/api";
import { useServerTable } from "@/hooks/useServerTable";
import DataTableHeader from "@/components/DataTable/DataTableHeader";
import { useViewHeaderExtra } from "@/components/ViewHeader/ViewHeaderContext";
import SlideToggle from "@/components/SlideToggle/SlideToggle";
import style from "./AgencyList.module.scss";

const sortOrder = (ordering, field) => {
    const current = ordering.split(",").find((item) => item.trim().replace(/^-/, "") === field);
    if (!current) return null;
    return current.trim().startsWith("-") ? "descend" : "ascend";
};

const formatDate = (value) => value && dayjs(value).isValid()
    ? dayjs(value).format("YYYY-MM-DD")
    : "—";

const AgencyList = () => {
    const [filterOpen, setFilterOpen] = useState(true);
    const { token: { colorLink } } = theme.useToken();
    const { data, error, loading, tableState, onTableChange, setFilters } = useServerTable({
        endpoint: agenciesApi.list,
        storageKey: "deqar-agencies-table",
        initialOrdering: "acronym_sort",
        orderingMap: {
            deqar_id: "deqar_id_sort",
            acronym: "acronym_sort",
            name: "name_sort",
            country: "country_sort",
            valid_from: "valid_from",
        },
    });

    const columns = [
        {
            title: "Agency ID",
            dataIndex: "deqar_id",
            key: "deqar_id",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "deqar_id_sort"),
            width: 130,
            align: "center",
            render: (_, record) => (
                <Link className={style.TableLink} href={`/reference/agencies/view/${record.id}`}>
                    {record.id}
                </Link>
            ),
        },
        {
            title: "Acronym",
            dataIndex: "acronym",
            key: "acronym",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "acronym_sort"),
            width: 150,
        },
        {
            title: "Agency",
            dataIndex: "name",
            key: "name",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "name_sort"),
            render: (value, record) => (
                <Link className={style.TableLink} href={`/reference/agencies/view/${record.id}`}>
                    {value}
                </Link>
            ),
        },
        {
            title: "Country",
            dataIndex: "country",
            key: "country",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "country_sort"),
            width: 180,
        },
        {
            title: "Validity",
            dataIndex: "valid_from",
            key: "valid_from",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "valid_from"),
            width: 140,
            render: (value, record) => (
                <div className={style.Validity}>
                    {formatDate(value)}<br />
                    <span className={style.ValidityTo}>to</span><br />
                    {record.valid_to ? formatDate(record.valid_to) : "N/A"}
                </div>
            ),
        },
    ];

    const hasActiveFilters = Object.values(tableState.filters).some(
        (value) => value !== undefined && value !== null && value !== "" && value !== false,
    );
    const toggleFilter = useCallback(() => setFilterOpen((open) => !open), []);
    const pageHeaderExtra = useMemo(() => (
        <DataTableHeader
            filterText="Number of agencies"
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
                <AgencyFilters
                    filters={tableState.filters}
                    facets={data?.facets?.facet_fields || {}}
                    onChange={setFilters}
                />
            </SlideToggle>
            {error && (
                <Alert
                    type="error"
                    showIcon
                    message="Agencies could not be loaded"
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
                scroll={{ x: 900 }}
                onChange={onTableChange}
                pagination={{
                    current: tableState.pagination.current,
                    pageSize: tableState.pagination.pageSize,
                    total: data?.count || 0,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50", "100"],
                    showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} agencies`,
                }}
            />
        </section>
    );
};

export default AgencyList;
