import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import style from "./RichTextEditor.module.scss";

const SunEditor = dynamic(() => import("suneditor-react"), {
    ssr: false,
    loading: () => <div className={style.Loading} aria-hidden="true" />,
});

const editorOptions = {
    buttonList: [
        ["bold", "underline", "italic"],
        ["list"],
        ["removeFormat"],
        ["undo", "redo"],
    ],
    defaultStyle: [
        "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        "font-size: 14px",
        "color: rgba(0, 0, 0, 0.88)",
    ].join("; "),
    minHeight: "96px",
    resizingBar: false,
};

const asContent = (value) => typeof value === "string" ? value : "";

const RichTextEditor = ({ value, onChange, disabled = false, placeholder }) => {
    const currentContent = useRef(asContent(value));
    const [externalContent, setExternalContent] = useState(currentContent.current);

    useEffect(() => {
        const nextContent = asContent(value);
        if (nextContent !== currentContent.current) {
            currentContent.current = nextContent;
            setExternalContent(nextContent);
        }
    }, [value]);

    const handleChange = (content) => {
        currentContent.current = content;
        onChange?.(content);
    };

    return (
        <div className={`${style.Editor} ${disabled ? style.Disabled : ""}`}>
            <SunEditor
                setContents={externalContent}
                onChange={handleChange}
                disable={disabled}
                hideToolbar={disabled}
                placeholder={placeholder}
                setOptions={editorOptions}
            />
        </div>
    );
};

export default RichTextEditor;
