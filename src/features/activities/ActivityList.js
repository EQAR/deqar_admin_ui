import { Alert, Table } from "antd";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import ActivityFilters from "@/features/activities/ActivityFilters";
import { activitiesApi } from "@/features/activities/api";
import { useServerTable } from "@/hooks/useServerTable";
import { asList } from "@/lib/apiData";
import DataTableHeader from "@/components/DataTable/DataTableHeader";
import { useViewHeaderExtra } from "@/components/ViewHeader/ViewHeaderContext";
import SlideToggle from "@/components/SlideToggle/SlideToggle";

const sortOrder = (ordering, field) => {
    const current = ordering.split(",").find((item) => item.trim().replace(/^-/, "") === field);
    if (!current) return null;
    return current.trim().startsWith("-") ? "descend" : "ascend";
};

const ActivityList = () => {
    const [filterOpen, setFilterOpen] = useState(true);
    const { data: agenciesResponse } = useSWR(activitiesApi.agencies);
    const { data: activityTypesResponse } = useSWR(activitiesApi.activityTypes);
    const { data: activityGroupsResponse } = useSWR(activitiesApi.activityGroups);
    const { data, error, loading, tableState, onTableChange, setFilters } = useServerTable({
        endpoint: activitiesApi.list,
        storageKey: "deqar-activities-table-v2",
        initialOrdering: "agency",
        orderingMap: {
            agency: "agency",
            activity_group: "activity_group",
            activity_type: "activity_group__activity_type__type",
        },
    });

    const agencyOptions = asList(agenciesResponse).map(({ id: value, acronym_primary: label }) => ({ value, label }));
    const activityTypeOptions = asList(activityTypesResponse).map(({ id: value, type: label }) => ({ value, label }));
    const activityGroupOptions = asList(activityGroupsResponse).map(({ id: value, display_value: label }) => ({ value, label }));

    const columns = [
        {
            title: "Activity ID",
            dataIndex: "id",
            key: "id",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "id"),
            width: 110,
            align: "center",
        },
        {
            title: "Agency",
            dataIndex: "agency",
            key: "agency",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "agency"),
            width: 180,
        },
        {
            title: "Activity Group",
            dataIndex: "activity_group",
            key: "activity_group",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "activity_group"),
            render: (group) => group ? `${group.activity} - ID ${group.id}` : "—",
        },
        {
            title: "Activity Type",
            dataIndex: "activity_type",
            key: "activity_type",
            sorter: true,
            sortOrder: sortOrder(tableState.ordering, "activity_group__activity_type__type"),
            width: 250,
        },
    ];

    const hasActiveFilters = Object.values(tableState.filters).some(
        (value) => value !== undefined && value !== null && value !== "",
    );
    const toggleFilter = useCallback(() => setFilterOpen((open) => !open), []);
    const pageHeaderExtra = useMemo(() => (
        <DataTableHeader
            filterText="Number of activities"
            total={data?.count ?? 0}
            filtered={hasActiveFilters}
            filterOpen={filterOpen}
            onFilterClick={toggleFilter}
        />
    ), [data?.count, filterOpen, hasActiveFilters, toggleFilter]);

    useViewHeaderExtra(pageHeaderExtra);

    return (
        <section>
            <SlideToggle open={filterOpen}>
                <ActivityFilters
                    filters={tableState.filters}
                    agencyOptions={agencyOptions}
                    activityTypeOptions={activityTypeOptions}
                    activityGroupOptions={activityGroupOptions}
                    onChange={setFilters}
                />
            </SlideToggle>
            {error && (
                <Alert
                    type="error"
                    showIcon
                    title="Activities could not be loaded"
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
                scroll={{ x: 850 }}
                onChange={onTableChange}
                pagination={{
                    current: tableState.pagination.current,
                    pageSize: tableState.pagination.pageSize,
                    total: data?.count || 0,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50", "100"],
                    showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} activities`,
                }}
            />
        </section>
    );
};

export default ActivityList;
