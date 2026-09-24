export const institutionsApi = {
    list: "/adminapi/v1/select/institutions/",
    detail: (id) => `/adminapi/v1/institutions/${id}/`,
    create: "/adminapi/v1/institutions/",
    countries: "/adminapi/v1/select/country/",
    organizationTypes: "/adminapi/v1/select/institutions/organization_type/",
    qfEheaLevels: "/adminapi/v1/select/qf_ehea_level/",
    agencies: "/adminapi/v1/select/agency/",
    allAgencies: "/adminapi/v1/select/agency_all/",
    identifierResources: "/adminapi/v1/select/identifier_resource/",
    hierarchicalRelationshipTypes: "/adminapi/v1/select/institution_hierarchical_relationship_types/",
    historicalRelationshipTypes: "/adminapi/v1/select/institution_historical_relationship_types/",
};
