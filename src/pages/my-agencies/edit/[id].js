import { useRouter } from "next/router";
import AgencyUserOnly from "@/components/Access/AgencyUserOnly";
import AgencyForm from "@/features/agencies/AgencyForm";

export default function EditMyAgencyPage() {
    const router = useRouter();
    return (
        <AgencyUserOnly>
            <AgencyForm mode="edit" id={router.query.id} scope="my" />
        </AgencyUserOnly>
    );
}
