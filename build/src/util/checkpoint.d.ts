export declare enum CheckpointType {
    Success = "success",
    Failure = "failure"
}
export declare type Checkpoint = (msg: string, type: CheckpointType) => void;
export declare const checkpoint: Checkpoint;
