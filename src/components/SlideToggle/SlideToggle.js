import style from "./SlideToggle.module.scss";

const SlideToggle = ({ open, children }) => (
    <div
        className={`${style.Slide} ${open ? style.Open : style.Closed}`}
        aria-hidden={!open}
        inert={open ? undefined : ""}
    >
        <div className={style.Content}>{children}</div>
    </div>
);

export default SlideToggle;
