import { useRouter } from "next/router";
import AgencyUserOnly from "@/components/Access/AgencyUserOnly";
import ReportForm from "@/features/reports/ReportForm";

export default function EditMyReportPage() {
    const router = useRouter();
    return (
        <AgencyUserOnly>
            <ReportForm mode="edit" id={router.query.id} scope="my" />
        </AgencyUserOnly>
    );
}
