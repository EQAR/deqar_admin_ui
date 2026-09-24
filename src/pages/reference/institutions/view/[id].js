import { useRouter } from "next/router";
import InstitutionForm from "@/features/institutions/InstitutionForm";

export default function ViewInstitutionPage() {
    const router = useRouter();
    return <InstitutionForm mode="view" id={router.query.id} />;
}
