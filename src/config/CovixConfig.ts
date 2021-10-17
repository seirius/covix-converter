import * as env from "env-var";
import { config as envConfig } from "dotenv";
import { join } from "path";
envConfig();

export class CovixConfig {

    public static readonly CONVERTER_ID: string = env
        .get("CONVERTER_ID")
        .required()
        .asString();

    public static readonly HOST: string = env
        .get("CONVERTER_HOST")
        .required()
        .asString();

    public static readonly PORT: number = env
        .get("CONVERTER_PORT")
        .default(3001)
        .asPortNumber();

    public static readonly FILE_PATH: string = env
        .get("CONVERTER_FILE_PATH")
        .default(join(__dirname, "..", "..", "covix-files"))
        .asString();

    public static readonly SOCKET_PATH: string = env
        .get("COVIX_SOCKET_PATH")
        .default("http://localhost:8081")
        .asString();

    public static readonly PRIORITY: number = env
        .get("CONVERTER_PRIORITY")
        .default(5)
        .asIntPositive();
        
}