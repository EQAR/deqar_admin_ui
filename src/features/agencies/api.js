export const agenciesApi = {
    list: "/adminapi/v1/browse/all/agencies/",
    myList: "/adminapi/v1/browse/my/agencies/",
    detail: (id) => `/adminapi/v1/agencies/${id}/`,
    myDetail: (id) => `/adminapi/v1/my_agency/${id}/`,
    countries: "/adminapi/v1/select/country/",
    associations: "/adminapi/v1/select/association/",
    decisionTypes: "/adminapi/v1/select/eqar_decision_type/",
    activityGroups: "/adminapi/v1/select/activity_group/",
    activityTypes: "/adminapi/v1/select/activity_type/",
    activityGroup: (id) => id
        ? `/adminapi/v1/agencies/activity_group/${id}/`
        : "/adminapi/v1/agencies/activity_group/",
};
