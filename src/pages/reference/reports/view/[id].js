import { useRouter } from "next/router";
import ReportForm from "@/features/reports/ReportForm";

export default function ViewReportPage() {
    const router = useRouter();
    return <ReportForm mode="view" id={router.query.id} />;
}
