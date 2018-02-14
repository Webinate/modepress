import { ClientConnection } from './client-connection';
/**
 * An instruction that is generated by clients and sent to the server to react to
 */
export declare class ServerInstruction<T> {
    /**
     * The client connection who initiated the request
     */
    from: ClientConnection;
    /**
     * The token sent from the client
     */
    token: T;
    constructor(event: T, from: ClientConnection);
}