import { useRouter } from "next/router";
import ReportForm from "@/features/reports/ReportForm";

export default function EditReportPage() {
    const router = useRouter();
    return <ReportForm mode="edit" id={router.query.id} />;
}
