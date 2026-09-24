import { useRouter } from "next/router";
import CountryForm from "@/features/countries/CountryForm";

export default function EditCountryPage() {
    const router = useRouter();
    return <CountryForm mode="edit" id={router.query.id} />;
}
