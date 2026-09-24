import AgencyUserOnly from "@/components/Access/AgencyUserOnly";
import MyAgencyList from "@/features/myData/MyAgencyList";

export default function MyAgenciesPage() {
    return <AgencyUserOnly><MyAgencyList /></AgencyUserOnly>;
}
