import { useRouter } from "next/router";
import AgencyUserOnly from "@/components/Access/AgencyUserOnly";
import AgencyForm from "@/features/agencies/AgencyForm";

export default function ViewMyAgencyPage() {
    const router = useRouter();
    return (
        <AgencyUserOnly>
            <AgencyForm mode="view" id={router.query.id} scope="my" />
        </AgencyUserOnly>
    );
}
