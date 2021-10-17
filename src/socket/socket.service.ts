import { Injectable } from "@nestjs/common";
import { connect } from "socket.io-client";
import { CovixConfig } from "src/config/CovixConfig";
import { Logger } from "@nestjs/common";

@Injectable()
export class SocketService {

    private readonly LOGGER = new Logger(SocketService.name);

    public socket: SocketIOClient.Socket;

    public connected = false;

    constructor() {
        this.socket = connect(CovixConfig.SOCKET_PATH, {
            query: `id=${CovixConfig.CONVERTER_ID}&priority=${CovixConfig.PRIORITY}&host=${CovixConfig.HOST}:${CovixConfig.PORT}`
        });
        this.socket.on("connect", () => {
            this.connected = true;
            this.LOGGER.log("Connected to covix");
        });
        this.socket.on("disconnect", () => {
            this.connected = false;
            this.LOGGER.log("Disconnected from covix");
        });
    }

    public emit(event: string, args: Record<string, any>): void {
        if (this.connected) {
            this.socket.emit(event, args);
        }
    }

}