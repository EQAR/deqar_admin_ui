export const countriesApi = {
    list: "/adminapi/v1/countries/",
    detail: (id) => `/adminapi/v1/countries/${id}/`,
    select: "/adminapi/v1/select/country/",
    permissionTypes: "/adminapi/v1/select/permission_type/",
    requirementTypes: "/adminapi/v1/select/qa_requirement_type/",
};
