import { Alert, Button, Table, Tag, theme } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import CountryFilters from "@/features/countries/CountryFilters";
import { countriesApi } from "@/features/countries/api";
import { useServerTable } from "@/hooks/useServerTable";
import { asList } from "@/lib/apiData";
import DataTableHeader from "@/components/DataTable/DataTableHeader";
import { useViewHeaderExtra } from "@/components/ViewHeader/ViewHeaderContext";
import SlideToggle from "@/components/SlideToggle/SlideToggle";
import style from "./CountryList.module.scss";

const sortOrder = (ordering, field) => {
    const current = ordering.split(",").find((item) => item.replace(/^-/, "") === field);
    if (!current) return null;
    return current.startsWith("-") ? "descend" : "ascend";
};

const CountryList = () => {
    const [filterOpen, setFilterOpen] = useState(true);
    const { token: { colorLink } } = theme.useToken();
    const { data: session } = useSession();
    const isAdmin = Boolean(session?.user?.is_admin);
    const { data: permissionTypesResponse } = useSWR(isAdmin ? countriesApi.permissionTypes : null);
    const permissionTypes = asList(permissionTypesResponse);
    const {
        data,
        error,
        loading,
        tableState,
        onTableChange,
        setFilters,
    } = useServerTable({
        endpoint: countriesApi.list,
        storageKey: "deqar-countries-table",
        initialOrdering: "-ehea_is_member",
    });

    const columns = [
        {
            title: "ID",
            dataIndex: "id",
            key: "id",
            sorter: false,
            sortOrder: sortOrder(tableState.ordering, "id"),
            width: 100,
        },
        {
            title: "Alpha-2 Code",
            dataIndex: "iso_3166_alpha2",
            key: "iso_3166_alpha2",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "iso_3166_alpha2"),
            width: 150,
            render: (value, record) => (
                <Link className={style.TableLink} href={`/reference/countries/view/${record.id}`}>
                    {value}
                </Link>
            ),
        },
        {
            title: "Alpha-3 Code",
            dataIndex: "iso_3166_alpha3",
            key: "iso_3166_alpha3",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "iso_3166_alpha3"),
            width: 150,
            render: (value, record) => (
                <Link className={style.TableLink} href={`/reference/countries/view/${record.id}`}>
                    {value || "—"}
                </Link>
            ),
        },
        {
            title: "Country",
            dataIndex: "name_english",
            key: "name_english",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "name_english"),
            render: (value, record) => (
                <Link className={style.TableLink} href={`/reference/countries/view/${record.id}`}>
                    {value}
                </Link>
            ),
        },
        {
            title: "EHEA Member",
            dataIndex: "ehea_is_member",
            key: "ehea_is_member",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "ehea_is_member"),
            width: 150,
            align: "center",
            render: (value) => <Tag color={value ? "success" : "error"}>{value ? "Yes" : "No"}</Tag>,
        },
    ];

    const hasActiveFilters = Object.values(tableState.filters).some(
        (value) => value !== undefined && value !== null && value !== "",
    );
    const toggleFilter = useCallback(() => setFilterOpen((open) => !open), []);
    const pageHeaderExtra = useMemo(() => (
        <DataTableHeader
            filterText="Number of countries"
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
                <CountryFilters
                    filters={tableState.filters}
                    isAdmin={isAdmin}
                    permissionTypes={permissionTypes}
                    onChange={setFilters}
                />
            </SlideToggle>
            {error && (
                <Alert
                    type="error"
                    showIcon
                    title="Countries could not be loaded"
                    description={error?.response?.data?.detail || error.message}
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
                scroll={{ x: 800 }}
                onChange={onTableChange}
                pagination={{
                    current: tableState.pagination.current,
                    pageSize: tableState.pagination.pageSize,
                    total: data?.count || 0,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50", "100"],
                    showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} countries`,
                }}
            />
            {isAdmin && (
                <footer className={style.Footer}>
                    <Link href="/reference/countries/create">
                        <Button type="primary" size="medium" icon={<PlusOutlined />}>Add New Country</Button>
                    </Link>
                </footer>
            )}
        </section>
    );
};

export default CountryList;
