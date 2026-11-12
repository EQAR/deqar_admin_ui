import { Alert, Button, Table, theme } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import InstitutionFilters from "@/features/institutions/InstitutionFilters";
import { institutionsApi } from "@/features/institutions/api";
import { useServerTable } from "@/hooks/useServerTable";
import DataTableHeader from "@/components/DataTable/DataTableHeader";
import { useViewHeaderExtra } from "@/components/ViewHeader/ViewHeaderContext";
import SlideToggle from "@/components/SlideToggle/SlideToggle";
import style from "./InstitutionList.module.scss";

const sortOrder = (ordering, field) => {
    const current = ordering.split(",").find((item) => item.trim().replace(/^-/, "") === field);
    if (!current) return null;
    return current.trim().startsWith("-") ? "descend" : "ascend";
};

const joinValues = (values) => Array.isArray(values) && values.length ? values.join(", ") : "—";

const InstitutionList = () => {
    const [filterOpen, setFilterOpen] = useState(true);
    const { data: session } = useSession();
    const isAdmin = Boolean(session?.user?.is_admin);
    const { token: { colorLink } } = theme.useToken();
    const { data, error, loading, tableState, onTableChange, setFilters } = useServerTable({
        endpoint: institutionsApi.list,
        storageKey: "deqar-institutions-table",
        initialOrdering: "deqar_id_sort",
        orderingMap: {
            deqar_id: "deqar_id_sort",
            eter_id: "eter_id_sort",
            name_display: "name_sort",
        },
    });

    const columns = [
        {
            title: "DEQARINST ID",
            dataIndex: "deqar_id",
            key: "deqar_id",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "deqar_id_sort"),
            width: 145,
        },
        {
            title: "ETER ID",
            dataIndex: "eter_id",
            key: "eter_id",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "eter_id_sort"),
            width: 120,
            render: (value) => value || "—",
        },
        {
            title: "Education Provider",
            dataIndex: "name_display",
            key: "name_display",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "name_sort"),
            render: (value, record) => (
                <Link className={style.TableLink} href={`/reference/institutions/view/${record.id}`}>
                    {value}
                </Link>
            ),
        },
        {
            title: "Country",
            dataIndex: "country",
            key: "country",
            width: 180,
            render: joinValues,
        },
        {
            title: "City",
            dataIndex: "city",
            key: "city",
            width: 180,
            render: joinValues,
        },
    ];

    const hasActiveFilters = Object.values(tableState.filters).some(
        (value) => value !== undefined && value !== null && value !== "",
    );
    const toggleFilter = useCallback(() => setFilterOpen((open) => !open), []);
    const pageHeaderExtra = useMemo(() => (
        <DataTableHeader
            filterText="Number of education providers"
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
                <InstitutionFilters
                    filters={tableState.filters}
                    facets={data?.facets?.facet_fields || {}}
                    onChange={setFilters}
                />
            </SlideToggle>
            {error && (
                <Alert
                    type="error"
                    showIcon
                    title="Education providers could not be loaded"
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
                    showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} education providers`,
                }}
            />
            {isAdmin && (
                <footer className={style.Footer}>
                    <Link href="/reference/institutions/create">
                        <Button type="primary" icon={<PlusOutlined />}>Add New Education Provider</Button>
                    </Link>
                </footer>
            )}
        </section>
    );
};

export default InstitutionList;
