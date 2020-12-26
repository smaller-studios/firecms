import { Entity, EntityCollectionView, EntitySchema } from "../models";
import {
    Box,
    Button,
    createStyles,
    Dialog,
    DialogActions,
    makeStyles
} from "@material-ui/core";
import React from "react";

import { FormFieldBuilder } from "../form";
import { CollectionTableProps } from "../collection/CollectionTableProps";


export const useStyles = makeStyles(theme => createStyles({
    dialogBody: {
        flexGrow: 1,
        overflow: "auto",
        minWidth: "85vw"
    }
}));


export interface ReferenceDialogProps<S extends EntitySchema<Key>, Key extends string = string> {

    open: boolean;

    collectionPath: string;

    collectionView: EntityCollectionView<S>;

    onEntityClick(entity?: Entity<S>): void;

    onClose(): void;

    createFormField: FormFieldBuilder,

    CollectionTable: React.FunctionComponent<CollectionTableProps<S>>
}


export function ReferenceDialog<S extends EntitySchema>(
    {
        onEntityClick,
        onClose,
        open,
        collectionPath,
        collectionView,
        createFormField,
        CollectionTable
    }: ReferenceDialogProps<S>) {

    const classes = useStyles();
    const schema = collectionView.schema;
    const textSearchDelegate = collectionView.textSearchDelegate;
    const filterableProperties = collectionView.filterableProperties;
    const initialFilter = collectionView.initialFilter;

    return (
        <>

            <Dialog
                onClose={onClose}
                maxWidth={"xl"}
                scroll={"paper"}
                open={open}>
                <Box className={classes.dialogBody}>
                    <CollectionTable collectionPath={collectionPath}
                                     editEnabled={false}
                                     inlineEditing={false}
                                     deleteEnabled={false}
                                     schema={schema}
                                     includeToolbar={true}
                                     onEntityClick={(collectionPath, entity) => onEntityClick(entity)}
                                     paginationEnabled={false}
                                     title={`Select ${schema.name}`}
                                     filterableProperties={filterableProperties}
                                     textSearchDelegate={textSearchDelegate}
                                     initialFilter={initialFilter}
                                     createFormField={createFormField}
                    />
                </Box>
                <DialogActions>
                    <Button onClick={onClose} color="primary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

        </>
    );

}
