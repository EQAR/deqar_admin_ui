import AppBreadcrumb from "@/components/AppLayout/AppBreadcrumb";
import style from "./ViewHeader.module.scss";

const ViewHeader = ({ extra }) => (
    <div className={style.Header}>
        <AppBreadcrumb />
        {extra && <div className={style.Extra}>{extra}</div>}
    </div>
);

export default ViewHeader;
