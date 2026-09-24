import { Button, Divider, Typography } from "antd";
import style from "./DataTableHeader.module.scss";

const DataTableHeader = ({ filterText, total, filtered, filterOpen, onFilterClick }) => (
    <div className={style.Header}>
        <Typography.Text>
            {filterText} ({filtered ? "filtered" : "total"}): {total}
        </Typography.Text>
        <Divider orientation="vertical" />
        <Button
            type="link"
            size="small"
            className={style.FilterToggle}
            onClick={onFilterClick}
        >
            {filterOpen ? "Hide Table Filter" : "Show Table Filter"}
        </Button>
    </div>
);

export default DataTableHeader;
