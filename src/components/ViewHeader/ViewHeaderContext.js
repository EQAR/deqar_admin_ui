import { createContext, useContext, useEffect } from "react";

const ViewHeaderExtraContext = createContext(null);

export const ViewHeaderExtraProvider = ViewHeaderExtraContext.Provider;

export const useViewHeaderExtra = (content) => {
    const setContent = useContext(ViewHeaderExtraContext);

    useEffect(() => {
        setContent?.(content);
    }, [content, setContent]);

    useEffect(() => () => {
        setContent?.(null);
    }, [setContent]);
};
