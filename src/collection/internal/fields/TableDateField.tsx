import React from "react";
import { useInputStyles } from "./styles";
import { KeyboardDateTimePicker } from "@material-ui/pickers";
import { Box, Typography } from "@material-ui/core";
import { EmptyValue, TimestampPreview } from "../../../preview";
import CalendarTodayIcon from "@material-ui/icons/CalendarToday";
import { TimestampProperty } from "../../../models";

export function TableDateField(props: {
    name: string;
    error: Error | undefined;
    internalValue: Date | undefined | null;
    updateValue: (newValue: (Date | null)) => void;
    focused: boolean;
    disabled: boolean;
    property: TimestampProperty;
    onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
    setPreventOutsideClick: (value: any) => void;
}) {

    const {
        disabled,
        error,
        internalValue,
        setPreventOutsideClick,
        updateValue,
        property
    } = props;

    const handleOpen = () => {
        setPreventOutsideClick(true);
    };

    const handleClose = () => {
        setPreventOutsideClick(false);
    };

    const classes = useInputStyles();

    return (
        <Box display={"flex"} alignItems={"center"}>

            <Box flexGrow={1}>
                {internalValue &&
                <Typography variant={"body2"}>
                    <TimestampPreview value={internalValue} property={property}
                                      size={"regular"}/>
                </Typography>}
                {!internalValue && <EmptyValue/>}
            </Box>

            <Box width={40}>
                <KeyboardDateTimePicker
                    clearable
                    disabled={disabled}
                    inputVariant="standard"
                    InputProps={{
                        disableUnderline: true,
                        classes: {
                            input: classes.hidden
                        }
                    }}
                    keyboardIcon={<CalendarTodayIcon fontSize={"small"}/>}
                    KeyboardButtonProps={{
                        size: "small"
                    }}
                    inputProps={{
                        style: {
                            height: "100%"
                        }
                    }}
                    InputAdornmentProps={{
                        style: {
                            height: 26
                        }
                    }}
                    onOpen={handleOpen}
                    onClose={handleClose}
                    value={internalValue ?? null}
                    error={!!error}
                    onChange={(dateValue: Date | null) => {
                        updateValue(dateValue);
                    }}
                />
            </Box>
        </Box>
    );
}
