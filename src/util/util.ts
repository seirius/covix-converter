import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { CovixConfig } from "src/config/CovixConfig";
import { v4 as uuid } from "uuid";

export const FileStorage = FileInterceptor("file", {
    storage: diskStorage({
        destination: CovixConfig.FILE_PATH,
        filename: (req, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`)
    })
});
