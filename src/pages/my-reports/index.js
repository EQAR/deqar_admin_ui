import AgencyUserOnly from "@/components/Access/AgencyUserOnly";
import MyReportList from "@/features/myData/MyReportList";

export default function MyReportsPage() {
    return <AgencyUserOnly><MyReportList /></AgencyUserOnly>;
}
