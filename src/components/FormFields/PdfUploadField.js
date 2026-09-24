import { useEffect, useState } from "react";
import { Button, Form } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginFileEncode from "filepond-plugin-file-encode";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import style from "./PdfUploadField.module.scss";

registerPlugin(FilePondPluginFileEncode, FilePondPluginFileValidateType);

const PdfUploadField = ({
    label,
    fileField,
    nameField,
    sizeField,
    uploadField,
    disabled,
}) => {
    const form = Form.useFormInstance();
    const fileUrl = Form.useWatch(fileField, form);
    const fileName = Form.useWatch(nameField, form);
    const fileSize = Form.useWatch(sizeField, form);
    const [files, setFiles] = useState([]);

    useEffect(() => {
        if (!fileName) {
            setFiles([]);
            return;
        }

        setFiles((current) => {
            if (current.some((item) => item.filename === fileName || item.file?.name === fileName)) {
                return current;
            }

            return [{
                options: {
                    type: "local",
                    file: {
                        name: fileName,
                        size: Number(fileSize) || 0,
                        type: "application/pdf",
                    },
                },
            }];
        });
    }, [fileName, fileSize]);

    const addFile = (error, item) => {
        if (error || item.origin === 3) return;

        form.setFieldsValue({
            [fileField]: "",
            [nameField]: item.filename,
            [sizeField]: item.fileSize,
            [uploadField]: item.getFileEncodeBase64String(),
        });
    };

    const removeFile = () => {
        form.setFieldsValue({
            [fileField]: "",
            [nameField]: "",
            [sizeField]: "",
            [uploadField]: "",
        });
        setFiles([]);
    };

    return (
        <Form.Item label={label}>
            <Form.Item name={fileField} hidden><input /></Form.Item>
            <Form.Item name={nameField} hidden><input /></Form.Item>
            <Form.Item name={sizeField} hidden><input /></Form.Item>
            <Form.Item name={uploadField} hidden><input /></Form.Item>
            {disabled ? (
                fileUrl ? (
                    <Button
                        type="link"
                        icon={<DownloadOutlined />}
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {fileName || "Download PDF"}
                    </Button>
                ) : "No file"
            ) : (
                <div className={style.Uploader}>
                    <FilePond
                        files={files}
                        allowMultiple={false}
                        maxFiles={1}
                        allowFileEncode
                        acceptedFileTypes={["application/pdf"]}
                        credits={false}
                        labelIdle='Drag & Drop your PDF or <span class="filepond--label-action">Browse</span>'
                        onupdatefiles={setFiles}
                        onaddfile={addFile}
                        onremovefile={removeFile}
                    />
                </div>
            )}
        </Form.Item>
    );
};

export default PdfUploadField;
