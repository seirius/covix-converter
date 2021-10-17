import { Module } from "@nestjs/common";
import { SocketModule } from "src/socket/socket.module";
import { ConverterController } from "./converter.controller";
import { ConverterService } from "./converter.service";

@Module({
    imports: [SocketModule],
    controllers: [
        ConverterController
    ],
    providers: [
        ConverterService
    ]
})
export class ConverterModule {}
