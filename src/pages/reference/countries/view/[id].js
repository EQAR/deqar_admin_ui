import { useRouter } from "next/router";
import CountryForm from "@/features/countries/CountryForm";

export default function ViewCountryPage() {
    const router = useRouter();
    return <CountryForm mode="view" id={router.query.id} />;
}
