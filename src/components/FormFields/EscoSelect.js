import { useEffect, useMemo, useState } from "react";
import { Select } from "antd";
import style from "./EscoSelect.module.scss";

const ESCO_API = process.env.REACT_APP_ESCO_API || "https://ec.europa.eu/esco/api/search";
const ISCED_SCHEME = "http://data.europa.eu/esco/concept-scheme/isced-f";

const getUri = (value) => value && typeof value === "object" ? value.id : value;

const optionFromResult = (result) => ({
    value: result.uri,
    label: result.title ? `${result.title} - ${result.uri}` : result.uri,
});

const currentOption = (value) => {
    const uri = getUri(value);
    if (!uri) return null;
    const title = typeof value === "object" ? value.title : "";
    return {
        value: uri,
        label: title ? `${title} - ${uri}` : uri,
    };
};

const EscoSelect = ({ value, onChange, disabled, mode = "skill", placeholder }) => {
    const [options, setOptions] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const normalizedValue = getUri(value) || undefined;

    useEffect(() => {
        if (mode !== "isced") return undefined;

        const controller = new AbortController();
        const load = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    full: "false",
                    isInScheme: ISCED_SCHEME,
                    limit: "300",
                });
                const response = await fetch(`${ESCO_API}?${params.toString()}`, { signal: controller.signal });
                if (!response.ok) throw new Error("ISCED-F options could not be loaded.");
                const data = await response.json();
                setOptions((data?._embedded?.results || []).map(optionFromResult));
            } catch (error) {
                if (error.name !== "AbortError") setOptions([]);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        load();
        return () => controller.abort();
    }, [mode]);

    useEffect(() => {
        if (mode !== "skill" || search.trim().length < 3) {
            if (mode === "skill") {
                setOptions([]);
                setLoading(false);
            }
            return undefined;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    text: search.trim(),
                    selectedVersion: "v1.0.9",
                    full: "false",
                });
                const response = await fetch(`${ESCO_API}?${params.toString()}`, { signal: controller.signal });
                if (!response.ok) throw new Error("ESCO options could not be loaded.");
                const data = await response.json();
                setOptions((data?._embedded?.results || []).map(optionFromResult));
            } catch (error) {
                if (error.name !== "AbortError") setOptions([]);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 300);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [mode, search]);

    const mergedOptions = useMemo(() => {
        const selected = currentOption(value);
        if (!selected || options.some((option) => option.value === selected.value)) return options;
        return [selected, ...options];
    }, [options, value]);

    return (
        <Select
            className={style.Select}
            value={normalizedValue}
            onChange={(nextValue) => onChange?.(nextValue || null)}
            disabled={disabled}
            allowClear
            showSearch
            optionFilterProp="label"
            filterOption={mode === "isced"
                ? (input, option) => option.label.toLowerCase().includes(input.toLowerCase())
                : false}
            onSearch={mode === "skill" ? setSearch : undefined}
            options={mergedOptions}
            loading={loading}
            placeholder={placeholder}
            notFoundContent={loading
                ? "Loading…"
                : mode === "skill" && search.trim().length < 3
                    ? "Type at least 3 characters"
                    : "No results"}
        />
    );
};

export default EscoSelect;
