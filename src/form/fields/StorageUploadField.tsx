import * as React from "react";
import { useEffect } from "react";

import {
    Box,
    FormControl,
    FormHelperText,
    IconButton,
    LinearProgress,
    makeStyles,
    Paper,
    Typography
} from "@material-ui/core";

import firebase from "firebase/app";
import "firebase/storage";

import {
    ArrayProperty,
    FieldProps,
    getDownloadURL,
    Property,
    StorageMeta,
    StringProperty,
    uploadFile
} from "../../models";
import { useDropzone } from "react-dropzone";
import ClearIcon from "@material-ui/icons/Clear";
import { PreviewComponent, PreviewSize } from "../../preview";
import deepEqual from "deep-equal";
import { FieldDescription } from "../../form/components";
import LabelWithIcon from "../components/LabelWithIcon";
import { useSnackbarController } from "../../contexts";
import ErrorBoundary from "../../core/internal/ErrorBoundary";

import clsx from "clsx";
import { DropTargetMonitor, useDrag, useDrop, XYCoord } from "react-dnd";
import { useClearRestoreValue } from "../../hooks";
import { isReadOnly } from "../../models/utils";

export const useStyles = makeStyles(theme => ({
    dropZone: {
        position: "relative",
        paddingTop: "2px",
        minHeight: "254px",
        outline: 0,
        borderTopLeftRadius: "2px",
        borderTopRightRadius: "2px",
        backgroundColor: "rgba(0, 0, 0, 0.09)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.42)",
        boxSizing: "border-box",
        transition: "border-bottom-color 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
        "&:focus": {
            borderBottom: `2px solid ${theme.palette.primary.dark}`
        }
    },
    disabled: {
        backgroundColor: "rgba(0, 0, 0, 0.12)",
        color: "rgba(0, 0, 0, 0.38)",
        borderBottom: `1px dotted ${theme.palette.grey[400]}`
    },
    nonActiveDrop: {
        "&:hover": {
            backgroundColor: "#dedede"
        }
    },
    activeDrop: {
        paddingTop: "0px",
        boxSizing: "border-box",
        border: "2px solid"
    },
    acceptDrop: {
        transition: "background-color 200ms cubic-bezier(0.0, 0, 0.2, 1) 0ms",
        background: "repeating-linear-gradient( 45deg, rgba(0, 0, 0, 0.09), rgba(0, 0, 0, 0.09) 10px, rgba(0, 0, 0, 0.12) 10px, rgba(0, 0, 0, 0.12) 20px) !important",
        border: "2px solid",
        borderColor: theme.palette.success.main
    },
    rejectDrop: {
        border: "2px solid",
        borderColor: theme.palette.error.main
    },
    uploadItem: {
        padding: theme.spacing(1),
        minWidth: 220,
        minHeight: 220
    },
    uploadItemSmall: {
        padding: theme.spacing(1),
        minWidth: 118,
        minHeight: 118,
        boxSizing: "border-box"
    },
    arrayEntry: {
        border: "1px dashed transparent",
        borderRadius: "4px"
    },
    arrayEntryHovered: {
        opacity: 0.5,
        border: "1px dashed gray",
        boxSizing: "border-box"
    },
    arrayEntryDragging: {
        cursor: "move"
    }
}));

type StorageUploadFieldProps = FieldProps<string | string[]>;

/**
 * Field that allows to upload files to Google Cloud Storage.
 *
 * This is one of the internal components that get mapped natively inside forms
 * and tables to the specified properties.
 * @category Form fields
 */
export default function StorageUploadField({
                                               name,
                                               value,
                                               setValue,
                                               error,
                                               showError,
                                               autoFocus,
                                               tableMode,
                                               property,
                                               includeDescription,
                                               context,
                                               isSubmitting
                                           }: StorageUploadFieldProps) {

    const multipleFilesSupported = property.dataType === "array";
    const disabled = isReadOnly(property) || !!property.disabled || isSubmitting;

    const internalValue = multipleFilesSupported ?
        (Array.isArray(value) ? value : []) :
        value;

    useClearRestoreValue<string | string[]>({
        property,
        value,
        setValue
    });

    const storageMeta: StorageMeta | undefined = property.dataType === "string" ? property.config?.storageMeta :
        property.dataType === "array" &&
        (property.of as Property).dataType === "string" ? (property.of as StringProperty).config?.storageMeta :
            undefined;

    if (!storageMeta)
        throw Error("Storage meta must be specified");

    const fileNameBuilder = (file: File) => {
        if (storageMeta.fileName) {
            const fileName = storageMeta.fileName({
                entityId: context.entityId,
                entityValues: context.values,
                property,
                file,
                storageMeta,
                name
            });

            if (!fileName || fileName.length === 0) {
                throw Error("You need to return a valid filename");
            }
            return fileName;
        }
        return file.name;
    };

    const storagePathBuilder = (file: File) => {
        if (typeof storageMeta.storagePath === "string")
            return storageMeta.storagePath;

        if (typeof storageMeta.storagePath === "function") {
            const storagePath = storageMeta.storagePath({
                entityId: context.entityId,
                entityValues: context.values,
                property,
                file,
                storageMeta,
                name
            });

            if (!storagePath || storagePath.length === 0) {
                throw Error("You need to return a valid filename");
            }
            return storagePath;
        }
        console.warn("When using a storage property, if you don't specify the storagePath, the root storage is used");
        return "/";
    };

    return (

        <FormControl fullWidth
                     required={property.validation?.required}
                     error={showError}>

            {!tableMode &&
            <FormHelperText filled
                            required={property.validation?.required}>
                <LabelWithIcon scaledIcon={true} property={property}/>
            </FormHelperText>}

            <StorageUpload
                value={internalValue}
                name={name}
                disabled={disabled}
                autoFocus={autoFocus}
                property={property}
                onChange={(newValue) => {
                    setValue(
                        newValue
                    );
                }}
                fileNameBuilder={fileNameBuilder}
                storagePathBuilder={storagePathBuilder}
                storageMeta={storageMeta}
                multipleFilesSupported={multipleFilesSupported}
                small={false}/>

            {includeDescription &&
            <FieldDescription property={property as any}/>}

            {showError && <FormHelperText
                id="component-error-text">{error}</FormHelperText>}

        </FormControl>
    );
}

/**
 * Internal representation of an item in the storage
 * It can have two states, having a storagePathOrDownloadUrl set,
 * which means the file has
 * been uploaded and it is rendered as a preview
 * Or have a pending file being uploaded.
 */
interface StorageFieldItem {
    id: number; // generated on the fly for internal use only
    storagePathOrDownloadUrl?: string;
    file?: File;
    fileName?: string;
    metadata?: firebase.storage.UploadMetadata,
    size: PreviewSize
}

interface StorageUploadProps {
    value: string | string[];
    name: string;
    property: StringProperty | ArrayProperty<string[]>;
    onChange: (value: string | string[] | null) => void;
    multipleFilesSupported: boolean;
    autoFocus: boolean;
    disabled: boolean;
    small: boolean;
    storageMeta: StorageMeta;
    fileNameBuilder: (file: File) => string;
    storagePathBuilder: (file: File) => string;
}

export function StorageUpload({
                                  property,
                                  name,
                                  value,
                                  onChange,
                                  multipleFilesSupported,
                                  small,
                                  disabled,
                                  autoFocus,
                                  storageMeta,
                                  fileNameBuilder,
                                  storagePathBuilder
                              }: StorageUploadProps) {

    if (multipleFilesSupported) {
        const arrayProperty = property as ArrayProperty<string[]>;
        if (arrayProperty.of) {
            if (arrayProperty.of.dataType !== "string") {
                throw Error("Storage field using array must be of data type string");
            }
        } else {
            throw Error("Storage field using array must be of data type string");
        }
    }

    const metadata: firebase.storage.UploadMetadata | undefined = storageMeta?.metadata;

    const classes = useStyles();

    const size = multipleFilesSupported ? "small" : "regular";

    const internalInitialValue: StorageFieldItem[] =
        (multipleFilesSupported ?
            value as string[]
            : [value as string]).map(entry => (
            {
                id: getRandomId(),
                storagePathOrDownloadUrl: entry,
                metadata: metadata,
                size: size
            }
        ));

    const [initialValue, setInitialValue] = React.useState<string | string[]>(value);
    const [internalValue, setInternalValue] = React.useState<StorageFieldItem[]>(internalInitialValue);
    const [hoveredIndex, setHoveredIndex] = React.useState<number | undefined>(undefined);

    if (!deepEqual(initialValue, value)) {
        setInitialValue(value);
        setInternalValue(internalInitialValue);
    }

    function getRandomId() {
        return Math.floor(Math.random() * Math.floor(Number.MAX_SAFE_INTEGER));
    }

    const moveItem = (fromIndex: number, toIndex: number) => {
        const newValue = [...internalValue];
        const item = newValue[fromIndex];
        newValue.splice(fromIndex, 1);
        newValue.splice(toIndex, 0, item);
        setInternalValue(newValue);
        const fieldValue = newValue
            .filter(e => !!e.storagePathOrDownloadUrl)
            .map(e => e.storagePathOrDownloadUrl as string);
        onChange(fieldValue);
    };

    function removeDuplicates(items: StorageFieldItem[]) {
        return items.filter(
            (v, i) => {
                return ((items.map((v) => v.storagePathOrDownloadUrl).indexOf(v.storagePathOrDownloadUrl) === i) || !v.storagePathOrDownloadUrl)
                    && ((items.map((v) => v.file).indexOf(v.file) === i) || !v.file);
            }
        );
    }

    const onExternalDrop = (acceptedFiles: File[]) => {

        if (!acceptedFiles.length || disabled)
            return;

        let newInternalValue: StorageFieldItem[];
        if (multipleFilesSupported) {
            newInternalValue = [...internalValue,
                ...(acceptedFiles.map(file => ({
                    id: getRandomId(),
                    file,
                    fileName: fileNameBuilder(file),
                    metadata,
                    size: size
                } as StorageFieldItem)))];
        } else {
            newInternalValue = [{
                id: getRandomId(),
                file: acceptedFiles[0],
                fileName: fileNameBuilder(acceptedFiles[0]),
                metadata,
                size: size
            }];
        }

        // Remove either storage path or file duplicates
        newInternalValue = removeDuplicates(newInternalValue);
        setInternalValue(newInternalValue);
    };

    const onFileUploadComplete = async (uploadedPath: string,
                                        entry: StorageFieldItem,
                                        metadata?: firebase.storage.UploadMetadata) => {

        console.debug("onFileUploadComplete", uploadedPath, entry);

        let uploadPathOrDownloadUrl = uploadedPath;
        if (storageMeta.storeUrl) {
            uploadPathOrDownloadUrl = await getDownloadURL(uploadedPath);
        }
        if (storageMeta.postProcess) {
            uploadPathOrDownloadUrl = await storageMeta.postProcess(uploadPathOrDownloadUrl);
        }

        let newValue: StorageFieldItem[];

        entry.storagePathOrDownloadUrl = uploadPathOrDownloadUrl;
        entry.metadata = metadata;
        newValue = [...internalValue];

        newValue = removeDuplicates(newValue);
        setInternalValue(newValue);

        const fieldValue = newValue
            .filter(e => !!e.storagePathOrDownloadUrl)
            .map(e => e.storagePathOrDownloadUrl as string);

        if (multipleFilesSupported) {
            onChange(fieldValue);
        } else {
            onChange(fieldValue ? fieldValue[0] : null);
        }
    };

    const onClear = (clearedStoragePathOrDownloadUrl: string) => {
        if (multipleFilesSupported) {
            const newValue: StorageFieldItem[] = internalValue.filter(v => v.storagePathOrDownloadUrl !== clearedStoragePathOrDownloadUrl);
            onChange(newValue.filter(v => !!v.storagePathOrDownloadUrl).map(v => v.storagePathOrDownloadUrl as string));
            setInternalValue(newValue);
        } else {
            onChange(null);
            setInternalValue([]);
        }
    };

    const {
        getRootProps,
        getInputProps,
        isDragActive,
        isDragAccept,
        isDragReject
    } = useDropzone({
            accept: storageMeta.acceptedFiles,
            disabled: disabled,
            onDrop: onExternalDrop
        }
    );

    const { ...rootProps } = getRootProps();

    const helpText = multipleFilesSupported ?
        "Drag 'n' drop some files here, or click to select files" :
        "Drag 'n' drop a file here, or click to select one";

    return (
        <div {...rootProps}
             className={clsx(classes.dropZone, {
                 [classes.nonActiveDrop]: !isDragActive,
                 [classes.activeDrop]: isDragActive,
                 [classes.rejectDrop]: isDragReject,
                 [classes.acceptDrop]: isDragAccept,
                 [classes.disabled]: disabled
             })}
        >

            <input autoFocus={autoFocus} {...getInputProps()} />

            <Box display="flex"
                 flexDirection="row"
                 flexWrap="wrap"
                 alignItems="center"
                 justifyContent="center"
                 minHeight={250}>

                {internalValue.map((entry, index) => {
                    let child;
                    if (entry.storagePathOrDownloadUrl) {
                        const renderProperty = multipleFilesSupported
                            ? (property as ArrayProperty<string[]>).of as StringProperty
                            : property as StringProperty;
                        child = (
                            <StorageItemPreview
                                name={`storage_preview_${entry.storagePathOrDownloadUrl}`}
                                property={renderProperty}
                                disabled={disabled}
                                value={entry.storagePathOrDownloadUrl}
                                onClear={onClear}
                                size={entry.size}/>
                        );
                    } else if (entry.file) {
                        child = (
                            <StorageUploadProgress
                                entry={entry}
                                metadata={metadata}
                                storagePath={storagePathBuilder(entry.file)}
                                onFileUploadComplete={onFileUploadComplete}
                                size={size}
                            />
                        );
                    }

                    return (
                        <StorageEntry
                            key={`storage_entry_${name}_${index}`}
                            entry={entry}
                            index={index}
                            dragType={"storage_card_" + name}
                            moveItem={moveItem}
                            onHover={setHoveredIndex}
                            hovered={hoveredIndex === index}>
                            {child}
                        </StorageEntry>
                    );
                })
                }

                <Box
                    flexGrow={1}
                    m={2}
                    maxWidth={small ? 100 : 200}>
                    <Typography color={"textSecondary"}
                                variant={"body2"}
                                align={"center"}>
                        {helpText}
                    </Typography>
                </Box>

            </Box>

        </div>
    );

}

export function StorageEntry({
                                 children,
                                 entry,
                                 index,
                                 moveItem,
                                 dragType,
                                 hovered,
                                 onHover
                             }: {
    entry: StorageFieldItem,
    children: React.ReactNode;
    index: number,
    dragType: string,
    moveItem: (dragIndex: number, hoverIndex: number) => void,
    hovered: boolean;
    onHover: (index?: number) => void;
}) {

    const classes = useStyles();
    const ref = React.useRef<HTMLDivElement>(null);

    const [, drop] = useDrop({
        accept: dragType,
        hover(item: {
                  id: number
                  index: number,
                  type: string
              },
              monitor: DropTargetMonitor) {

            if (!ref.current) {
                return;
            }
            const dragIndex = item.index;
            const hoverIndex = index;

            // Don't replace items with themselves
            if (dragIndex === hoverIndex) {
                return;
            }

            if (!ref.current) {
                onHover(undefined);
                return;
            }

            const hoverBoundingRect = ref.current.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;

            // Determine mouse position
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;
            const hoverClientX = (clientOffset as XYCoord).x - hoverBoundingRect.left;

            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY - 50 && hoverClientX < hoverMiddleX - 50) {
                onHover(undefined);
                return;
            }

            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY + 50 && hoverClientX > hoverMiddleX - 50) {
                onHover(undefined);
                return;
            }

            onHover(hoverIndex);

            // Time to actually perform the action
            moveItem(dragIndex, hoverIndex);

            // Note: we're mutating the monitor item here!
            // Generally it's better to avoid mutations,
            // but it's good here for the sake of performance
            // to avoid expensive index searches.
            item.index = hoverIndex;
        },
        drop() {
            onHover(undefined);
        }
    });

    const [{ isDragging }, drag, preview] = useDrag({
        type: dragType,
        item: { id: entry.id, index },
        collect: (monitor: any) => ({
            isDragging: monitor.isDragging()
        })
    });

    drag(drop(ref));

    return <div ref={ref}
                className={clsx({
                    [classes.arrayEntryDragging]: isDragging,
                    [classes.arrayEntryHovered]: hovered,
                    [classes.arrayEntry]: !hovered
                })}>
        {children}
    </div>;

}


interface StorageUploadItemProps {
    storagePath: string;
    metadata?: firebase.storage.UploadMetadata,
    entry: StorageFieldItem,
    onFileUploadComplete: (value: string,
                           entry: StorageFieldItem,
                           metadata?: firebase.storage.UploadMetadata) => Promise<void>;
    size: PreviewSize;
}

export function StorageUploadProgress({
                                          storagePath,
                                          entry,
                                          metadata,
                                          onFileUploadComplete,
                                          size
                                      }: StorageUploadItemProps) {

    const classes = useStyles();
    const snackbarContext = useSnackbarController();

    const [error, setError] = React.useState<string>();
    const [progress, setProgress] = React.useState<number>(-1);

    useEffect(() => {
        if (entry.file)
            upload(entry.file, entry.fileName);
    }, []);

    function upload(file: File, fileName?: string) {

        setError(undefined);
        setProgress(0);

        const uploadTask = uploadFile(file, fileName, storagePath, metadata);
        uploadTask.on("state_changed", (snapshot) => {
            const currentProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setProgress(currentProgress);
            console.debug("Upload is " + currentProgress + "% done");
            switch (snapshot.state) {
                case firebase.storage.TaskState.PAUSED: // or 'paused'
                    console.debug("Upload is paused");
                    break;
                case firebase.storage.TaskState.RUNNING: // or 'running'
                    console.debug("Upload is running");
                    break;
            }
        }, (e: any) => {
            console.error("Upload error", e);
            setError(e.message);
            setProgress(-1);
            snackbarContext.open({
                type: "error",
                title: "Error uploading file",
                message: e.message
            });
        }, async () => {
            const fullPath = uploadTask.snapshot.ref.fullPath;
            await onFileUploadComplete(fullPath, entry, metadata);
            setProgress(-1);
        });
    }

    return (

        <Box m={1}>
            <Paper elevation={0}
                   className={size === "regular" ? classes.uploadItem : classes.uploadItemSmall}
                   variant={"outlined"}>

                {progress > -1 &&
                <LinearProgress variant="indeterminate"
                                value={progress}/>}

                {error && <p>Error uploading file: {error}</p>}

            </Paper>
        </Box>

    );

}

interface StorageItemPreviewProps {
    name: string;
    property: StringProperty;
    value: string,
    onClear: (value: string) => void;
    size: PreviewSize;
    disabled: boolean;
}

export function StorageItemPreview({
                                       name,
                                       property,
                                       value,
                                       onClear,
                                       disabled,
                                       size
                                   }: StorageItemPreviewProps) {

    const classes = useStyles();
    return (
        <Box m={1} position={"relative"}>

            <Paper
                elevation={0}
                className={size === "regular" ? classes.uploadItem : classes.uploadItemSmall}
                variant={"outlined"}>

                {!disabled && <Box position={"absolute"}
                                   top={-8}
                                   right={-8}
                                   style={{ zIndex: 100 }}>
                    <IconButton
                        size={"small"}
                        style={{ backgroundColor: "white" }}
                        onClick={(event) => {
                            event.stopPropagation();
                            onClear(value);
                        }}>
                        <ClearIcon fontSize={"small"}/>
                    </IconButton>
                </Box>}

                {value &&
                <ErrorBoundary>
                    <PreviewComponent name={name}
                                      value={value}
                                      property={property}
                                      size={size}/>
                </ErrorBoundary>
                }

            </Paper>

        </Box>
    );

}
