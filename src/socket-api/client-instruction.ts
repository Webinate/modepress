'use strict';

import { ClientConnection } from './client-connection';

/**
 * An instruction that is generated by the server and sent to relevant clients.
 */
export class ClientInstruction<T extends Modepress.SocketTokens.IToken> {
    /**
     * Specify a username that if set, will only send this instruction to authorized clients
     * and/or the spefic user who may be connected
     */
    username: string | null;

    /**
     * An array of clients to send the instruction to. If null, then all clients will be considered
     */
    recipients: ClientConnection[] | null;

    /**
     * The event sent from the client
     */
    token: T;

    constructor( event: T, client: ClientConnection[] | null = null, username: string | null = null ) {
        this.recipients = client;
        this.token = event;
        this.username = username;
    }
}