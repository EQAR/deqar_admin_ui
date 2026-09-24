import { useEffect, useState } from "react";
import { Button, Drawer, Form } from "antd";
import { CloseOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import style from "./DrawerFormList.module.scss";

const DrawerFormList = ({
    value,
    onChange,
    label,
    addLabel = "Add",
    itemLabel = "item",
    renderItem,
    newItemValue = {},
    disabled = false,
    children,
}) => {
    const [drawerForm] = Form.useForm();
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(null);
    const [initialValue, setInitialValue] = useState({});
    const items = Array.isArray(value) ? value : [];
    const editing = activeIndex !== null;

    useEffect(() => {
        if (!open) return;
        drawerForm.resetFields();
        drawerForm.setFieldsValue(initialValue);
    }, [drawerForm, initialValue, open]);

    const openNew = () => {
        setActiveIndex(null);
        setInitialValue({ ...newItemValue });
        setOpen(true);
    };

    const openItem = (index) => {
        setActiveIndex(index);
        setInitialValue({ ...items[index] });
        setOpen(true);
    };

    const close = () => setOpen(false);

    const save = (formValue) => {
        const nextItem = { ...initialValue, ...formValue };
        const nextItems = [...items];
        if (editing) {
            nextItems[activeIndex] = nextItem;
        } else {
            nextItems.push(nextItem);
        }
        onChange?.(nextItems);
        setOpen(false);
    };

    const remove = (index) => {
        onChange?.(items.filter((_, itemIndex) => itemIndex !== index));
    };

    const action = disabled ? "View" : editing ? "Edit" : "Add";

    return (
        <div className={style.Field}>
            <div className={style.Header}>
                <span className={style.Label}>{label}</span>
                {!disabled && (
                    <Button size="small" icon={<PlusOutlined />} onClick={openNew}>
                        {addLabel}
                    </Button>
                )}
            </div>
            <div className={`${style.List} ${disabled ? style.ListDisabled : ""}`} role="list">
                {items.length ? items.map((item, index) => (
                    <div
                        className={style.Item}
                        role="listitem"
                        key={item.id == null ? `new-${index}` : `id-${item.id}`}
                    >
                        <button className={style.ItemButton} type="button" onClick={() => openItem(index)}>
                            <span>{renderItem(item)}</span>
                        </button>
                        {!disabled && (
                            <Button
                                className={style.RemoveButton}
                                type="text"
                                size="small"
                                icon={<CloseOutlined />}
                                aria-label={`Remove ${itemLabel}`}
                                onClick={() => remove(index)}
                            />
                        )}
                    </div>
                )) : (
                    <div className={style.Empty}>No entries</div>
                )}
            </div>

            <Drawer
                title={`${action} ${label}`}
                placement="right"
                width="45%"
                open={open}
                onClose={close}
                destroyOnHidden
                footer={(
                    <div className={style.Footer}>
                        <Button onClick={close}>Close</Button>
                        {!disabled && (
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={() => drawerForm.submit()}
                            >
                                Save
                            </Button>
                        )}
                    </div>
                )}
            >
                <Form form={drawerForm} layout="vertical" onFinish={save}>
                    {children}
                </Form>
            </Drawer>
        </div>
    );
};

export default DrawerFormList;
