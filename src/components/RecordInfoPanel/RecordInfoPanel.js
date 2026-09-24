import { Button, Col, Form, Input, Row, Tag, Typography } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import style from "./RecordInfoPanel.module.scss";

const websitePatterns = {
    agency: process.env.REACT_APP_WEBSITE_AGENCY,
    country: process.env.REACT_APP_WEBSITE_COUNTRY,
    institution: process.env.REACT_APP_WEBSITE_INSTITUTION,
    report: process.env.REACT_APP_WEBSITE_REPORT,
};

const flagColors = {
    none: "green",
    "low level": "gold",
    "high level": "red",
};

const formatDate = (value) => (
    value && dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "Unknown"
);

const displayUser = (value) => {
    if (!value) return "Unknown";
    if (typeof value !== "object") return value;
    return value.username || value.email || value.name || value.id || "Unknown";
};

const RecordInfoPanel = ({ record, entityType, disabled, onRemoveFlag }) => {
    const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1);
    const pattern = websitePatterns[entityType];
    const publicUrl = pattern && record?.id ? pattern.replace("{id}", record.id) : null;
    const flags = Array.isArray(record?.flags) ? record.flags.filter((flag) => flag.active) : [];
    const updateLog = Array.isArray(record?.update_log) ? record.update_log : [];

    return (
        <div className={style.Panel}>
            <Row gutter={[32, 20]}>
                <Col xs={24} md={12}>
                    <section className={style.Section}>
                        <Typography.Text strong>View public record on eqar.eu</Typography.Text>
                        <div className={style.List}>
                            <div className={style.ListItem}>
                                {publicUrl ? (
                                    <a className={style.PublicLink} href={publicUrl} target="_blank" rel="noreferrer">
                                        {publicUrl}
                                    </a>
                                ) : (
                                    <Typography.Text type="secondary">Public URL is not configured</Typography.Text>
                                )}
                            </div>
                        </div>
                    </section>
                    <section className={style.Section}>
                        <Typography.Text strong>Current flags</Typography.Text>
                        <div className={style.List}>
                            {flags.length ? flags.map((flag, index) => (
                                <div className={style.FlagItem} key={flag.id ?? index}>
                                    <Tag className={style.Flag} color={flagColors[flag.flag] || "default"}>
                                        {flag.flag}
                                    </Tag>
                                    <span className={style.FlagMessage}>{flag.flag_message}</span>
                                    {onRemoveFlag && (
                                        <Button
                                            className={style.FlagRemove}
                                            type="text"
                                            danger
                                            size="small"
                                            icon={<CloseOutlined />}
                                            aria-label={`Remove ${flag.flag} flag`}
                                            onClick={() => onRemoveFlag(flag.id)}
                                        />
                                    )}
                                </div>
                            )) : (
                                <div className={style.FlagItem}>
                                    <Tag className={style.Flag} color={flagColors.none}>none</Tag>
                                    <span className={style.FlagMessage}>{entityLabel} has no flag assigned</span>
                                </div>
                            )}
                        </div>
                    </section>
                </Col>
                <Col xs={24} md={12}>
                    <section className={style.Section}>
                        <Typography.Text strong>Internal Note</Typography.Text>
                        <Form.Item name="internal_note" className={style.InternalNote}>
                            <Input placeholder="Enter note, if necessary" disabled={disabled} />
                        </Form.Item>
                    </section>
                    <section className={style.Section}>
                        <Typography.Text strong>Record History</Typography.Text>
                        <ol className={style.HistoryList}>
                            <li className={style.HistoryItem}>
                                <div className={style.HistorySummary}>
                                    <span className={style.HistoryAction}>Created</span>
                                    <time dateTime={record?.created_at || undefined}>{formatDate(record?.created_at)}</time>
                                </div>
                                <div className={style.HistoryDetails}>
                                    by <span>{displayUser(record?.created_by)}</span>
                                </div>
                            </li>
                            {updateLog.map((entry, index) => (
                                <li className={style.HistoryItem} key={entry.id ?? `${entry.updated_at}-${index}`}>
                                    <div className={style.HistorySummary}>
                                        <span className={style.HistoryAction}>Updated</span>
                                        <time dateTime={entry.updated_at || undefined}>{formatDate(entry.updated_at)}</time>
                                    </div>
                                    {(entry.updated_by || entry.note) && (
                                        <div className={style.HistoryDetails}>
                                            {entry.updated_by && <>by <span>{displayUser(entry.updated_by)}</span></>}
                                            {entry.note && <span className={style.HistoryNote}>{entry.note}</span>}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </section>
                </Col>
            </Row>
        </div>
    );
};

export default RecordInfoPanel;
