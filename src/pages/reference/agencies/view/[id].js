import { useRouter } from "next/router";
import AgencyForm from "@/features/agencies/AgencyForm";

export default function ViewAgencyPage() {
    const router = useRouter();
    return <AgencyForm mode="view" id={router.query.id} />;
}
