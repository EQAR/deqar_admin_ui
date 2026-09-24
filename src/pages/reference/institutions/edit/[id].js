import { useRouter } from "next/router";
import InstitutionForm from "@/features/institutions/InstitutionForm";

export default function EditInstitutionPage() {
    const router = useRouter();
    return <InstitutionForm mode="edit" id={router.query.id} />;
}
