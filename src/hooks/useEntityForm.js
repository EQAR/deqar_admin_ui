import { useState } from "react";
import { App } from "antd";
import { http } from "@/lib/http";

const setNestedFieldErrors = (form, value, path = []) => {
    if (Array.isArray(value)) {
        if (value.every((item) => typeof item === "string")) {
            if (path.length) form.setFields([{ name: path, errors: value }]);
            return;
        }
        value.forEach((item, index) => setNestedFieldErrors(form, item, [...path, index]));
        return;
    }

    if (value && typeof value === "object") {
        Object.entries(value).forEach(([key, nested]) =>
            setNestedFieldErrors(form, nested, [...path, key]),
        );
    }
};

const getGeneralErrors = (payload) => {
    if (!payload) return [];
    if (typeof payload === "string") return [payload];
    if (Array.isArray(payload)) return payload.filter((item) => typeof item === "string");

    return [
        ...(payload.non_field_errors || []),
        ...(typeof payload.detail === "string" ? [payload.detail] : []),
    ];
};

export const useEntityForm = ({ form, endpoint, method, entityName, onSuccess, normalize }) => {
    const { notification } = App.useApp();
    const [saving, setSaving] = useState(false);
    const [generalErrors, setGeneralErrors] = useState([]);

    const submit = async (values) => {
        setSaving(true);
        setGeneralErrors([]);
        form.setFields(form.getFieldsError().map(({ name }) => ({ name, errors: [] })));

        try {
            const response = await http.request({
                url: endpoint,
                method,
                data: normalize ? normalize(values) : values,
            });

            notification.success({
                title: "Success",
                description: `${entityName} was ${method === "post" ? "created" : "updated"}.`,
            });
            await onSuccess?.(response.data);
            return response.data;
        } catch (error) {
            const payload = error?.response?.data;
            const errors = getGeneralErrors(payload);
            setGeneralErrors(errors);

            if (payload && typeof payload === "object" && !Array.isArray(payload)) {
                Object.entries(payload)
                    .filter(([key]) => !["non_field_errors", "detail"].includes(key))
                    .forEach(([key, value]) => setNestedFieldErrors(form, value, [key]));
            }

            notification.error({
                title: "The form could not be saved",
                description: errors[0] || "Please review the highlighted fields.",
            });
        } finally {
            setSaving(false);
        }
    };

    return { saving, generalErrors, submit };
};
