import { DatePicker } from "antd";
import dayjs from "dayjs";

const FormDatePicker = ({
    value,
    onChange,
    format = "YYYY-MM-DD",
    style,
    ...props
}) => {
    const handleChange = (_, dateString) => {
        onChange?.(dateString || null);
    };

    return (
        <DatePicker
            {...props}
            format={format}
            value={value ? dayjs(value) : null}
            onChange={handleChange}
            style={{ width: "100%", ...style }}
        />
    );
};

export default FormDatePicker;
