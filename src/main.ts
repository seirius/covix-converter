import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CovixConfig } from './config/CovixConfig';

const LOGGER = new Logger("MAIN");

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    await app.listen(CovixConfig.PORT);
    LOGGER.log(`Converter start on ${CovixConfig.HOST}:${CovixConfig.PORT}`);
}
bootstrap();
