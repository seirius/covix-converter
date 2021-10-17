import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConverterModule } from './converter/converter.module';
import { SocketModule } from './socket/socket.module';

@Module({
    imports: [
        SocketModule,
        ConverterModule
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }
