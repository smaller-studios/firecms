import { useEffect, useState } from "react";
import {
    Entity,
    EntitySchema,
    FilterValues,
    listenCollection
} from "../models";

type Order = "asc" | "desc" | undefined;

/**
 * @category Hooks and utilities
 */
export interface CollectionFetchProps<M extends { [Key: string]: any }> {

    /**
     * Absolute collection path
     */
    collectionPath: string;

    /**
     * Schema of the entity displayed by this collection
     */
    schema: EntitySchema<M>;


    itemCount?: number;

    /**
     * List of entities that will be displayed on top, no matter the ordering.
     * This is used for reference fields selection
     */
    entitiesDisplayedFirst?: Entity<M>[];

    filterValues?: FilterValues<M>;

    sortByProperty?: Extract<keyof M, string>;

    currentSort?: Order;
}

/**
 * @category Hooks and utilities
 */
export type CollectionFetchResult<M extends { [Key: string]: any }> = {
    data: Entity<M>[]
    dataLoading: boolean,
    noMoreToLoad: boolean,
    dataLoadingError?: Error
}

/**
 * This hook is used to fetch collections using a given schema
 * @param collectionPath
 * @param schema
 * @param filter
 * @param sortByProperty
 * @param currentSort
 * @param itemCount
 * @param entitiesDisplayedFirst
 * @category Hooks and utilities
 */
export function useCollectionFetch<M extends { [Key: string]: any }>(
    {
        collectionPath,
        schema,
        filterValues,
        sortByProperty,
        currentSort,
        itemCount,
        entitiesDisplayedFirst
    }: CollectionFetchProps<M>): CollectionFetchResult<M> {

    const initialEntities = entitiesDisplayedFirst ? entitiesDisplayedFirst.filter(e => !!e.values) : [];
    const [data, setData] = useState<Entity<M>[]>(initialEntities);

    const [dataLoading, setDataLoading] = useState<boolean>(false);
    const [dataLoadingError, setDataLoadingError] = useState<Error | undefined>();
    const [noMoreToLoad, setNoMoreToLoad] = useState<boolean>(false);

    const updateData = (entities: Entity<M>[]) => {
        if (!initialEntities) {
            setData(entities);
        } else {
            const displayedFirstId = new Set(initialEntities.map((e) => e.id));
            setData([...initialEntities, ...entities.filter((e) => !displayedFirstId.has(e.id))]);
        }
    };

    useEffect(() => {

        setDataLoading(true);

        return listenCollection<M>(
            collectionPath,
            schema,
            entities => {
                setDataLoading(false);
                setDataLoadingError(undefined);
                updateData(entities);
                setNoMoreToLoad(!itemCount || entities.length < itemCount);
            },
            (error) => {
                console.error("ERROR", error);
                setDataLoading(false);
                setData([]);
                setDataLoadingError(error);
            },
            filterValues,
            itemCount,
            undefined,
            sortByProperty,
            currentSort);
    }, [collectionPath, schema, itemCount, currentSort, sortByProperty, filterValues]);

    return {
        data,
        dataLoading,
        dataLoadingError,
        noMoreToLoad
    };

}
