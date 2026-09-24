import { useRouter } from "next/router";
import AgencyForm from "@/features/agencies/AgencyForm";

export default function EditAgencyPage() {
    const router = useRouter();
    return <AgencyForm mode="edit" id={router.query.id} />;
}
