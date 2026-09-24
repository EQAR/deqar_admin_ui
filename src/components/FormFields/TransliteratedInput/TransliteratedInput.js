import { useEffect, useId, useState } from "react";
import { Form, Input } from "antd";
import SlideToggle from "@/components/SlideToggle/SlideToggle";
import style from "./TransliteratedInput.module.scss";

const romanAlphabetRule = {
    pattern: /^[A-Za-z0-9,.'" ]*$/,
    message: "Use roman alphabet.",
};

const TransliteratedInput = ({
    name,
    transliterationName,
    transliterationPath = transliterationName,
    label,
    placeholder,
    maxLength,
    rules,
    disabled = false,
    onTransliterationChange,
}) => {
    const form = Form.useFormInstance();
    const transliterationValue = Form.useWatch(transliterationPath, form);
    const [showTransliteration, setShowTransliteration] = useState(Boolean(transliterationValue));
    const transliterationId = useId();

    useEffect(() => {
        if (transliterationValue) setShowTransliteration(true);
    }, [transliterationValue]);

    const toggleTransliteration = () => {
        if (showTransliteration) {
            form.setFieldValue(transliterationPath, "");
            onTransliterationChange?.();
        }
        setShowTransliteration((open) => !open);
    };

    const open = disabled ? Boolean(transliterationValue) : showTransliteration;

    return (
        <div className={style.Field}>
            <Form.Item className={style.MainField} name={name} label={label} rules={rules}>
                <Input disabled={disabled} placeholder={placeholder} maxLength={maxLength} />
            </Form.Item>
            <SlideToggle open={open}>
                <div id={transliterationId}>
                    <Form.Item
                        className={style.TransliterationField}
                        name={transliterationName}
                        rules={[romanAlphabetRule]}
                    >
                        <Input
                            disabled={disabled}
                            placeholder="Enter transliterated form"
                            maxLength={maxLength}
                        />
                    </Form.Item>
                </div>
            </SlideToggle>
            {!disabled && (
                <button
                    className={style.Toggle}
                    type="button"
                    aria-expanded={showTransliteration}
                    aria-controls={transliterationId}
                    onClick={toggleTransliteration}
                >
                    {showTransliteration ? "Remove Transliteration" : "Add Transliteration"}
                </button>
            )}
        </div>
    );
};

export default TransliteratedInput;
