// AUTO-GENERATED FILE. DO NOT EDIT.
// This file will be replaced when you run `moose db pull`.

import { IngestPipeline, OlapTable, Key, ClickHouseInt, ClickHouseDecimal, ClickHousePrecision, ClickHouseByteSize, ClickHouseNamedTuple, ClickHouseEngines, ClickHouseDefault, WithDefault, LifeCycle } from "@514labs/moose-lib";
import typia from "typia";

export interface _peerdb_raw_mirror_a4be3c5e__1df3__45e4__805b__cb363b330b4e {
    _peerdb_uid: string & typia.tags.Format<"uuid">;
    _peerdb_timestamp: number & ClickHouseInt<"int64">;
    _peerdb_destination_table_name: string;
    _peerdb_data: string;
    _peerdb_record_type: number & ClickHouseInt<"int32">;
    _peerdb_match_data: string;
    _peerdb_batch_id: number & ClickHouseInt<"int64">;
    _peerdb_unchanged_toast_columns: string;
}

export interface bar {
    id: Key<string & typia.tags.Format<"uuid">>;
    foo_id: string & typia.tags.Format<"uuid">;
    value: number & ClickHouseInt<"int32">;
    label: string | undefined;
    notes: string | undefined;
    is_enabled: boolean;
    created_at: string & typia.tags.Format<"date-time"> & ClickHousePrecision<6>;
    updated_at: string & typia.tags.Format<"date-time"> & ClickHousePrecision<6>;
    _peerdb_synced_at: string & typia.tags.Format<"date-time"> & ClickHousePrecision<9> & ClickHouseDefault<"now64()">;
    _peerdb_is_deleted: number & ClickHouseInt<"int8">;
    _peerdb_version: number & ClickHouseInt<"int64">;
}

export interface foo {
    id: Key<string & typia.tags.Format<"uuid">>;
    name: string;
    description: string | undefined;
    status: string;
    priority: number & ClickHouseInt<"int32">;
    is_active: boolean;
    metadata: string | undefined;
    tags: string[];
    score: string & ClickHouseDecimal<10, 2> | undefined;
    large_text: string | undefined;
    created_at: string & typia.tags.Format<"date-time"> & ClickHousePrecision<6>;
    updated_at: string & typia.tags.Format<"date-time"> & ClickHousePrecision<6>;
    _peerdb_synced_at: string & typia.tags.Format<"date-time"> & ClickHousePrecision<9> & ClickHouseDefault<"now64()">;
    _peerdb_is_deleted: number & ClickHouseInt<"int8">;
    _peerdb_version: number & ClickHouseInt<"int64">;
}

export interface users {
    id: Key<string & typia.tags.Format<"uuid">>;
    role: string;
    created_at: string & typia.tags.Format<"date-time"> & ClickHousePrecision<6>;
    updated_at: string & typia.tags.Format<"date-time"> & ClickHousePrecision<6>;
    _peerdb_synced_at: string & typia.tags.Format<"date-time"> & ClickHousePrecision<9> & ClickHouseDefault<"now64()">;
    _peerdb_is_deleted: number & ClickHouseInt<"int8">;
    _peerdb_version: number & ClickHouseInt<"int64">;
}

export const PeerdbRawMirrorA4Be3C5E1Df345E4805BCb363B330B4ETable = new OlapTable<_peerdb_raw_mirror_a4be3c5e__1df3__45e4__805b__cb363b330b4e>("_peerdb_raw_mirror_a4be3c5e__1df3__45e4__805b__cb363b330b4e", {
    orderByFields: ["_peerdb_batch_id", "_peerdb_destination_table_name"],
    settings: { index_granularity: "8192" },
    lifeCycle: LifeCycle.EXTERNALLY_MANAGED,
});

export const BarTable = new OlapTable<bar>("bar", {
    orderByFields: ["id"],
    engine: ClickHouseEngines.ReplacingMergeTree,
    ver: "_peerdb_version",
    settings: { index_granularity: "8192" },
    lifeCycle: LifeCycle.EXTERNALLY_MANAGED,
});

export const FooTable = new OlapTable<foo>("foo", {
    orderByFields: ["id"],
    engine: ClickHouseEngines.ReplacingMergeTree,
    ver: "_peerdb_version",
    settings: { index_granularity: "8192" },
    lifeCycle: LifeCycle.EXTERNALLY_MANAGED,
});

export const UsersTable = new OlapTable<users>("users", {
    orderByFields: ["id"],
    engine: ClickHouseEngines.ReplacingMergeTree,
    ver: "_peerdb_version",
    settings: { index_granularity: "8192" },
    lifeCycle: LifeCycle.EXTERNALLY_MANAGED,
});


